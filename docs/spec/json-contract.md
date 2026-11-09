<!-- doc-id: json-contract -->
# JSON contract

[한국어](json-contract.ko.md)

This specification defines the current JSON behavior. Implementation and publication status are recorded in [features](../features.md). The executable acceptance cases are maintained in [official.json](../../examples/official.json).

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

<a id="argument-kinds"></a>
### Argument kinds

The shared list of the argument kinds. A function of the library that refuses an argument names one of them, the same in every implementation; each binding throws the error class of its host for the case, keeps its own wording and exposes the kind through the accessor of its rejection kinds. A refused argument that is not UTF-8 names `invalid_utf8` of the rejection kinds. The shared verifier reads this list, sends the argument cases of [arguments.json](../../contracts/fixtures/arguments.json) to every implementation and fails on another kind. A kind that cannot arise in a language is stated with it.

- `non_string_key` — an object key that is not a string. It cannot arise in PHP, whose array keys are strings or integers.
- `wrong_kind` — an accessor that refuses a value of another kind.
- `invalid_number_literal` — a number constructor given a literal that is another JSON value or holds whitespace; a literal that does not parse names its rejection kind.
- `depth_limit_out_of_range` — a depth limit that is not an integer from 0 through 256.
- `invalid_argument_type` — an argument of a type that the function does not take, a value that the library did not make included (a Go nil or zero `Value`). It cannot arise in Rust, whose types the compiler checks; in PHP the declared parameter types refuse a host type before the library runs, so it arises there only where a signature cannot declare the type, as for the elements of an array.
- `invalid_code_unit` — a UTF-16 code unit that is not an integer from 0 through 65535. It cannot arise in Rust and Go, whose code units are `u16` and `uint16`, or in JavaScript, which takes code units only as a string.
- `host_serialization_refused` — the standard JSON interface of a language that would rewrite a value ([RQ-020](#requirements)). It cannot arise in Rust and Go, whose interfaces write the contract bytes.
- `direct_construction` — a constructor of the library called outside it: the `Value` constructor of JavaScript and Python, and an error constructor given a message or a kind outside these lists. It cannot arise in Rust and Go, whose values and errors keep their fields private.

<a id="numbers"></a>
## Numbers

Numbers retain their JSON token text. The library does not convert them to floating point during parsing or serialization. Large integers, `-0`, fractional precision, and exponent notation therefore remain unchanged. Number constructors require a valid JSON number token without surrounding whitespace. `NaN` and `Infinity` are rejected.

<a id="strings"></a>
## Strings

Strings retain their decoded UTF-16 code units and parsed token text. Escaped unpaired surrogates can be inspected through the code-unit APIs. Rust, Go, and PHP reject conversion of an unpaired surrogate to an ordinary Unicode string. JavaScript and Python return the corresponding string.

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
- **RQ-020** A value integrates with the standard JSON serialization interface of its language: where that interface can write a value as the library does (Go `encoding/json`, Rust serde) it writes the contract bytes, also when a native structure embeds the value; where it would reorder or rewrite it (JavaScript `JSON.stringify`, PHP `json_encode`, Python `json`) it refuses and directs the caller to the library serializer. No interface writes another document.
- **RQ-022** Every implementation gives the official examples the expected results.
- **RQ-023** The public API exports the parse, serialization, factory and accessor functions.
- **RQ-024** A parse error exposes its kind, its offset and its message.
- **RQ-025** A refused argument names one kind of the shared list of argument kinds, in the error class of its host.
