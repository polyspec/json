<!-- doc-id: rebuild-json-python -->
# Rebuild record: Python JSON parser

[한국어](json-python.ko.md)

Verdict: **none fits.** The Python package keeps its own parser. Measured on 2026-10-20.

## Covers

- `legacy/packages/python/src/polyspec/ordered_json/__init__.py`

## Requirement

The parser reads a document into a lossless ordered value: the key order at every depth, the first position and last value of a
repeated key, the spelling of every number token, `{}` apart from `[]`, a rejection at the byte offset of the first invalid
byte with a kind of the shared list, and a nesting limit of 256 (RQ-001 to RQ-024 of `docs/spec/json-contract.md`).

## Tools evaluated

| Tool | Result |
|---|---|
| `json.loads` with `object_pairs_hook`, `parse_int`, `parse_float` and `parse_constant` | 114 of 115 cases of `examples/official.json` and `contracts/fixtures` hold (their accepted trees or rejections) |

| Requirement | Why it fails | Failing cases |
|---|---|---|
| RQ-006 | no nesting limit of 256, and `RecursionError` at depth 100000 | `invalid/depth-exceeded.json` is accepted |
| RQ-004 | `JSONDecodeError.pos` is a character offset; it equals the contract byte offset in 39 of 62 rejections | `invalid/array-trailing-comma.json`, `invalid/bare-minus.json`, `invalid/exponent-no-digit.json`, `invalid/invalid-escape.json`, `invalid/invalid-u-hex.json` and 18 more |
| RQ-005 | the error names no shared kind | every rejection |
| RQ-018 | no span of a nested value | the raw span of a nested value |

## Why none fits

The standard reader of the ecosystem is built for decoding into native values, so it cannot give the offsets, the kinds, the
limit or the spelling above. Wrapping it for the valid documents and keeping an own scanner for the errors would put two
parsers behind one contract.

## Retry condition

Revisit when the reader reports the byte offset of the first invalid byte and keeps the token spelling.
