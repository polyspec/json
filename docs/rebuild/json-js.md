<!-- doc-id: rebuild-json-js -->
# Rebuild record: JavaScript JSON parser

[한국어](json-js.ko.md)

Verdict: **none fits.** The JavaScript package keeps its own parser. Measured on 2026-10-20.

## Covers

- `legacy/packages/js/index.js`

## Requirement

The parser reads a document into a lossless ordered value: the key order at every depth, the first position and last value of a
repeated key, the spelling of every number token, `{}` apart from `[]`, a rejection at the byte offset of the first invalid
byte with a kind of the shared list, and a nesting limit of 256 (RQ-001 to RQ-024 of `docs/spec/json-contract.md`).

## Tools evaluated

| Tool | Result |
|---|---|
| JSON.parse with a reviver (`context.source`), Node.js 26.11 | 106 of 115 cases of `examples/official.json` and `contracts/fixtures` hold (their accepted trees or rejections) |

| Requirement | Why it fails | Failing cases |
|---|---|---|
| RQ-001 | integer-like keys are reordered before the reviver sees them | `official/document-order`, `official/nested-objects`, `official/objects-in-arrays`, `official/whitespace`, `official/nested-duplicate-keys`, `official/numeric-key-overwrite`, `valid/nested-order.json`, `valid/numeric-keys.json` |
| RQ-006 | no nesting limit of 256 | `invalid/depth-exceeded.json` is accepted |
| RQ-004, RQ-005 | the error carries a character position inside its message only and no shared kind | every rejection |
| RQ-018 | `context.source` exists for primitives only, so a container has no source span | the raw span of a nested value |

## Why none fits

The standard reader of the ecosystem is built for decoding into native values, so it cannot give the offsets, the kinds, the
limit or the spelling above. Wrapping it for the valid documents and keeping an own scanner for the errors would put two
parsers behind one contract.

## Retry condition

Revisit when the reader reports the byte offset of the first invalid byte and keeps the token spelling.
