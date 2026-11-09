/* The PHP library in C: Polyspec\OrderedJson\Value and ParseError, and the functions parse() and stringify(). A Value
 * holds its source, the tape of its document (shared by the Value of every node) and the index of its record. */
#include "ordered_json_internal.h"
#include "Zend/zend_exceptions.h"
#include "Zend/zend_smart_str.h"
#include "ext/spl/spl_exceptions.h"
#include "ext/standard/php_string.h"

/* The tape of a document, shared by the Values of its nodes. */
typedef struct {
    zend_long *slots;
    size_t count;
    uint32_t references;
} oj_shared;

typedef struct {
    zend_string *source;
    oj_shared *tape;
    size_t index;
    /* The members or items of a container, or the UTF-16 units of a string, once read. */
    zval cache;
    zend_object std;
} oj_value;

static zend_object_handlers oj_handlers;

static inline oj_value *oj_from_object(zend_object *object) {
    return (oj_value *)((char *)object - XtOffsetOf(oj_value, std));
}
#define OJ_THIS oj_from_object(Z_OBJ_P(ZEND_THIS))
/* A Value without a document: Reflection refuses to make the final internal class without its constructor and the class
 * is not serializable, so the factories make every Value; the guard keeps the tape from being read when none was set. */
#define OJ_SELF(v) \
    oj_value *v = OJ_THIS; \
    if (UNEXPECTED(!v->tape)) { \
        oj_throw_kind(oj_usage_error_ce, "direct_construction", "Value holds no document"); \
        RETURN_THROWS(); \
    }

static inline oj_tape oj_view(const oj_value *v) {
    oj_tape t = {v->tape->slots, v->tape->count};
    return t;
}
static inline zend_long oj_meta(const oj_value *v) { return v->tape->slots[v->index]; }

static zend_object *oj_create(zend_class_entry *ce) {
    oj_value *v = zend_object_alloc(sizeof(oj_value), ce);
    zend_object_std_init(&v->std, ce);
    object_properties_init(&v->std, ce);
    v->std.handlers = &oj_handlers;
    ZVAL_UNDEF(&v->cache);
    return &v->std;
}
static void oj_release_tape(oj_shared *tape) {
    if (--tape->references == 0) {
        efree(tape->slots);
        efree(tape);
    }
}
static void oj_free(zend_object *object) {
    oj_value *v = oj_from_object(object);
    if (v->source) zend_string_release(v->source);
    if (v->tape) oj_release_tape(v->tape);
    zval_ptr_dtor(&v->cache);
    zend_object_std_dtor(object);
}
static zend_object *oj_clone(zend_object *object) {
    oj_value *from = oj_from_object(object);
    zend_object *copy = oj_create(object->ce);
    oj_value *v = oj_from_object(copy);
    v->source = zend_string_copy(from->source);
    v->tape = from->tape;
    v->tape->references++;
    v->index = from->index;
    ZVAL_COPY(&v->cache, &from->cache);
    return copy;
}
void oj_init_value_class(void) {
    memcpy(&oj_handlers, &std_object_handlers, sizeof(zend_object_handlers));
    oj_handlers.offset = XtOffsetOf(oj_value, std);
    oj_handlers.free_obj = oj_free;
    oj_handlers.clone_obj = oj_clone;
    oj_value_ce->create_object = oj_create;
    oj_value_ce->ce_flags |= ZEND_ACC_NO_DYNAMIC_PROPERTIES | ZEND_ACC_NOT_SERIALIZABLE;
}

