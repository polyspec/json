<!-- doc-id: api -->
# API contract

[한국어](api.ko.md)

The [JSON contract](../spec/json-contract.md) defines behavior shared by all implementations. This document defines the current language bindings. The current identifiers are listed in [installation](installation.md).

The project is `ordered-json`, and every package name follows the polyspec convention. JavaScript uses npm package `@polyspec/ordered-json`. Rust uses Cargo package `polyspec-ordered-json` and imports `polyspec_ordered_json`. Go uses module `github.com/polyspec/ordered-json/packages/go` and package `orderedjson`. PHP uses Composer package `polyspec/ordered-json`, namespace `Polyspec\OrderedJson`, and extension `polyspec_ordered_json` from the PIE package `polyspec/ordered-json-php-ext`, which registers the classes, functions and constant of the Composer package under the same names. Python uses package `polyspec-ordered-json` and imports `polyspec.ordered_json`, a namespace package under `polyspec`.

<a id="values"></a>
## Values and parsing

Parsed `Value` objects cannot be modified through the library API. Factories construct strings, number tokens, booleans, null, arrays, and objects. Factories validate constructed JSON through the library parser. Wrong-kind access returns absence or an error, depending on the accessor; a refused argument raises the host error class of its language and carries a kind of the shared [argument kinds](../spec/json-contract.md#argument-kinds), so that no error has an empty kind. Core parsers and serializers do not delegate JSON behavior to host JSON APIs.

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Text parsing | `parse(source, options)` | `parse(source)` | `Parse(source)` | `parse(source, maxDepth)` | `parse(source, options)` |
| UTF-8 bytes | `parseBytes(bytes, options)` | `parse_bytes(bytes)` | `ParseBytes(bytes)` | `parse(source)` | `parse_bytes(data, options)` |
| Depth limit | `options.maxDepth` | `parse_with_max_depth(source, limit)` | `ParseWithMaxDepth(source, limit)` | `maxDepth` | `options.max_depth` |
| Default output | `stringify(value)` | `stringify(&value)` | `Stringify(value)` | `stringify($value)` | `stringify(value)` |
| Compact output | `stringify(value)` | `value.compact()` | `value.Compact()` | `$value->compact()` | `value.compact()` |
| Source inspection | `value.raw` | `value.raw()` | `value.Raw()` | `$value->raw()` | `value.raw` |
| Kind | `value.kind` | `value.kind()` | `value.Kind()` | `$value->kind()` | `value.kind` |

JavaScript parse errors report UTF-16 offsets. Rust, Go, PHP and Python parse errors report UTF-8 byte offsets. An invalid UTF-8 error reports the byte offset of the first invalid byte in every binding, including JavaScript, because the input has no decoded text at that point; the JavaScript message names that unit. The Go `Value` zero value is invalid. Empty `OrderedMap` values in Rust and Go are valid object inputs.

<a id="bindings"></a>
## Binding extensions

A binding may add an API that only its language needs. A binding extension uses the shared parser and serializer, leaves results and error offsets unchanged for inputs it accepts, and documents any additional rejection. It appears in this section instead of the shared operation tables. Its package runs its own tests with the native test runner of its language (`make test-<language>`); an API that no shared case can reach is verified only by those tests.

The Rust binding provides `parse_bytes_reject_duplicates(source)`. It parses UTF-8 bytes with the normal grammar and depth limit but rejects a repeated decoded object key at any depth. It reports `duplicate object key` (the kind `duplicate_object_key`) at the first byte of the second key token, including when escape sequences spell the same UTF-16 key. `parse_bytes` retains the shared duplicate-key behavior. All other valid values, errors and offsets are unchanged.

Every error of the Rust binding is an `Error` whose `kind()` returns the enum `ErrorKind`, which is exhaustive, so a caller matches every kind without a wildcard arm; `ErrorKind::as_str()` is the name of the kind, `message()` the Rust wording, and `offset` the byte offset of a rejection, zero for a refused argument. A parse rejection carries the name of the shared list of rejection kinds, except `unescaped_lone_surrogate`, which a Rust `str` cannot hold, and the strict parse adds `duplicate_object_key`. A refused argument carries a kind of the shared argument list: `non_string_key` for `OrderedMap::insert` of a key that is not a string, `wrong_kind` for `string_value()` of a value of another kind, `invalid_number_literal` for `Value::number` of a literal that is another JSON value or holds whitespace (a literal that does not parse carries the kind of its rejection), and `depth_limit_out_of_range` for `parse_with_max_depth` with a limit above 256. No error has an empty kind.

The Go binding provides `ParseRejectDuplicates(source)`. It parses text with the normal grammar and the default depth limit but rejects a repeated decoded object key at any depth. It reports `duplicate object key` (the kind `duplicate_object_key`) at the first byte of the second key token, including when escape sequences spell the same UTF-16 key. `Parse` retains the shared duplicate-key behavior. All other valid values, errors and offsets are unchanged.

Every error of the Go binding is an `orderedjson.Error`, an interface that only the module implements, so no error of the module has an empty kind: `Kind()` returns an `ErrorKind` constant, whose string is the name of the kind, `Offset()` the byte offset of a rejection, zero for a refused argument, and `Message()` the Go wording; a caller reads it with `errors.As(err, &target)` for a `target` of type `orderedjson.Error`. A parse rejection carries the name of the shared list, except `unescaped_lone_surrogate`, since a Go string holds an unpaired surrogate only as invalid UTF-8, and `ParseRejectDuplicates` adds `duplicate_object_key`. A refused argument carries a kind of the shared argument list: `non_string_key` for `OrderedMap.Set` of a key that is not a string, `wrong_kind` for `Members`, `Items`, `StringUnits`, `StringValue`, `NumberLiteral` and `BooleanValue` of a value of another kind, `invalid_number_literal` for `Number`, `depth_limit_out_of_range` for `ParseWithMaxDepth` with a limit outside 0 through 256, `invalid_utf8` for `String` of text that is not UTF-8, and `invalid_argument_type` for a nil or zero `Value` given to `Set`, `Array`, `Stringify` or `Compact` and a nil `OrderedMap` given to `Object`.

In JavaScript, Python and PHP every error of the library carries its kind on `kind`, the same name as in Rust and Go: a `ParseError` a rejection kind, and a refused argument a kind of the shared argument list in the host class of its language. JavaScript raises `TypeError` for every argument kind except `depth_limit_out_of_range`, which is a `RangeError`, and its `parse` refuses options that are not an object. Python raises `TypeError` for `non_string_key`, `wrong_kind`, `invalid_argument_type`, `host_serialization_refused` and `direct_construction` and `ValueError` for `invalid_number_literal`, `invalid_code_unit` and a `max_depth` outside 0 through 256 (`depth_limit_out_of_range`, a `TypeError` when the limit is not an integer). PHP raises `Polyspec\OrderedJson\ArgumentError`, an `InvalidArgumentException`, for `invalid_number_literal`, `depth_limit_out_of_range`, `invalid_argument_type`, `invalid_code_unit` and `invalid_utf8`, and `Polyspec\OrderedJson\UsageError`, a `LogicException`, for `wrong_kind`, `host_serialization_refused` and `direct_construction`; a PHP array key is a string or an integer, so `non_string_key` cannot arise. A constructor of an error given a kind or a message outside the lists, and the `Value` constructor of JavaScript and Python, raise `direct_construction`.

The JavaScript binding accepts `rejectDuplicates: true` in the options of `parse(source, options)` and `parseBytes(bytes, options)`. With that option the parser rejects a repeated decoded object key at any depth with a `ParseError` whose message is `Duplicate object key at UTF-16 offset N` and whose `kind` is `duplicate_object_key`, where `N` is the UTF-16 offset of the second key token, including when escape sequences spell the same UTF-16 key. `rejectDuplicates` must be a boolean; the default `false` retains the shared duplicate-key behavior. The option combines with `maxDepth`. All other valid values, errors and offsets are unchanged.

The PHP binding provides `Value::parseRejectDuplicates(source)`. It parses UTF-8 text with the normal grammar and the default depth limit but rejects a repeated decoded object key at any depth. It throws `Polyspec\OrderedJson\ParseError` with the message `Duplicate object key at byte N` and the kind `duplicate_object_key`, where `N` is the first byte of the second key token, including when escape sequences spell the same UTF-16 key. It parses with the pure PHP parser even when the `polyspec_ordered_json` extension is loaded, because the native scanner retains the shared duplicate-key behavior; the returned value uses the loaded backend for access and serialization. `Value::parse` retains the shared duplicate-key behavior. All other valid values, errors and offsets are unchanged.

The Python binding accepts `reject_duplicates=True` in the `ParseOptions` of `parse(source, options)` and `parse_bytes(data, options)`, the spelling of the JavaScript option in snake case. With that option the parser rejects a repeated decoded object key at any depth with a `ParseError` of the kind `duplicate_object_key` at the first byte of the second key token, including when escape sequences spell the same UTF-16 key. Text input also rejects a literal unpaired surrogate of the source text with the kind `unescaped_lone_surrogate` at the byte position of that character, the position its UTF-8 encoding would take, because the text has no valid UTF-8 encoding there. `Value.string_value()` returns a surrogate pair as one character and an unpaired surrogate as its own character, as the JavaScript binding does. All other valid values, errors and offsets are unchanged. The distribution ships the `py.typed` marker of PEP 561 in the package `polyspec.ordered_json`, so type checkers read its annotations.

String access returns a surrogate pair as one character. An escaped unpaired surrogate is never replaced: the string value keeps it in the form of the library, as a lone surrogate of the host string in JavaScript and Python and as WTF-8 bytes in Go, PHP and Rust, whose `string_value()` returns those bytes (`Vec<u8>`, valid UTF-8 unless the string holds an unpaired surrogate) because a Rust `String` cannot hold it. A literal unpaired surrogate of text input has no UTF-8 encoding, so Rust, Go and PHP reject its WTF-8 bytes as `invalid UTF-8` before the grammar is read, and JavaScript and Python reject it as `unescaped_lone_surrogate`.

The standard JSON interface of each language is `Value.toJSON` of JavaScript, `Value::jsonSerialize` of PHP, `ordered_json.JSONEncoder` of Python, `Value.MarshalJSON` of Go and the Serde traits of Rust. JavaScript, PHP and Python refuse a value, also when a native structure holds it, with a message that points to `stringify`; Python refuses through `JSONEncoder.default`, which a caller passes as `cls` to `json.dumps`, and `json.dumps` without it refuses with its own `TypeError`. Go and Rust write the compact contract bytes of a value, also inside a native structure.

The public Python adapter class `JSONEncoder` and its `default` callback belong to this host serialization API and are both declared in its API inventory.

The integration is the standard interface of the ecosystem, never an encoder of the library: Go `Value` implements `json.Marshaler` (`MarshalJSON` writes the compact text of the value) and `json.Unmarshaler` (`UnmarshalJSON` parses the document with the library parser and keeps its order, number tokens and unpaired surrogates, and rejects invalid JSON), and Rust `Value` implements Serde `Serialize` and `Deserialize`, so `encoding/json` and `serde_json` encode and decode any native structure that holds values with their contract bytes. A native structure is otherwise encoded by the host library, whose rules are its own.

<a id="objects"></a>
## Associative objects

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Member map | `value.members` | `value.members()` | `value.Members()` | `$value->members()` | `value.members()` |
| String-key lookup | `value.get(key)` | `value.get(key)` | `value.Get(key)` | `$value->get($key)` | `value.get(key)` |
| Code-unit lookup | `value.get(key)` | `value.get_units(units)` | `value.GetUnits(units)` | `$value->getUnits($units)` | `value.get_units(units)` |
| Object construction | `Value.object(entries)` | `Value::object(&map)` | `Object(map)` | `Value::object($map)` | `Value.object(entries)` |

JavaScript returns a copied `Map<string, Value>`, exposed as `ReadonlyMap` in TypeScript. `value.keys` returns the first parsed key tokens in order. Object factories accept an iterable of `[string or Value, Value]` entries.

Rust returns an immutable `OrderedMap` reference. `OrderedMap::insert(key, value)` accepts a string `Value` key and returns the replaced value when present. `iter()` returns key/value references in insertion order.

Go returns an independent `OrderedMap` copy. `Set(key, value)` accepts a string `Value` key; `Keys()` returns key values in insertion order. `Get` and `GetUnits` return a value pointer or nil. `ParseBytes` copies its input.

PHP returns an associative array of `Value` objects. Object construction accepts that associative array. A PHP array key is a string or an integer, so no other key type can reach an object, and an integer key is the object key of its decimal digits. Python returns a read-only mapping copy; object construction accepts a mapping or an iterable of pairs with a string or string `Value` key. A missing key returns null in PHP, undefined in JavaScript, `None` in Rust and Python, and nil in Go.

<a id="scalars"></a>
## Arrays and scalars

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Array construction | `Value.array(items)` | `Value::array(items)` | `Array(items)` | `Value::array($items)` | `Value.array(items)` |
| Array elements | `value.items` | `value.items()` | `value.Items()` | `$value->items()` | `value.items()` |
| String construction | `Value.string(text)` | `Value::string(text)` | `String(text)` | `Value::string($text)` | `Value.string(text)` |
| String access | `stringValue()` | `string_value()` | `StringValue()` | `stringValue()` | `string_value()` |
| UTF-16 access | `stringUnits()` | `string_units()` | `StringUnits()` | `stringUnits()` | `string_units()` |
| UTF-16 construction | `Value.string(text)` | `Value::from_units(units)` | `StringFromUnits(units)` | `Value::fromUnits($units)` | `Value.from_units(units)` |
| Number construction | `Value.number(token)` | `Value::number(token)` | `Number(token)` | `Value::number($token)` | `Value.number(token)` |
| Number access | `numberLiteral()` | `number_literal()` | `NumberLiteral()` | `numberLiteral()` | `number_literal()` |
| Boolean construction | `Value.boolean(flag)` | `Value::boolean(flag)` | `Boolean(flag)` | `Value::boolean($flag)` | `Value.boolean(flag)` |
| Boolean access | `booleanValue()` | `boolean_value()` | `BooleanValue()` | `booleanValue()` | `boolean_value()` |
| Null construction | `Value.null()` | `Value::null()` | `Null()` | `Value::null()` | `Value.null()` |

The kind names are the enumeration `Kind` of every implementation: `Object`, `Array`, `String`, `Number`, `Boolean` and `Null`, with the values `object`, `array`, `string`, `number`, `boolean` and `null`. Rust has the enum `Kind`, Go the constants `ObjectKind` to `NullKind` of `Kind`, JavaScript the enum `Kind`, Python the `StrEnum` `Kind` and PHP the backed enum `Kind`. `value.kind` is a `Kind` in Rust and Go, its string value in JavaScript, a member of `Kind` (which is its string) in Python, and `$value->kind()` is the string, which `Kind::from()` turns into the enum.

JavaScript can construct a string from existing UTF-16 text. Rust and Go expose UTF-16 units as slices; PHP and Python take an iterable of integer code units, and Python returns the units as a list. Array access returns immutable data or independent copies.

<a id="php"></a>
## PHP backends

The PHP library is `polyspec/ordered-json`. Its public symbols are the class `Polyspec\OrderedJson\Value`, the exceptions `Polyspec\OrderedJson\ParseError`, `Polyspec\OrderedJson\ArgumentError` and `Polyspec\OrderedJson\UsageError`, the functions `Polyspec\OrderedJson\parse` and `Polyspec\OrderedJson\stringify` and the constant `Polyspec\OrderedJson\MAX_DEPTH`; everything else of the library is private to them.

The extension `polyspec_ordered_json`, the PIE package `polyspec/ordered-json-php-ext`, implements the library in C and registers those classes, functions and the constant under the same names and signatures. A process loads the library or the extension, never both (the library loads its sources unconditionally and would redeclare the functions), so one test suite runs against the pure PHP implementation and, with none of the library's sources, against the extension, and the results, errors and offsets are the same. The extension reports the version of its package, `composer.json` of `packages/php-ext`.

The ParseError constructor accepts only the parser messages mapped to the shared rejection kinds. An unknown message raises `UsageError` with the kind `direct_construction` in both PHP backends, including a message with a known prefix followed by a NUL byte.

Native builds must match the PHP version, platform, and thread-safety configuration. See [native installation](installation.md#native-php).
