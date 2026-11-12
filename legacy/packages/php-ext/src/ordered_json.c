#include "ordered_json_internal.h"
#include "Zend/zend_exceptions.h"
#include "Zend/zend_enum.h"
#include "Zend/zend_interfaces.h"
#include "ext/standard/info.h"
#include "ext/json/php_json.h"
#include "ext/spl/spl_exceptions.h"
#include "polyspec_ordered_json_arginfo.h"

#define ORDERED_JSON_MAX_DEPTH 256

/* Objects with more members than this detect repeated keys with a hash table. */
#define OJ_LINEAR_MEMBERS 8

typedef struct {
    const unsigned char *source;
    size_t length, pos, error_offset;
    zend_long max_depth;
    const char *message;
    zend_long *tape;
    size_t count, capacity;
    size_t whitespace, duplicates;
    bool reject_duplicates;
} oj_parser;

typedef struct {
    const char *name;
    size_t length, key;
    bool owned;
} oj_member;

typedef struct {
    oj_member inline_items[4];
    oj_member *items;
    size_t count, capacity;
    HashTable *names;
} oj_members;


/* Why the document was rejected, named the same way by every implementation. */
const char *oj_kind(const char *message) {
    static const char *const pairs[][2] = {
        {"Expected JSON value", "expected_value"},
        {"Expected digit", "expected_digit"},
        {"Expected colon", "expected_colon"},
        {"Expected comma or closing delimiter", "expected_delimiter"},
        {"Expected string", "expected_object_key"},
        {"Invalid escape", "invalid_escape"},
        {"Invalid Unicode escape", "invalid_unicode_escape"},
        {"Unfinished escape", "unfinished_escape"},
        {"Unterminated string", "unterminated_string"},
        {"Unescaped control character", "unescaped_control_character"},
        {"Invalid UTF-8", "invalid_utf8"},
        {"Maximum nesting depth exceeded", "maximum_depth_exceeded"},
        {"Unexpected trailing input", "trailing_input"},
        {"Duplicate object key", "duplicate_object_key"},
    };
    for (size_t i = 0; i < sizeof(pairs) / sizeof(pairs[0]); i++)
        if (strcmp(pairs[i][0], message) == 0) return pairs[i][1];
    return NULL;
}

static bool oj_fail(oj_parser *p, const char *message) {
    p->message = message;
    p->error_offset = p->pos;
    return false;
}
static int oj_peek(oj_parser *p) { return p->pos < p->length ? p->source[p->pos] : -1; }
static void oj_ws(oj_parser *p) {
    size_t start = p->pos;
    while (p->pos < p->length) {
        unsigned char ch = p->source[p->pos];
        if (ch != ' ' && ch != '\t' && ch != '\n' && ch != '\r') break;
        p->pos++;
    }
    p->whitespace += p->pos - start;
}
static bool oj_expect(oj_parser *p, int ch, const char *message) {
    if (oj_peek(p) != ch) return oj_fail(p, message);
    p->pos++;
    return true;
}
static size_t oj_push(oj_parser *p, zend_long meta, size_t start, size_t end) {
    if (p->capacity - p->count < 3) {
        p->capacity *= 2;
        p->tape = safe_erealloc(p->tape, p->capacity, sizeof(zend_long), 0);
    }
    size_t index = p->count;
    p->tape[index] = meta;
    p->tape[index + 1] = (zend_long)start;
    p->tape[index + 2] = (zend_long)end;
    p->count += 3;
    return index;
}