/* A Value of the node at `index` of the tape of `parent`, or of a new tape when `parent` is NULL. */
static void oj_new_node(zval *out, zend_string *source, oj_shared *tape, size_t index) {
    object_init_ex(out, oj_value_ce);
    oj_value *v = oj_from_object(Z_OBJ_P(out));
    v->source = zend_string_copy(source);
    v->tape = tape;
    tape->references++;
    v->index = index;
}
/* A Value of the document `source`, which takes the tape. */
static void oj_new_root(zval *out, zend_string *source, zend_long *slots, size_t count) {
    oj_shared *tape = emalloc(sizeof(oj_shared));
    tape->slots = slots;
    tape->count = count;
    tape->references = 0;
    oj_new_node(out, source, tape, 0);
}
static bool oj_parse_into(zval *out, zend_string *source, zend_long max_depth, bool reject_duplicates) {
    size_t count;
    zend_long *slots = oj_scan(source, max_depth, reject_duplicates, &count);
    if (!slots) return false;
    oj_new_root(out, source, slots, count);
    return true;
}

/* --- ParseError --------------------------------------------------------------------------------------------------- */

/* Fills a ParseError for a message of the list, whose kind is `kind`. */
static void oj_fill_error(zend_object *exception, const char *message, size_t message_length, const char *kind, zend_long offset) {
    zend_string *full = zend_strpprintf(0, "%.*s at byte " ZEND_LONG_FMT, (int)message_length, message, offset);
    zend_update_property_str(zend_ce_exception, exception, "message", sizeof("message") - 1, full);
    zend_string_release(full);
    zend_update_property_string(oj_error_ce, exception, "kind", sizeof("kind") - 1, kind);
    zend_update_property_long(oj_error_ce, exception, "offset", sizeof("offset") - 1, offset);
}
void oj_throw_parse_error(const char *message, size_t offset) {
    zval exception;
    const char *kind = oj_kind(message);
    ZEND_ASSERT(kind != NULL);
    object_init_ex(&exception, oj_error_ce);
    oj_fill_error(Z_OBJ(exception), message, strlen(message), kind, (zend_long)offset);
    zend_throw_exception_object(&exception);
}
ZEND_METHOD(Polyspec_OrderedJson_ParseError, __construct) {
    zend_string *message;
    zend_long offset;
    ZEND_PARSE_PARAMETERS_START(2, 2)
        Z_PARAM_STR(message)
        Z_PARAM_LONG(offset)
    ZEND_PARSE_PARAMETERS_END();
    const char *kind = strlen(ZSTR_VAL(message)) == ZSTR_LEN(message) ? oj_kind(ZSTR_VAL(message)) : NULL;
    if (!kind) {
        zend_string *text = zend_strpprintf(0, "ParseError has no kind for the message \"%s\"", ZSTR_VAL(message));
        oj_throw_kind(oj_usage_error_ce, "direct_construction", ZSTR_VAL(text));
        zend_string_release(text);
        RETURN_THROWS();
    }
    oj_fill_error(Z_OBJ_P(ZEND_THIS), ZSTR_VAL(message), ZSTR_LEN(message), kind, offset);
}

/* --- ArgumentError and UsageError --------------------------------------------------------------------------------- */

/* The argument kinds of each class, as the PHP library declares them. */
static const char *const oj_argument_kinds[] = {"invalid_number_literal", "depth_limit_out_of_range", "invalid_argument_type",
    "invalid_code_unit", "invalid_utf8", NULL};
