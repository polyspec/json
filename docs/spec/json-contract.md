<!-- doc-id: json-contract -->
# JSON contract

[한국어](json-contract.ko.md)

This specification defines the current JSON behavior. Implementation and publication status are recorded in [features](../features.md). The executable acceptance cases are maintained in [official.json](../../examples/official.json). The rules of the Rust core and of the bindings generated from it are in [Rust core](#core), whose cases are [core.json](../../contracts/core.json).

<a id="objects"></a>
## Objects

An object is an associative map with one value per decoded string key. Iteration uses the key's first occurrence in the input document. A later occurrence replaces the value without changing the key's position. This rule applies to root objects, child objects, and objects inside arrays.

The `document-order` case preserves `10, 2`. The `duplicate-keys` case parses `{"b":1,"a":2,"b":3}` and serializes `{"b":3,"a":2}`. Key equality uses decoded UTF-16 code units: `"b"` and `"\u0062"` identify the same key. Replacing an object value replaces that entire value.

The JSON format does not assign semantic significance to object member order or prescribe one duplicate-key policy. The order and replacement rules above are library guarantees.

<a id="arrays"></a>
## Arrays

A JSON array stores values in input order. Arrays and objects remain distinct, including empty arrays and empty objects. The same object rules apply recursively to array elements.

<a id="parsing"></a>
## Parsing

A rejection also names its kind, taken from one [shared list](#rejection-kinds), so the reason is the same everywhere while each binding keeps its own wording. A rejection reports the offset of the first byte that makes the document invalid: the unescaped control character itself, the first byte that is not the hex digit or escape the grammar requires, or the first invalid UTF-8 byte. Every implementation rejects the same input at the same position, and the shared check compares those positions.

The parser accepts JSON objects, arrays, strings, numbers, booleans, and null at the root. Byte input must be UTF-8. The parser rejects comments, trailing commas, invalid number syntax, invalid escapes, unescaped control characters, invalid UTF-8, a byte order mark, and trailing input.

The maximum number of nested containers is 256. The caller can lower the limit to an integer from 0 through 256. A limit of 0 accepts scalar roots and rejects containers. The parser validates every input occurrence, including values subsequently replaced by a duplicate key.

The text input of JavaScript and Python, whose strings can hold an unpaired UTF-16 surrogate, rejects a literal one with `unescaped_lone_surrogate` at its offset before the grammar is read, because such text has no UTF-8 encoding, as byte input is checked for UTF-8 first. Escaped unpaired surrogates are accepted as described below. [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) defines the JSON grammar and permits implementation limits.

<a id="rejection-kinds"></a>
### Rejection kinds

The shared list of the rejection kinds. Every implementation names one of them for each rejection of the shared grammar, and the shared verifier (`scripts/verify.mts`) reads the list from this section and fails on a kind outside it.

- `expected_value`
- `expected_digit`
- `expected_colon`
- `expected_delimiter`
- `expected_object_key`
- `invalid_escape`
- `invalid_unicode_escape`
- `unfinished_escape`
- `unterminated_string`
- `unescaped_control_character`
- `unescaped_lone_surrogate`
- `invalid_utf8`
- `maximum_depth_exceeded`
- `trailing_input`

`unescaped_lone_surrogate` arises only in the language packages of the [transition](#transition): the core reads bytes, and a binding refuses a language text with an unpaired surrogate before the core runs ([RQ-026](#requirements)).

<a id="argument-kinds"></a>
### Argument kinds

The shared list of the argument kinds. A function of the library that refuses an argument names one of them, the same in every implementation; each binding throws the error class of its host for the case, keeps its own wording and exposes the kind through the accessor of its rejection kinds. A refused argument that is not UTF-8 names `invalid_utf8` of the rejection kinds. The shared verifier reads this list, sends the argument cases of [arguments.json](../../contracts/fixtures/arguments.json) to every implementation and fails on another kind. A kind that cannot arise in a language is stated with it.

- `non_string_key` — an object key that is not a string. It cannot arise in PHP, whose array keys are strings or integers.
- `wrong_kind` — an accessor that refuses a value of another kind.
- `invalid_number_literal` — a number constructor given a literal that is another JSON value or holds whitespace; a literal that does not parse names its rejection kind.
- `depth_limit_out_of_range` — a depth limit that is not an integer from 0 through 256.
- `invalid_argument_type` — an argument of a type that the function does not take, a value that the library did not make included (a Go nil or zero `Value`). It cannot arise in Rust, whose types the compiler checks; in PHP the declared parameter types refuse a host type before the library runs, so it arises there only where a signature cannot declare the type, as for the elements of an array.
- `invalid_code_unit` — a UTF-16 code unit that is not an integer from 0 through 65535 ([RQ-029](#requirements)). In the language packages of the [transition](#transition) it cannot arise in Go, whose code units are `uint16`, or in JavaScript, which takes code units only as a string.
- `host_serialization_refused` — the standard JSON interface of a language that would rewrite a value ([RQ-020](#requirements), [RQ-034](#requirements)). It arises in the core and its bindings; it cannot arise in Rust serde, which writes the contract bytes, or in the Go package of the [transition](#transition), whose `MarshalJSON` writes them.
- `direct_construction` — a constructor of the library called outside it: the `Value` constructor of JavaScript and Python, and an error constructor given a message or a kind outside these lists. It cannot arise in Rust and Go, whose values and errors keep their fields private.
- `unpaired_surrogate` — the Unicode text of a string that holds an escaped unpaired surrogate, which no Unicode text holds ([RQ-027](#requirements)). It arises in the core and its bindings; it cannot arise in the language packages of the [transition](#transition), JavaScript, Go, PHP and Python.
- `non_finite_number` — a number built from a float that is NaN, positive infinity or negative infinity, which no JSON number token writes ([RQ-030](#requirements)). It arises in the core and its bindings; it cannot arise in the language packages of the [transition](#transition), JavaScript, Go, PHP and Python, which build no number from a float.
- `internal` — a broken invariant of the core: a defect, never a refused input ([RQ-033](#requirements)). It cannot arise in the language packages of the [transition](#transition), JavaScript, Go, PHP and Python.

<a id="numbers"></a>
## Numbers

Numbers retain their JSON token text. The library does not convert them to floating point during parsing or serialization. Large integers, `-0`, fractional precision, and exponent notation therefore remain unchanged. Number constructors require a valid JSON number token without surrounding whitespace. `NaN` and `Infinity` are rejected. A number built from a binary64 float is written as ECMAScript `Number::toString` writes it ([RQ-030](#requirements)).

<a id="strings"></a>
## Strings

Strings retain their decoded UTF-16 code units and parsed token text. Escaped unpaired surrogates can be inspected through the code-unit APIs. The Unicode text of a string that holds one is refused with `unpaired_surrogate` ([RQ-027](#requirements)); in the language packages of the [transition](#transition), Go and PHP refuse it, Rust returned its WTF-8 bytes, and JavaScript and Python return the corresponding string.

PHP stores ordinary object keys as UTF-8 array keys. Escaped unpaired surrogates in keys use WTF-8 internally and are escaped when serialized. Numeric PHP array keys are serialized as JSON string keys.

<a id="serialization"></a>
## Serialization

The default serializer and compact serializer traverse the associative maps and arrays and return JSON without insignificant whitespace. They emit each object key once, in its first occurrence position, with its last value. Parsed scalar tokens and the first token spelling of each retained key are preserved.

Serialization is idempotent for every accepted value: parsing the serialized output and serializing it again produces the same output, type tree, key order, and scalar token values. Empty objects remain objects and empty arrays remain arrays through parsing, construction, serialization, and repeated round trips. Core implementations use their own JSON parser and serializer for these operations; host JSON APIs are not part of the implementation contract.

`raw` returns the original source span for inspection. The root span includes surrounding whitespace. It can contain overwritten keys and is not the serialized representation of the map.

The JavaScript `compact` option and PHP `compact` argument are accepted for compatibility; both values select the same compact output. JavaScript `JSON.stringify(Value)` and PHP `json_encode(Value)` fail and direct the caller to the library serializer. Go implements `MarshalJSON`; the standard encoder may change HTML escapes or whitespace.

<a id="construction"></a>
## Construction

Constructors accept library `Value` instances. Object constructors consume an ordered map or ordered entries; array constructors consume values in order. Object keys must be strings. Constructors apply the same duplicate-key, grammar, and depth rules as parsing.

The library uses the order supplied by a native collection. It does not reconstruct an earlier order that the native collection has already changed. General conversion of arbitrary native object graphs is not provided.

<a id="acceptance"></a>
## Acceptance

Every implementation receives the same official inputs and fixed expected results through the [shared verifier](../../scripts/verify.mts). Verification compares input acceptance, node types and values, key and array order, raw source access, default and compact serialization, and reconstruction through constructors.

Reconstruction inserts keys in their initial order, updates their values in reverse order, serializes the result, and validates that result with an independent parser. Generated objects must contain unique decoded keys. Number token text must remain exact; generated string-key escape spelling may differ.

Official examples define expected behavior. Supplementary fixtures increase coverage. A successful run establishes results for the recorded files and runtimes; it does not establish correctness for every possible input or every supported runtime.

<a id="requirements"></a>
## Requirements

Each requirement is one testable statement of this contract.

- **RQ-001** An object keeps the first occurrence position of each decoded key and the last value written for it.
- **RQ-002** Object keys compare by decoded UTF-16 code units, so an escaped spelling and a literal spelling name the same member.
- **RQ-003** Arrays keep their input order, and arrays and objects stay distinct, including the empty ones.
- **RQ-004** A rejection reports the offset of the first byte that makes the document invalid.
- **RQ-005** A rejection names one kind of the shared list of rejection kinds.
- **RQ-006** The nesting limit is 256 by default; a caller may lower it to an integer from 0 through 256, and a limit of 0 accepts scalar roots and rejects containers.
- **RQ-007** Byte input must be UTF-8: invalid UTF-8 is rejected, and valid multibyte text is accepted in full.
- **RQ-008** Text input rejects a literal unpaired surrogate before its grammar is read.
- **RQ-009** An escaped unpaired surrogate is kept as its code units and identifies its member or string by those code units.
- **RQ-010** Number tokens are retained exactly as written, and NaN and Infinity are rejected.
- **RQ-011** Serialization emits each object key once, and parsing its output again reproduces the same output.
- **RQ-012** Values come only from the library: a caller cannot build a value that bypasses the parser or the constructors.
- **RQ-013** A collection returned to the caller is immutable.
- **RQ-014** An accessor of a kind returns that kind's value, and an access of another kind is reported as a wrong-kind access.
- **RQ-015** Constructors validate their arguments and apply the grammar, depth and duplicate-key rules of parsing.
- **RQ-016** Object keys are strings, and an ordered map rejects a key that is not a string.
- **RQ-017** The strict parse rejects a duplicate key and accepts a document without one.
- **RQ-018** The raw source span of a value is the original text, including the surrounding whitespace of the root and the overwritten keys.
- **RQ-019** Member lookup finds a member by its decoded name.
- **RQ-020** A value integrates with the standard JSON serialization interface of its language: where that interface writes a value as the library does (Rust serde) it writes the contract bytes, also when a native structure embeds the value; where it would reorder or rewrite it (JavaScript `JSON.stringify`, PHP `json_encode`, Python `json`, and Go `encoding/json`, which rewrites `<`, `>` and `&` of the text that `MarshalJSON` returns) it refuses with `host_serialization_refused` and directs the caller to the library serializer. No interface writes another document. The Go package of the [transition](#transition) still writes through `MarshalJSON`.
- **RQ-022** Every implementation gives the official examples the expected results.
- **RQ-023** The public API exports the parse, serialization, factory and accessor functions.
- **RQ-024** A parse error exposes its kind, its offset and its message.
- **RQ-025** A refused argument names one kind of the shared list of argument kinds, in the error class of its host.
- **RQ-026** The core parses UTF-8 bytes, and every offset counts bytes. A binding gives the core the UTF-8 encoding of a language text; a language text that holds an unpaired surrogate has none, and the binding refuses it with `invalid_text` before the core runs ([RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) section 8.1: JSON text exchanged between systems is UTF-8).
- **RQ-027** `string_value` returns the Unicode text of a string and fails with `unpaired_surrogate` when the string holds an escaped unpaired surrogate; `string_units` returns the UTF-16 code units of every string, which keep an unpaired surrogate.
- **RQ-028** The string constructor writes its text as UTF-8 and escapes only what [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) section 7 requires: `"` and `\` as `\"` and `\\`, U+0008, U+0009, U+000A, U+000C and U+000D as `\b`, `\t`, `\n`, `\f` and `\r`, and the other characters U+0000 to U+001F as `\u00` and two lowercase hex digits. The code-unit constructor writes the same and an unpaired surrogate as `\u` and four lowercase hex digits. Every other character, U+2028 and U+2029 included, is written as itself, as ECMAScript `JSON.stringify` writes it (ECMA-262 QuoteJSONString).
- **RQ-029** The code-unit constructor and the code-unit lookup take integers from 0 through 65535 and refuse another with `invalid_code_unit`.
- **RQ-030** The number constructor of a binary64 float writes the token that ECMAScript `Number::toString` (ECMA-262, radix 10) writes: the shortest digits that read back as the same float, `-0` as `0`, positional notation for exponents from -7 through 20 and `e+`/`e-` notation beyond. NaN, positive infinity and negative infinity are refused with `non_finite_number`. `number_text` returns the same text, the one float-to-text function that other polyspec libraries use.
- **RQ-031** The serializer option `html_safe`, false by default, writes `<`, `>`, `&`, U+2028 and U+2029 of every string token, keys included, as `\u003c`, `\u003e`, `\u0026`, `\u2028` and `\u2029`, so the text can stand inside an HTML `script` element; nothing else of the output changes. These characters stand in a JSON text only inside strings, so the option changes string tokens only.
- **RQ-032** The accessors of a kind (`members`, `items`, `string_units`, `string_value`, `number_literal`, `boolean_value`) and member lookup (`get`, `get_units`) fail with `wrong_kind` on a value of another kind. Lookup in an object returns absence only for a name that the object does not hold.
- **RQ-033** Every failure of the core is an error with a kind of the shared lists. A parse rejection has its byte offset; `maximum_depth_exceeded` of a constructor and an argument error have none, since no input position caused them. A broken invariant of the core is `internal`.
- **RQ-034** The standard JSON serialization hook of a binding (JavaScript `toJSON`, PHP `jsonSerialize`, Go `MarshalJSON`) fails with `host_serialization_refused` ([RQ-020](#requirements)); Python has no such hook. The library serializer is `stringify`, the one function, and the string hook of each language (`toString`, `__toString`, `__str__`) writes the same text with the default options.
- **RQ-035** The parse options are `max_depth`, an integer from 0 through 256 ([RQ-006](#requirements)), and `reject_duplicates`, false by default ([RQ-017](#requirements)); the serializer options are `html_safe` ([RQ-031](#requirements)).

<a id="ignored-input"></a>
## Ignored input

Every input that the parser reads without effect on the value. The code that skips it names the row id.

| Id | Input ignored | Why it is correct | Case |
| --- | --- | --- | --- |
| IG-1 | Whitespace (U+0020, U+0009, U+000A, U+000D) before and after a token | [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) section 2: insignificant whitespace is allowed before or after any of the structural characters | `whitespace` of official.json; the root `raw` keeps it ([RQ-018](#requirements)) |
| IG-2 | The value of an object member that a later member of the same decoded name replaces | [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) section 4: names should be unique, and the behavior of a document whose names are not is left to the implementation; [RQ-001](#requirements) keeps the last value, `reject_duplicates` refuses the document instead ([RQ-017](#requirements)), and `raw` keeps the replaced member ([RQ-018](#requirements)) | `duplicate-keys` of official.json |

<a id="core"></a>
## Rust core

The crate `polyspec-json` of `packages/rust` holds every rule of this contract once. The bindings of PHP, Python, Node.js, Go and the browser are generated by bindgen from the interface contract `packages/rust/interface.json`, which the crate package includes, and hold no rule of their own. [core.json](../../contracts/core.json) holds the cases of RQ-026 to RQ-035, each failure as `raises` with its kind and category; the crate runs them in `tests/contract.rs`.

<a id="transition"></a>
### Transition

The former language packages are in `legacy/packages/js`, `legacy/packages/go`, `legacy/packages/php`, `legacy/packages/php-ext` and `legacy/packages/python`, and the generated bindings take `packages/`. The legacy packages keep their API and their own implementation, are no release target, and run their tests, lints and shared cases from their new paths. Each is removed by a change of its own (V-6 (5)) once the generated binding of its language passes the shared suite with no failure and no skip, the package tests of the legacy package pass against the binding with no change beyond the `changes` of the interface contract, and the differential test of the two implementations leaves no difference without a verdict. Until then this repository holds two implementations of each language, an exception to PRINCIPLES S6 whose end is that removal. The rules that only these packages follow are stated where they apply; every difference between their API and the interface contract is an entry of `changes` of `packages/rust/interface.json` with its rule.
