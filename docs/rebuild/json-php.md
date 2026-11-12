<!-- doc-id: rebuild-json-php -->
# Rebuild record: PHP JSON parser

[한국어](json-php.ko.md)

Verdict: **none fits.** The PHP package keeps its own parser. Measured on 2026-10-20.

## Covers

- `legacy/packages/php/src/Value.php`

## Requirement

The parser reads a document into a lossless ordered value: the key order at every depth, the first position and last value of a
repeated key, the spelling of every number token, `{}` apart from `[]`, a rejection at the byte offset of the first invalid
byte with a kind of the shared list, and a nesting limit of 256 (RQ-001 to RQ-024 of `docs/spec/json-contract.md`).

## Tools evaluated

| Tool | Result |
|---|---|
| `json_decode` in object mode (`JSON_THROW_ON_ERROR`) | 99 of 115 cases of `examples/official.json` and `contracts/fixtures` hold (their accepted trees or rejections) |

| Requirement | Why it fails | Failing cases |
|---|---|---|
| RQ-010 | numbers become int or float, so the token spelling is lost | `official/exact-number-tokens`, `valid/decimal.json`, `valid/exponent.json`, `valid/huge-exponent.json`, `valid/huge-integer.json`, `valid/negative-zero.json`, `valid/scalar-whitespace.json`, `valid/tiny-exponent.json` |
| RQ-008, RQ-009 | escaped unpaired surrogates are rejected | `official/escaped-surrogates`, `official/unicode-key-overwrite`, `valid/lone-high-surrogate.json`, `valid/lone-low-surrogate.json`, `valid/mixed-surrogates.json`, `valid/surrogate-key.json` |
| RQ-002 | the property name "\u0000" is rejected in object mode, and the assoc mode makes `{}` and `[]` the same array (RQ-003) | `official/empty-and-null-key-overwrite` |
| RQ-006 | no nesting limit of 256 | `invalid/depth-exceeded.json` is accepted |
| RQ-004, RQ-005 | no offset, and a kind only as an error code | every rejection |

## Why none fits

The standard reader of the ecosystem is built for decoding into native values, so it cannot give the offsets, the kinds, the
limit or the spelling above. Wrapping it for the valid documents and keeping an own scanner for the errors would put two
parsers behind one contract.

## Retry condition

Revisit when the reader reports the byte offset of the first invalid byte and keeps the token spelling.