static const char *const oj_usage_kinds[] = {"wrong_kind", "host_serialization_refused", "direct_construction", NULL};
static bool oj_known_kind(const char *const *kinds, const char *kind, size_t length) {
    if (strlen(kind) != length) return false;
    for (; *kinds; kinds++)
        if (strcmp(*kinds, kind) == 0) return true;
    return false;
}
static void oj_fill_kind(zend_class_entry *ce, zend_object *exception, const char *kind, size_t kind_length, zend_string *message) {
    zend_update_property_str(zend_ce_exception, exception, "message", sizeof("message") - 1, message);
    zend_update_property_stringl(ce, exception, "kind", sizeof("kind") - 1, kind, kind_length);
}
void oj_throw_kind(zend_class_entry *ce, const char *kind, const char *message) {
    zval exception;
    object_init_ex(&exception, ce);
    zend_string *text = zend_string_init(message, strlen(message), 0);
    oj_fill_kind(ce, Z_OBJ(exception), kind, strlen(kind), text);
    zend_string_release(text);
    zend_throw_exception_object(&exception);
}
/* The constructor of ArgumentError or UsageError: a kind outside the list of the class is a direct construction. */
static void oj_construct_kind(INTERNAL_FUNCTION_PARAMETERS, zend_class_entry *ce, const char *const *kinds, const char *name) {
    zend_string *kind, *message;
    ZEND_PARSE_PARAMETERS_START(2, 2)
        Z_PARAM_STR(kind)
        Z_PARAM_STR(message)
    ZEND_PARSE_PARAMETERS_END();
    if (!oj_known_kind(kinds, ZSTR_VAL(kind), ZSTR_LEN(kind))) {
        zend_string *text = zend_strpprintf(0, "%s has no kind \"%s\"", name, ZSTR_VAL(kind));
        oj_throw_kind(oj_usage_error_ce, "direct_construction", ZSTR_VAL(text));
        zend_string_release(text);
        RETURN_THROWS();
    }
    oj_fill_kind(ce, Z_OBJ_P(ZEND_THIS), ZSTR_VAL(kind), ZSTR_LEN(kind), message);
}
ZEND_METHOD(Polyspec_OrderedJson_ArgumentError, __construct) {
    oj_construct_kind(INTERNAL_FUNCTION_PARAM_PASSTHRU, oj_argument_error_ce, oj_argument_kinds, "ArgumentError");
}
ZEND_METHOD(Polyspec_OrderedJson_UsageError, __construct) {
    oj_construct_kind(INTERNAL_FUNCTION_PARAM_PASSTHRU, oj_usage_error_ce, oj_usage_kinds, "UsageError");
}

/* --- Reading ------------------------------------------------------------------------------------------------------ */

static const char *oj_kind_name(zend_long meta) {
    static const char *const names[] = {"", "object", "array", "string", "number", "boolean", "null"};
    return names[meta & OJ_KIND_MASK];
}
ZEND_METHOD(Polyspec_OrderedJson_Value, __construct) {
    ZEND_PARSE_PARAMETERS_NONE();
}
static ZEND_COLD void oj_mismatch(const oj_value *v, const char *expected) {
    zend_string *text = zend_strpprintf(0, "Expected %s, got %s", expected, oj_kind_name(oj_meta(v)));
    oj_throw_kind(oj_usage_error_ce, "wrong_kind", ZSTR_VAL(text));
    zend_string_release(text);
}
/* Whether the value is of the kind; otherwise throws the LogicException of the library. */
static bool oj_require(const oj_value *v, zend_long kind, const char *expected) {
    if ((oj_meta(v) & OJ_KIND_MASK) == kind) return true;
    oj_mismatch(v, expected);
    return false;
}
static inline zend_string *oj_token(const oj_value *v, zend_long start, zend_long end) {
    return zend_string_init(ZSTR_VAL(v->source) + start, (size_t)(end - start), 0);
}
static zend_string *oj_decode(const oj_value *v, zend_long start, zend_long end, bool escaped) {
    if (!escaped) return oj_token(v, start, end);
    zend_string *text = zend_string_alloc((size_t)(end - start), 0);
    ZSTR_LEN(text) = oj_decode_name((const unsigned char *)ZSTR_VAL(v->source), (size_t)start, (size_t)end, (unsigned char *)ZSTR_VAL(text));
    ZSTR_VAL(text)[ZSTR_LEN(text)] = '\0';
    return text;
}
ZEND_METHOD(Polyspec_OrderedJson_Value, kind) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    RETURN_STRING(oj_kind_name(oj_meta(v)));
}
ZEND_METHOD(Polyspec_OrderedJson_Value, raw) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    if (v->index == 0) RETURN_STR_COPY(v->source);
    RETURN_STR(oj_token(v, v->tape->slots[v->index + 1], v->tape->slots[v->index + 2]));
}

