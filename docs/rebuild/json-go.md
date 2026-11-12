<!-- doc-id: rebuild-json-go -->
# Rebuild record: Go JSON parser

[한국어](json-go.ko.md)

Verdict: **none fits.** The Go package keeps its own parser. Measured on 2026-10-20.

## Covers

- `legacy/packages/go/orderedjson.go`

## Requirement

The parser reads a document into a lossless ordered value: the key order at every depth, the first position and last value of a
repeated key, the spelling of every number token, `{}` apart from `[]`, a rejection at the byte offset of the first invalid
byte with a kind of the shared list, and a nesting limit of 256 (RQ-001 to RQ-024 of `docs/spec/json-contract.md`).

## Tools evaluated

| Tool | Result |
|---|---|
| encoding/json `Decoder.Token` with `UseNumber` | 102 of 115 cases of `examples/official.json` and `contracts/fixtures` hold (their accepted trees or rejections) |

| Requirement | Why it fails | Failing cases |
|---|---|---|
| RQ-009 | an escaped unpaired surrogate becomes U+FFFD | `official/escaped-surrogates`, `official/unicode-key-overwrite`, `valid/lone-high-surrogate.json`, `valid/lone-low-surrogate.json`, `valid/mixed-surrogates.json`, `valid/surrogate-key.json` |
| RQ-007 | invalid UTF-8 is replaced, not rejected (a `utf8.Valid` check before the reader would cover this alone) | `invalid/continuation-utf8.json`, `invalid/invalid-utf8.json`, `invalid/out-of-range-utf8.json`, `invalid/overlong-utf8.json`, `invalid/surrogate-utf8.json`, `invalid/truncated-utf8.json` |
| RQ-006 | no nesting limit of 256 | `invalid/depth-exceeded.json` is accepted |
| RQ-004, RQ-005 | the offset equals the contract offset in 32 of 56 rejections and no shared kind exists | the other 24 rejections |

## Why none fits

The standard reader of the ecosystem is built for decoding into native values, so it cannot give the offsets, the kinds, the
limit or the spelling above. Wrapping it for the valid documents and keeping an own scanner for the errors would put two
parsers behind one contract.

## Retry condition

Revisit when the reader reports the byte offset of the first invalid byte and keeps the token spelling.