/* Decode only scalar UTF-8: reject overlong encodings, surrogate bytes and > U+10FFFF. */
static bool oj_utf8(const unsigned char *s, size_t n, size_t *pos, uint32_t *point) {
    if (*pos >= n) return false;
    unsigned char first = s[*pos];
    if (first < 0x80) { *point = first; (*pos)++; return true; }
    int width;
    uint32_t cp, minimum;
    if (first >= 0xc2 && first <= 0xdf) { width = 2; cp = first & 31; minimum = 0x80; }
    else if (first >= 0xe0 && first <= 0xef) { width = 3; cp = first & 15; minimum = 0x800; }
    else if (first >= 0xf0 && first <= 0xf4) { width = 4; cp = first & 7; minimum = 0x10000; }
    else return false;
    if (n - *pos < (size_t)width) return false;
    for (int i = 1; i < width; i++) {
        unsigned char ch = s[*pos + i];
        if ((ch & 0xc0) != 0x80) return false;
        cp = (cp << 6) | (ch & 63);
    }
    if (cp < minimum || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return false;
    *point = cp; *pos += width;
    return true;
}
/* Validate a string token, including its UTF-8; flags receive OJ_COMPACT and OJ_ESCAPED as applicable. */
static bool oj_string(oj_parser *p, zend_long *flags) {
    if (!oj_expect(p, '"', "Expected string")) return false;
    *flags = OJ_COMPACT;
    while (p->pos < p->length) {
        unsigned char ch = p->source[p->pos++];
        if (ch == '"') return true;
        if (ch < 32) {
            /* The scanner has consumed the offending byte; the offset names it. */
            p->pos--;
            return oj_fail(p, "Unescaped control character");
        }
        if (ch >= 0x80) {
            uint32_t point;
            p->pos--;
            if (!oj_utf8(p->source, p->length, &p->pos, &point)) return oj_fail(p, "Invalid UTF-8");
            continue;
        }
        if (ch != '\\') continue;
        *flags |= OJ_ESCAPED;
        int escape = oj_peek(p);
        if (escape < 0) return oj_fail(p, "Unfinished escape");
        p->pos++;
        switch (escape) {
            case 'u':
                for (int i = 0; i < 4; i++) {
                    if (oj_hex(oj_peek(p)) < 0) return oj_fail(p, "Invalid Unicode escape");
                    p->pos++;
                }
                break;
            case '"': case '\\': case '/': case 'b': case 'f': case 'n': case 'r': case 't':
                break;
            default:
                /* The escape character has been consumed; the offset names it. */
                p->pos--;
                return oj_fail(p, "Invalid escape");
        }
    }
    return oj_fail(p, "Unterminated string");
}
static bool oj_digit(int ch) { return ch >= '0' && ch <= '9'; }
static bool oj_digits(oj_parser *p) {
    if (!oj_digit(oj_peek(p))) return oj_fail(p, "Expected digit");
    while (oj_digit(oj_peek(p))) p->pos++;
    return true;
}

static void oj_members_free(oj_members *m) {
    for (size_t i = 0; i < m->count; i++) {
        if (m->items[i].owned) efree((char *)m->items[i].name);
    }
    if (m->items != m->inline_items) efree(m->items);
    if (m->names) {
        zend_hash_destroy(m->names);
        FREE_HASHTABLE(m->names);
    }
}
/* Record the member whose key record is at `key`; a repeated name keeps the first key. */
static bool oj_add_member(oj_parser *p, oj_members *m, size_t key) {
    size_t start = (size_t)p->tape[key + 1] + 1, end = (size_t)p->tape[key + 2] - 1;
    oj_member member = {(const char *)p->source + start, end - start, key, false};
    if (p->tape[key] & OJ_ESCAPED) {
        unsigned char *name = emalloc(end - start + 1);
        member.length = oj_decode_name(p->source, start, end, name);
        member.name = (const char *)name;
        member.owned = true;
    }
    zval *found = NULL;
    size_t first = SIZE_MAX;
    if (m->names) {
        if ((found = zend_hash_str_find(m->names, member.name, member.length))) first = (size_t)Z_LVAL_P(found);
    } else {
        for (size_t i = 0; i < m->count; i++) {
            if (m->items[i].length == member.length && memcmp(m->items[i].name, member.name, member.length) == 0) {
                first = i;
                break;
            }
        }
    }
    if (first != SIZE_MAX) {
        if (p->reject_duplicates) {
            if (member.owned) efree((char *)member.name);
            p->message = "Duplicate object key";
            p->error_offset = (size_t)p->tape[key + 1];
            return false;
        }
        size_t first_key = m->items[first].key;
        p->tape[first_key] = (p->tape[first_key] & ((1 << OJ_LINK_SHIFT) - 1)) | ((zend_long)(key + 3) << OJ_LINK_SHIFT);
        p->tape[key] |= OJ_SKIP;
        p->duplicates++;
        if (member.owned) efree((char *)member.name);
        return true;
    }
    if (m->count == m->capacity) {
        oj_member *items = safe_emalloc(m->capacity, 2 * sizeof(oj_member), 0);
        memcpy(items, m->items, m->count * sizeof(oj_member));
        if (m->items != m->inline_items) efree(m->items);
        m->items = items;
        m->capacity *= 2;
    }
    m->items[m->count++] = member;
    if (m->names || m->count > OJ_LINEAR_MEMBERS) {
        size_t from = m->count - 1;
        if (!m->names) {
            ALLOC_HASHTABLE(m->names);
            zend_hash_init(m->names, 32, NULL, NULL, 0);
            from = 0;
        }
        for (size_t i = from; i < m->count; i++) {
            zval position;
            ZVAL_LONG(&position, (zend_long)i);
            zend_hash_str_add_new(m->names, m->items[i].name, m->items[i].length, &position);
        }
    }
    return true;
}

static bool oj_value(oj_parser *p, zend_long depth);

static bool oj_container(oj_parser *p, zend_long depth, size_t start, bool object) {
    if (depth >= p->max_depth) return oj_fail(p, "Maximum nesting depth exceeded");
    int close = object ? '}' : ']';
    size_t whitespace = p->whitespace, duplicates = p->duplicates;
    size_t index = oj_push(p, 0, start, 0);
    oj_members members;
    members.items = members.inline_items;
    members.count = 0;
    members.capacity = sizeof(members.inline_items) / sizeof(oj_member);
    members.names = NULL;
    bool ok = false;
    p->pos++;
    oj_ws(p);
    if (oj_peek(p) != close) {
        while (true) {
            if (object) {
                size_t key_start = p->pos;
                zend_long flags;
                if (!oj_string(p, &flags)) goto done;
                size_t key = oj_push(p, OJ_STRING | flags | ((zend_long)(p->count + 3) << OJ_LINK_SHIFT), key_start, p->pos);
                oj_ws(p);
                if (!oj_expect(p, ':', "Expected colon")) goto done;
                if (!oj_value(p, depth + 1)) goto done;
                if (!oj_add_member(p, &members, key)) goto done;
            } else if (!oj_value(p, depth + 1)) goto done;
            oj_ws(p);
            if (oj_peek(p) == close) break;
            if (!oj_expect(p, ',', "Expected comma or closing delimiter")) goto done;
            oj_ws(p);
        }
    }
    p->pos++;
    zend_long flags = p->whitespace == whitespace && p->duplicates == duplicates ? OJ_COMPACT : 0;
    p->tape[index] = (object ? OJ_OBJECT : OJ_ARRAY) | flags | ((zend_long)p->count << OJ_LINK_SHIFT);
    p->tape[index + 2] = (zend_long)p->pos;
    ok = true;
done:
    oj_members_free(&members);
    return ok;
}

static bool oj_value(oj_parser *p, zend_long depth) {
    oj_ws(p);
    size_t start = p->pos;
    int ch = oj_peek(p);
    if (ch == '{' || ch == '[') return oj_container(p, depth, start, ch == '{');
    if (ch == '"') {
        zend_long flags;
        if (!oj_string(p, &flags)) return false;
        oj_push(p, OJ_STRING | flags, start, p->pos);
        return true;
    }
    if (ch == '-' || oj_digit(ch)) {
        if (oj_peek(p) == '-') p->pos++;
        if (oj_peek(p) == '0') p->pos++;
        else if (!oj_digits(p)) return false;
        if (oj_peek(p) == '.') { p->pos++; if (!oj_digits(p)) return false; }
        if (oj_peek(p) == 'e' || oj_peek(p) == 'E') {
            p->pos++;
            if (oj_peek(p) == '+' || oj_peek(p) == '-') p->pos++;
            if (!oj_digits(p)) return false;
        }
        oj_push(p, OJ_NUMBER | OJ_COMPACT, start, p->pos);
        return true;
    }
    const char *literals[] = {"true", "false", "null"};
    size_t lengths[] = {4, 5, 4};
    for (int i = 0; i < 3; i++) {
        if (p->length - p->pos >= lengths[i] && memcmp(p->source + p->pos, literals[i], lengths[i]) == 0) {
            p->pos += lengths[i];
            oj_push(p, (i == 2 ? OJ_NULL : OJ_BOOLEAN) | OJ_COMPACT, start, p->pos);
            return true;
        }
    }
    return oj_fail(p, "Expected JSON value");
}

/* Parse into p->tape. On failure the tape is released and Polyspec\OrderedJson\ParseError is thrown. */
static bool oj_parse(zend_string *source, zend_long max_depth, bool reject_duplicates, oj_parser *p) {
    memset(p, 0, sizeof(*p));
    p->source = (const unsigned char *)ZSTR_VAL(source);
    p->length = ZSTR_LEN(source);
    p->max_depth = max_depth;
    p->reject_duplicates = reject_duplicates;
    p->capacity = 3 * MIN(p->length / 2 + 2, 4096);
    p->tape = safe_emalloc(p->capacity, sizeof(zend_long), 0);
    if (!oj_value(p, 0)) goto fail;
    oj_ws(p);
    if (p->pos != p->length) {
        oj_fail(p, "Unexpected trailing input"); goto fail;
    }
    return true;
fail:;
    /* A successful parse validates UTF-8 inside strings, and every other byte is an
     * ASCII token. Invalid UTF-8 anywhere takes precedence over other errors, so a
     * failed parse scans the whole input before reporting. */
    size_t cursor = 0;
    uint32_t point;
    while (cursor < p->length) {
        if (p->source[cursor] < 0x80) {
            cursor++;
            continue;
        }
        size_t start = cursor;
        if (!oj_utf8(p->source, p->length, &cursor, &point)) {
            p->message = "Invalid UTF-8";
            p->error_offset = start;
            break;
        }
    }
    if (p->tape) efree(p->tape);
    p->tape = NULL;
    oj_throw_parse_error(p->message, p->error_offset);
    return false;
}

zend_long *oj_scan(zend_string *source, zend_long max_depth, bool reject_duplicates, size_t *count) {
    oj_parser p;
    if (!oj_parse(source, max_depth, reject_duplicates, &p)) return NULL;
    *count = p.count;
    return p.tape;
}

typedef struct {
    const char *source;
    size_t source_length;
    char *out;
    size_t length, capacity;
} oj_writer;

static bool oj_write_token(oj_writer *w, zend_long start, zend_long end) {
    if (start < 0 || end <= start || (zend_ulong)end > w->source_length || (size_t)(end - start) > w->capacity - w->length) return false;
    memcpy(w->out + w->length, w->source + start, (size_t)(end - start));
    w->length += (size_t)(end - start);
    return true;
}
static bool oj_write_byte(oj_writer *w, char ch) {
    if (w->length == w->capacity) return false;
    w->out[w->length++] = ch;
    return true;
}
/* Serialize the value at index. Every write is bounded by the source length, so a
 * malformed tape fails instead of overrunning the buffer or looping. */
static bool oj_render(const oj_tape *t, oj_writer *w, size_t index, int depth) {
    zend_long meta, start, end;
    if (depth > ORDERED_JSON_MAX_DEPTH || !oj_slot(t, index, &meta) || !oj_slot(t, index + 1, &start) || !oj_slot(t, index + 2, &end)) return false;
    zend_long kind = meta & OJ_KIND_MASK;
    if (kind < OJ_OBJECT || kind > OJ_NULL) return false;
    if ((meta & OJ_COMPACT) || kind > OJ_ARRAY) return oj_write_token(w, start, end);
    bool object = kind == OJ_OBJECT, first = true;
    size_t limit = (size_t)(meta >> OJ_LINK_SHIFT), i = index + 3;
    if (meta < 0 || limit < i || limit > t->count || !oj_write_byte(w, object ? '{' : '[')) return false;
    while (i < limit) {
        zend_long key_meta = 0, value_meta;
        size_t value = object ? i + 3 : i;
        if ((object && !oj_slot(t, i, &key_meta)) || !oj_slot(t, value, &value_meta) || value_meta < 0) return false;
        size_t next = (value_meta & OJ_KIND_MASK) <= OJ_ARRAY ? (size_t)(value_meta >> OJ_LINK_SHIFT) : value + 3;
        if (next <= value || next > limit) return false;
        if (!(key_meta & OJ_SKIP)) {
            if (!first && !oj_write_byte(w, ',')) return false;
            first = false;
            if (object) {
                zend_long key_start, key_end;
                size_t target = (size_t)(key_meta >> OJ_LINK_SHIFT);
                if (key_meta < 0 || target <= i || target >= limit || !oj_slot(t, i + 1, &key_start) || !oj_slot(t, i + 2, &key_end)
                    || !oj_write_token(w, key_start, key_end) || !oj_write_byte(w, ':') || !oj_render(t, w, target, depth + 1)) return false;
            } else if (!oj_render(t, w, value, depth + 1)) {
                return false;
            }
        }
        i = next;
    }
    return oj_write_byte(w, object ? '}' : ']');
}
zend_string *oj_compact(zend_string *source, const oj_tape *t, size_t index) {
    zend_long meta, start, end;
    if (oj_slot(t, index, &meta) && (meta & OJ_COMPACT) && oj_slot(t, index + 1, &start) && oj_slot(t, index + 2, &end)
        && start >= 0 && end > start && (zend_ulong)end <= ZSTR_LEN(source)) {
        if (start == 0 && (size_t)end == ZSTR_LEN(source)) return zend_string_copy(source);
        return zend_string_init(ZSTR_VAL(source) + start, (size_t)(end - start), 0);
    }
    zend_string *out = zend_string_alloc(ZSTR_LEN(source), 0);
    oj_writer w = {ZSTR_VAL(source), ZSTR_LEN(source), ZSTR_VAL(out), 0, ZSTR_LEN(source)};
    if (!oj_render(t, &w, index, 0)) {
        zend_string_efree(out);
        return NULL;
    }
    ZSTR_VAL(out)[w.length] = '\0';
    ZSTR_LEN(out) = w.length;
    return out;
}

zend_class_entry *oj_value_ce, *oj_error_ce, *oj_argument_error_ce, *oj_usage_error_ce;

PHP_MINIT_FUNCTION(polyspec_ordered_json) {
    register_polyspec_ordered_json_symbols(module_number);
    /* Reflection reports a userland enum as final, as an enum is; the registration of an internal enum does not set it. */
    register_class_Polyspec_OrderedJson_Kind()->ce_flags |= ZEND_ACC_FINAL;
    oj_error_ce = register_class_Polyspec_OrderedJson_ParseError(spl_ce_InvalidArgumentException);
    oj_argument_error_ce = register_class_Polyspec_OrderedJson_ArgumentError(spl_ce_InvalidArgumentException);
    oj_usage_error_ce = register_class_Polyspec_OrderedJson_UsageError(spl_ce_LogicException);
    oj_value_ce = register_class_Polyspec_OrderedJson_Value(php_json_serializable_ce, zend_ce_stringable);
    oj_init_value_class();
    return SUCCESS;
}
PHP_MINFO_FUNCTION(polyspec_ordered_json) {
    php_info_print_table_start();
    php_info_print_table_row(2, "polyspec_ordered_json support", "enabled");
    php_info_print_table_row(2, "version", PHP_POLYSPEC_ORDERED_JSON_VERSION);
    php_info_print_table_end();
}
static const zend_module_dep oj_deps[] = {
    ZEND_MOD_REQUIRED("json")
    ZEND_MOD_REQUIRED("spl")
    ZEND_MOD_END
};
zend_module_entry polyspec_ordered_json_module_entry = {
    STANDARD_MODULE_HEADER_EX, NULL, oj_deps,
    "polyspec_ordered_json", ext_functions,
    PHP_MINIT(polyspec_ordered_json), NULL, NULL, NULL, PHP_MINFO(polyspec_ordered_json),
    PHP_POLYSPEC_ORDERED_JSON_VERSION, STANDARD_MODULE_PROPERTIES
};
#ifdef COMPILE_DL_POLYSPEC_ORDERED_JSON
ZEND_GET_MODULE(polyspec_ordered_json)
#endif