/* The members of an object keyed by decoded name in first insertion order, or the items of an array. */
static void oj_hydrate(oj_value *v, zval *out) {
    const zend_long *slots = v->tape->slots;
    zend_long meta = slots[v->index];
    size_t limit = (size_t)(meta >> OJ_LINK_SHIFT);
    array_init(out);
    if ((meta & OJ_KIND_MASK) == OJ_ARRAY) {
        for (size_t i = v->index + 3; i < limit;) {
            zval item;
            oj_new_node(&item, v->source, v->tape, i);
            add_next_index_zval(out, &item);
            zend_long item_meta = slots[i];
            i = (item_meta & OJ_KIND_MASK) <= OJ_ARRAY ? (size_t)(item_meta >> OJ_LINK_SHIFT) : i + 3;
        }
        return;
    }
    for (size_t i = v->index + 3; i < limit;) {
        zend_long key_meta = slots[i], value_meta = slots[i + 3];
        size_t next = (value_meta & OJ_KIND_MASK) <= OJ_ARRAY ? (size_t)(value_meta >> OJ_LINK_SHIFT) : i + 6;
        if (!(key_meta & OJ_SKIP)) {
            zval member;
            zend_string *name = oj_decode(v, slots[i + 1] + 1, slots[i + 2] - 1, key_meta & OJ_ESCAPED);
            oj_new_node(&member, v->source, v->tape, (size_t)(key_meta >> OJ_LINK_SHIFT));
            zend_symtable_update(Z_ARRVAL_P(out), name, &member);
            zend_string_release(name);
        }
        i = next;
    }
}
static zval *oj_children(oj_value *v) {
    if (Z_TYPE(v->cache) == IS_UNDEF) oj_hydrate(v, &v->cache);
    return &v->cache;
}
ZEND_METHOD(Polyspec_OrderedJson_Value, members) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    if (!oj_require(v, OJ_OBJECT, "object")) RETURN_THROWS();
    RETURN_COPY(oj_children(v));
}
ZEND_METHOD(Polyspec_OrderedJson_Value, items) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    if (!oj_require(v, OJ_ARRAY, "array")) RETURN_THROWS();
    RETURN_COPY(oj_children(v));
}

