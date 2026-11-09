/* Definitions shared by the scanner (ordered_json.c) and the classes (value.c). */
#ifndef ORDERED_JSON_INTERNAL_H
#define ORDERED_JSON_INTERNAL_H

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif
#include "php.h"
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

/* A descriptor is a tape of three integers per value in document order:
 * meta, start and end. meta = kind | flags | link << OJ_LINK_SHIFT. A container
 * links past its subtree; an object key links to the value of its member. */
#define OJ_OBJECT 1
#define OJ_ARRAY 2
#define OJ_STRING 3
#define OJ_NUMBER 4
#define OJ_BOOLEAN 5
#define OJ_NULL 6
#define OJ_KIND_MASK 7
/* The value serializes to exactly its source token. */
#define OJ_COMPACT 8
/* The string token contains escape sequences. */
#define OJ_ESCAPED 16
/* A repeated object key; the first key of that name links to the final value. */
#define OJ_SKIP 32
#define OJ_LINK_SHIFT 8

/* A read-only view of the tape of a document. */
typedef struct {
    const zend_long *slots;
    size_t count;
} oj_tape;

static inline bool oj_slot(const oj_tape *t, size_t index, zend_long *value) {
    if (index >= t->count) return false;
    *value = t->slots[index];
    return true;
}
static inline int oj_hex(int ch) {
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'a' && ch <= 'f') return ch - 'a' + 10;
    if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
    return -1;
}
static inline size_t oj_put_point(unsigned char *out, size_t n, uint32_t cp) {
    if (cp < 0x80) out[n++] = (unsigned char)cp;
    else if (cp < 0x800) {
        out[n++] = (unsigned char)(0xc0 | (cp >> 6));
        out[n++] = (unsigned char)(0x80 | (cp & 63));
    } else if (cp < 0x10000) {
        out[n++] = (unsigned char)(0xe0 | (cp >> 12));
        out[n++] = (unsigned char)(0x80 | ((cp >> 6) & 63));
        out[n++] = (unsigned char)(0x80 | (cp & 63));
    } else {
        out[n++] = (unsigned char)(0xf0 | (cp >> 18));
        out[n++] = (unsigned char)(0x80 | ((cp >> 12) & 63));
        out[n++] = (unsigned char)(0x80 | ((cp >> 6) & 63));
        out[n++] = (unsigned char)(0x80 | (cp & 63));
    }
    return n;
}
/* Decoded key identity of validated string contents: UTF-8, with lone surrogates as WTF-8.
 * The result is never longer than the contents. */
static inline size_t oj_decode_name(const unsigned char *s, size_t i, size_t end, unsigned char *out) {
    size_t n = 0;
    uint32_t pending = 0;
    while (i < end) {
        uint32_t unit;
        if (s[i] == '\\') {
            unsigned char escape = s[i + 1];
            if (escape == 'u') {
                unit = 0;
                for (int k = 2; k < 6; k++) unit = (unit << 4) | (uint32_t)oj_hex(s[i + k]);
                i += 6;
            } else {
                switch (escape) {
                    case 'b': unit = 8; break;
                    case 'f': unit = 12; break;
                    case 'n': unit = 10; break;
                    case 'r': unit = 13; break;
                    case 't': unit = 9; break;
                    default: unit = escape;
                }
                i += 2;
            }
        } else if (s[i] < 0x80) {
            unit = s[i++];
        } else {
            size_t width = s[i] < 0xe0 ? 2 : (s[i] < 0xf0 ? 3 : 4);
            if (pending) { n = oj_put_point(out, n, pending); pending = 0; }
            memcpy(out + n, s + i, width);
            n += width; i += width;
            continue;
        }
        if (pending) {
            if (unit >= 0xdc00 && unit <= 0xdfff) {
                n = oj_put_point(out, n, 0x10000 + ((pending - 0xd800) << 10) + (unit - 0xdc00));
                pending = 0;
                continue;
            }
            n = oj_put_point(out, n, pending);
            pending = 0;
        }
        if (unit >= 0xd800 && unit <= 0xdbff) pending = unit;
        else n = oj_put_point(out, n, unit);
    }
    if (pending) n = oj_put_point(out, n, pending);
    return n;
}

extern zend_class_entry *oj_value_ce, *oj_error_ce, *oj_argument_error_ce, *oj_usage_error_ce;

/* Why a document was rejected, named the same way by every implementation; NULL for a message outside the list. */
const char *oj_kind(const char *message);
/* Throws Polyspec\OrderedJson\ParseError for the message of the parser, one of the list, at the byte offset. */
void oj_throw_parse_error(const char *message, size_t offset);
/* Throws the Polyspec\OrderedJson\ArgumentError or UsageError of `ce` with the argument kind and the message. */
void oj_throw_kind(zend_class_entry *ce, const char *kind, const char *message);
/* Scans source into a tape of `count` slots (emalloc), or throws ParseError and returns NULL. A repeated key is an error
 * at the first byte of its second token when reject_duplicates. */
zend_long *oj_scan(zend_string *source, zend_long max_depth, bool reject_duplicates, size_t *count);
/* The compact serialization of the value at index, or NULL for a tape that does not match the source. */
zend_string *oj_compact(zend_string *source, const oj_tape *t, size_t index);
/* Registers the object handlers of Polyspec\OrderedJson\Value. */
void oj_init_value_class(void);

#endif