/* Appends the UTF-16 units of the validated contents s[i, end) of a string token. */
static void oj_token_units(zval *units, const unsigned char *s, size_t i, size_t end) {
    while (i < end) {
        uint32_t cp;
        if (s[i] == '\\') {
            unsigned char escape = s[i + 1];
            if (escape == 'u') {
                cp = 0;
                for (int k = 2; k < 6; k++) cp = (cp << 4) | (uint32_t)oj_hex(s[i + k]);
                i += 6;
            } else {
                switch (escape) {
                    case 'b': cp = 8; break;
                    case 'f': cp = 12; break;
                    case 'n': cp = 10; break;
                    case 'r': cp = 13; break;
                    case 't': cp = 9; break;
                    default: cp = escape;
                }
                i += 2;
            }
        } else if (s[i] < 0x80) {
            cp = s[i++];
        } else {
            size_t width = s[i] < 0xe0 ? 2 : (s[i] < 0xf0 ? 3 : 4);
            cp = width == 2 ? s[i] & 31 : (width == 3 ? s[i] & 15 : s[i] & 7);
            for (size_t k = 1; k < width; k++) cp = (cp << 6) | (s[i + k] & 63);
            i += width;
        }
        if (cp > 0xffff) {
            cp -= 0x10000;
            add_next_index_long(units, (zend_long)(0xd800 | (cp >> 10)));
            cp = 0xdc00 | (cp & 1023);
        }
        add_next_index_long(units, (zend_long)cp);
    }
}
ZEND_METHOD(Polyspec_OrderedJson_Value, stringUnits) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    if (!oj_require(v, OJ_STRING, "string")) RETURN_THROWS();
    if (Z_TYPE(v->cache) == IS_UNDEF) {
        array_init(&v->cache);
        oj_token_units(&v->cache, (const unsigned char *)ZSTR_VAL(v->source), (size_t)v->tape->slots[v->index + 1] + 1,
                       (size_t)v->tape->slots[v->index + 2] - 1);
    }
    RETURN_COPY(&v->cache);
}
ZEND_METHOD(Polyspec_OrderedJson_Value, stringValue) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    if (!oj_require(v, OJ_STRING, "string")) RETURN_THROWS();
    RETURN_STR(oj_decode(v, v->tape->slots[v->index + 1] + 1, v->tape->slots[v->index + 2] - 1, oj_meta(v) & OJ_ESCAPED));
}
ZEND_METHOD(Polyspec_OrderedJson_Value, numberLiteral) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    if (!oj_require(v, OJ_NUMBER, "number")) RETURN_THROWS();
    RETURN_STR(oj_token(v, v->tape->slots[v->index + 1], v->tape->slots[v->index + 2]));
}
ZEND_METHOD(Polyspec_OrderedJson_Value, booleanValue) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    if (!oj_require(v, OJ_BOOLEAN, "boolean")) RETURN_THROWS();
    RETURN_BOOL(ZSTR_VAL(v->source)[v->tape->slots[v->index + 1]] == 't');
}
static void oj_get(zval *return_value, oj_value *v, zend_string *key) {
    zval *member = zend_symtable_find(Z_ARRVAL_P(oj_children(v)), key);
    if (!member) RETURN_NULL();
    RETURN_COPY(member);
}
ZEND_METHOD(Polyspec_OrderedJson_Value, get) {
    zend_string *key;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_STR(key)
    ZEND_PARSE_PARAMETERS_END();
    OJ_SELF(v);
    if (!oj_require(v, OJ_OBJECT, "object")) RETURN_THROWS();
    oj_get(return_value, v, key);
}

/* The UTF-8 of a list of UTF-16 units, an unpaired surrogate as WTF-8; NULL after an exception for a bad unit. */
static zend_string *oj_units_to_utf8(HashTable *units) {
    size_t count = zend_hash_num_elements(units);
    zend_long *values = safe_emalloc(count, sizeof(zend_long), 0);
    size_t n = 0;
    zval *entry;
    ZEND_HASH_FOREACH_VAL(units, entry) {
        if (Z_TYPE_P(entry) != IS_LONG || Z_LVAL_P(entry) < 0 || Z_LVAL_P(entry) > 65535) {
            efree(values);
            oj_throw_kind(oj_argument_error_ce, "invalid_code_unit", "Expected UTF-16 code units");
            return NULL;
        }
        values[n++] = Z_LVAL_P(entry);
    } ZEND_HASH_FOREACH_END();
    zend_string *out = zend_string_alloc(count * 3, 0);
    size_t length = 0;
    for (size_t i = 0; i < n; i++) {
        uint32_t cp = (uint32_t)values[i];
        if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < n && values[i + 1] >= 0xdc00 && values[i + 1] <= 0xdfff) {
            cp = 0x10000 + ((cp - 0xd800) << 10) + (uint32_t)values[++i] - 0xdc00;
        }
        length = oj_put_point((unsigned char *)ZSTR_VAL(out), length, cp);
    }
    efree(values);
    ZSTR_VAL(out)[length] = '\0';
    ZSTR_LEN(out) = length;
    return out;
}
ZEND_METHOD(Polyspec_OrderedJson_Value, getUnits) {
    HashTable *units;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_ARRAY_HT(units)
    ZEND_PARSE_PARAMETERS_END();
    OJ_SELF(v);
    if (!oj_require(v, OJ_OBJECT, "object")) RETURN_THROWS();
    zend_string *key = oj_units_to_utf8(units);
    if (!key) RETURN_THROWS();
    oj_get(return_value, v, key);
    zend_string_release(key);
}

/* --- Parsing and factories ---------------------------------------------------------------------------------------- */

static void oj_check_depth_and_parse(zval *return_value, zend_string *source, zend_long max_depth, bool reject) {
    if (max_depth < 0 || max_depth > 256) {
        oj_throw_kind(oj_argument_error_ce, "depth_limit_out_of_range", "maxDepth must be between 0 and 256");
        RETURN_THROWS();
    }
    if (!oj_parse_into(return_value, source, max_depth, reject)) RETURN_THROWS();
}
ZEND_METHOD(Polyspec_OrderedJson_Value, parse) {
    zend_string *source;
    zend_long max_depth = 256;
    ZEND_PARSE_PARAMETERS_START(1, 2)
        Z_PARAM_STR(source)
        Z_PARAM_OPTIONAL
        Z_PARAM_LONG(max_depth)
    ZEND_PARSE_PARAMETERS_END();
    oj_check_depth_and_parse(return_value, source, max_depth, false);
}
ZEND_METHOD(Polyspec_OrderedJson_Value, parseRejectDuplicates) {
    zend_string *source;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_STR(source)
    ZEND_PARSE_PARAMETERS_END();
    oj_check_depth_and_parse(return_value, source, 256, true);
}
ZEND_FUNCTION(Polyspec_OrderedJson_parse) {
    zend_string *source;
    zend_long max_depth = 256;
    ZEND_PARSE_PARAMETERS_START(1, 2)
        Z_PARAM_STR(source)
        Z_PARAM_OPTIONAL
        Z_PARAM_LONG(max_depth)
    ZEND_PARSE_PARAMETERS_END();
    oj_check_depth_and_parse(return_value, source, max_depth, false);
}

/* Appends one UTF-16 unit as the constructors of the library spell it: printable ASCII as it is, the short escapes of
 * JSON, and \u with four lowercase hex digits for the rest. */
static void oj_quote_unit(smart_str *out, uint32_t unit) {
    switch (unit) {
        case '"': smart_str_appendl(out, "\\\"", 2); return;
        case '\\': smart_str_appendl(out, "\\\\", 2); return;
        case 8: smart_str_appendl(out, "\\b", 2); return;
        case 12: smart_str_appendl(out, "\\f", 2); return;
        case 10: smart_str_appendl(out, "\\n", 2); return;
        case 13: smart_str_appendl(out, "\\r", 2); return;
        case 9: smart_str_appendl(out, "\\t", 2); return;
    }
    if (unit >= 0x20 && unit <= 0x7e) {
        smart_str_appendc(out, (char)unit);
        return;
    }
    smart_str_appendl(out, "\\u", 2);
    static const char digits[] = "0123456789abcdef";
    for (int shift = 12; shift >= 0; shift -= 4) smart_str_appendc(out, digits[(unit >> shift) & 15]);
}
/* Appends the quoted JSON string of UTF-8 text, or of WTF-8 text with allow_wtf8; false after an exception. */
static bool oj_quote_text(smart_str *out, const unsigned char *s, size_t n, bool allow_wtf8) {
    smart_str_appendc(out, '"');
    for (size_t i = 0; i < n;) {
        uint32_t first = s[i++], cp;
        if (first < 0x80) {
            cp = first;
        } else {
            size_t width;
            uint32_t minimum;
            if (first >= 0xc2 && first <= 0xdf) { width = 2; cp = first & 31; minimum = 0x80; }
            else if (first >= 0xe0 && first <= 0xef) { width = 3; cp = first & 15; minimum = 0x800; }
            else if (first >= 0xf0 && first <= 0xf4) { width = 4; cp = first & 7; minimum = 0x10000; }
            else goto invalid;
            if (n - i < width - 1) goto invalid;
            for (size_t k = 1; k < width; k++) {
                if ((s[i] & 0xc0) != 0x80) goto invalid;
                cp = (cp << 6) | (s[i++] & 63);
            }
            if (cp < minimum || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff && !allow_wtf8)) goto invalid;
        }
        if (cp > 0xffff) {
            cp -= 0x10000;
            oj_quote_unit(out, 0xd800 | (cp >> 10));
            cp = 0xdc00 | (cp & 1023);
        }
        oj_quote_unit(out, cp);
    }
    smart_str_appendc(out, '"');
    return true;
invalid:
    oj_throw_kind(oj_argument_error_ce, "invalid_utf8", "Invalid UTF-8");
    return false;
}
/* Parses the text that smart_str holds, as the library parses what its constructors build. */
static void oj_parse_built(zval *return_value, smart_str *text) {
    smart_str_0(text);
    zend_string *source = text->s ? text->s : ZSTR_EMPTY_ALLOC();
    bool ok = oj_parse_into(return_value, source, 256, false);
    smart_str_free(text);
    if (!ok) RETURN_THROWS();
}
ZEND_METHOD(Polyspec_OrderedJson_Value, string) {
    zend_string *text;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_STR(text)
    ZEND_PARSE_PARAMETERS_END();
    smart_str out = {0};
    if (!oj_quote_text(&out, (const unsigned char *)ZSTR_VAL(text), ZSTR_LEN(text), false)) {
        smart_str_free(&out);
        RETURN_THROWS();
    }
    oj_parse_built(return_value, &out);
}
ZEND_METHOD(Polyspec_OrderedJson_Value, fromUnits) {
    HashTable *units;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_ARRAY_HT(units)
    ZEND_PARSE_PARAMETERS_END();
    smart_str out = {0};
    smart_str_appendc(&out, '"');
    zval *entry;
    static const char digits[] = "0123456789abcdef";
    ZEND_HASH_FOREACH_VAL(units, entry) {
        if (Z_TYPE_P(entry) != IS_LONG || Z_LVAL_P(entry) < 0 || Z_LVAL_P(entry) > 65535) {
            smart_str_free(&out);
            oj_throw_kind(oj_argument_error_ce, "invalid_code_unit", "Expected UTF-16 code units");
            RETURN_THROWS();
        }
        smart_str_appendl(&out, "\\u", 2);
        for (int shift = 12; shift >= 0; shift -= 4) smart_str_appendc(&out, digits[(Z_LVAL_P(entry) >> shift) & 15]);
    } ZEND_HASH_FOREACH_END();
    smart_str_appendc(&out, '"');
    oj_parse_built(return_value, &out);
}
ZEND_METHOD(Polyspec_OrderedJson_Value, number) {
    zend_string *literal;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_STR(literal)
    ZEND_PARSE_PARAMETERS_END();
    if (!oj_parse_into(return_value, literal, 256, false)) RETURN_THROWS();
    zend_string *trimmed = php_trim(literal, NULL, 0, 3);
    bool plain = zend_string_equals(trimmed, literal);
    zend_string_release(trimmed);
    if ((oj_meta(oj_from_object(Z_OBJ_P(return_value))) & OJ_KIND_MASK) != OJ_NUMBER || !plain) {
        zval_ptr_dtor(return_value);
        ZVAL_UNDEF(return_value);
        oj_throw_kind(oj_argument_error_ce, "invalid_number_literal", "Expected number literal without whitespace");
        RETURN_THROWS();
    }
}
ZEND_METHOD(Polyspec_OrderedJson_Value, boolean) {
    bool value;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_BOOL(value)
    ZEND_PARSE_PARAMETERS_END();
    zend_string *source = zend_string_init(value ? "true" : "false", value ? 4 : 5, 0);
    bool ok = oj_parse_into(return_value, source, 256, false);
    zend_string_release(source);
    if (!ok) RETURN_THROWS();
}
ZEND_METHOD(Polyspec_OrderedJson_Value, null) {
    ZEND_PARSE_PARAMETERS_NONE();
    zend_string *source = zend_string_init("null", 4, 0);
    bool ok = oj_parse_into(return_value, source, 256, false);
    zend_string_release(source);
    if (!ok) RETURN_THROWS();
}

static zend_string *oj_value_compact(zval *value) {
    oj_value *v = oj_from_object(Z_OBJ_P(value));
    oj_tape t = oj_view(v);
    return oj_compact(v->source, &t, v->index);
}
static void oj_append_compact(smart_str *out, zval *value) {
    zend_string *text = oj_value_compact(value);
    smart_str_append(out, text);
    zend_string_release(text);
}
ZEND_METHOD(Polyspec_OrderedJson_Value, array) {
    HashTable *items;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_ARRAY_HT(items)
    ZEND_PARSE_PARAMETERS_END();
    if (!zend_array_is_list(items)) {
        oj_throw_kind(oj_argument_error_ce, "invalid_argument_type", "Expected a list of values");
        RETURN_THROWS();
    }
    smart_str out = {0};
    smart_str_appendc(&out, '[');
    bool first = true;
    zval *entry;
    ZEND_HASH_FOREACH_VAL(items, entry) {
        if (Z_TYPE_P(entry) != IS_OBJECT || Z_OBJCE_P(entry) != oj_value_ce) {
            smart_str_free(&out);
            oj_throw_kind(oj_argument_error_ce, "invalid_argument_type", "Expected ordered_json Value");
            RETURN_THROWS();
        }
        if (!first) smart_str_appendc(&out, ',');
        first = false;
        oj_append_compact(&out, entry);
    } ZEND_HASH_FOREACH_END();
    smart_str_appendc(&out, ']');
    oj_parse_built(return_value, &out);
}
ZEND_METHOD(Polyspec_OrderedJson_Value, object) {
    HashTable *members;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_ARRAY_HT(members)
    ZEND_PARSE_PARAMETERS_END();
    smart_str out = {0};
    smart_str_appendc(&out, '{');
    bool first = true;
    zend_ulong index;
    zend_string *key;
    zval *entry;
    ZEND_HASH_FOREACH_KEY_VAL(members, index, key, entry) {
        if (Z_TYPE_P(entry) != IS_OBJECT || Z_OBJCE_P(entry) != oj_value_ce) {
            smart_str_free(&out);
            oj_throw_kind(oj_argument_error_ce, "invalid_argument_type", "Expected ordered_json Value");
            RETURN_THROWS();
        }
        if (!first) smart_str_appendc(&out, ',');
        first = false;
        if (key) {
            if (!oj_quote_text(&out, (const unsigned char *)ZSTR_VAL(key), ZSTR_LEN(key), true)) {
                smart_str_free(&out);
                RETURN_THROWS();
            }
        } else {
            smart_str_appendc(&out, '"');
            smart_str_append_long(&out, (zend_long)index);
            smart_str_appendc(&out, '"');
        }
        smart_str_appendc(&out, ':');
        oj_append_compact(&out, entry);
    } ZEND_HASH_FOREACH_END();
    smart_str_appendc(&out, '}');
    oj_parse_built(return_value, &out);
}

/* --- Serialization ------------------------------------------------------------------------------------------------ */

ZEND_METHOD(Polyspec_OrderedJson_Value, compact) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    RETURN_STR(oj_value_compact(ZEND_THIS));
}
ZEND_METHOD(Polyspec_OrderedJson_Value, __toString) {
    ZEND_PARSE_PARAMETERS_NONE();
    OJ_SELF(v);
    RETURN_STR(oj_value_compact(ZEND_THIS));
}
ZEND_METHOD(Polyspec_OrderedJson_Value, jsonSerialize) {
    ZEND_PARSE_PARAMETERS_NONE();
    oj_throw_kind(oj_usage_error_ce, "host_serialization_refused", "Use Polyspec\\OrderedJson\\stringify($value)");
    RETURN_THROWS();
}
ZEND_FUNCTION(Polyspec_OrderedJson_stringify) {
    zval *value;
    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_OBJECT_OF_CLASS(value, oj_value_ce)
    ZEND_PARSE_PARAMETERS_END();
    RETURN_STR(oj_value_compact(value));
}
