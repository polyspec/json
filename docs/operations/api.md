<!-- doc-id: api -->
# API contract

[한국어](api.ko.md)

The [JSON contract](../spec/json-contract.md) defines behavior shared by all implementations. This document defines the current language bindings. The current identifiers are listed in [installation](installation.md).

The project is `json`, and every package name follows the polyspec convention. JavaScript uses the binding `@polyspec/json`, an npm package with a platform package of each machine. Rust uses Cargo package `polyspec-json` and imports `polyspec_json`. Go has the binding module `github.com/polyspec/json/packages/go`; the Go column of this document is still the legacy package `orderedjson` of `legacy/packages/go`, module `github.com/polyspec/ordered-json/packages/go`, which the checkout keeps until its tests move to the binding ([transition](../spec/json-contract.md#transition)). PHP uses the binding extension `polyspec_json` of the PIE package `polyspec/json`, namespace `Polyspec\Json` (T3.25-3). Python uses the binding `polyspec-json` and imports `polyspec.json`, a package under the namespace `polyspec`. The JavaScript, PHP and Python columns are the generated bindings of `packages/rust/interface.json`; the packages `@polyspec/ordered-json`, `polyspec/ordered-json` and `polyspec-ordered-json` are their legacy forms, which keep their last release.

<a id="values"></a>
## Values and parsing

Parsed `Value` objects cannot be modified through the library API. Factories construct strings, number tokens, booleans, null, arrays, and objects. Factories validate constructed JSON through the library parser. Wrong-kind access returns absence or an error, depending on the accessor; a refused argument raises the host error class of its language and carries a kind of the shared [argument kinds](../spec/json-contract.md#argument-kinds), so that no error has an empty kind. Core parsers and serializers do not delegate JSON behavior to host JSON APIs.

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Text parsing | `parse(source, options)` | `parse(source.as_bytes(), &options)` | `Parse(source)` | `parse(source, maxDepth)` | `parse(source, max_depth=…, reject_duplicates=…)` |
| UTF-8 bytes | `parse(bytes, options)` | `parse(bytes, &options)` | `ParseBytes(bytes)` | `parse($source, $maxDepth)` | `parse(data)` |
| Depth limit | `options.maxDepth` | `ParseOptions { max_depth }` | `ParseWithMaxDepth(source, limit)` | `maxDepth` | `max_depth=` |
| Default output | `stringify(value)` | `stringify(&value, &options)` | `Stringify(value)` | `stringify($value)` | `stringify(value)` |
| Compact output | `stringify(value)` | `value.to_string()` | `value.Compact()` | `(string) $value` | `str(value)` |
| Source inspection | `value.raw` | `value.raw()` | `value.Raw()` | `$value->raw()` | `value.raw` |
| Kind | `value.kind` | `value.kind()` | `value.Kind()` | `$value->kind()` | `value.kind` |

Every binding reports a parse error at its UTF-8 byte offset: Rust, Go, PHP, Python and JavaScript, whose `ParseError.offset` counts bytes for a string source and for a `Uint8Array` alike. JavaScript and Python take text or UTF-8 bytes in the one `parse`: a `string` or a `Uint8Array` in JavaScript, and a `str`, `bytes`, `bytearray` or `memoryview` in Python. The Go `Value` zero value is invalid. Empty `OrderedMap` values are valid object inputs.

<a id="bindings"></a>
## Binding extensions

A binding may add an API that only its language needs. A binding extension uses the shared parser and serializer, leaves results and error offsets unchanged for inputs it accepts, and documents any additional rejection. It appears in this section instead of the shared operation tables. Its package runs its own tests with the native test runner of its language (`make test-<language>`); an API that no shared case can reach is verified only by those tests.

The Rust crate is the core of the [Rust core](../spec/json-contract.md#core) rules: `parse(source, &ParseOptions)` takes UTF-8 bytes with the options `max_depth` and `reject_duplicates`, which rejects a repeated decoded object key at any depth with `duplicate_object_key` at the first byte of the second key token, and `stringify(&value, &StringifyOptions)` takes `html_safe`. The JavaScript, PHP and Python packages of this document are the bindings generated from `packages/rust/interface.json`; the Go package keeps the API of its legacy package during the [transition](../spec/json-contract.md#transition).

Every error of the Rust crate is a variant of the exhaustive enum `Error`, so a caller matches every kind without a wildcard arm; `kind()` is the name of the kind of the shared lists, `message()` the Rust wording, and `offset()` the byte offset of a parse rejection, `None` for an argument error and for the depth failure of a constructor. Accessors and lookups of another kind fail with `wrong_kind`, `string_value()` of a string with an unpaired surrogate with `unpaired_surrogate`, code units above 65535 with `invalid_code_unit`, `Value::from_f64` of NaN or an infinity with `non_finite_number`, and `host_json()` always with `host_serialization_refused`. No error has an empty kind.

The legacy Go package provides `ParseRejectDuplicates(source)`. It parses text with the normal grammar and the default depth limit but rejects a repeated decoded object key at any depth. It reports `duplicate object key` (the kind `duplicate_object_key`) at the first byte of the second key token, including when escape sequences spell the same UTF-16 key. `Parse` retains the shared duplicate-key behavior. All other valid values, errors and offsets are unchanged.

Every error of the legacy Go package is an `orderedjson.Error`, an interface that only the module implements, so no error of the module has an empty kind: `Kind()` returns an `ErrorKind` constant, whose string is the name of the kind, `Offset()` the byte offset of a rejection, zero for a refused argument, and `Message()` the Go wording; a caller reads it with `errors.As(err, &target)` for a `target` of type `orderedjson.Error`. A parse rejection carries the name of the shared list, except `unescaped_lone_surrogate`, since a Go string holds an unpaired surrogate only as invalid UTF-8, and `ParseRejectDuplicates` adds `duplicate_object_key`. A refused argument carries a kind of the shared argument list: `non_string_key` for `OrderedMap.Set` of a key that is not a string, `wrong_kind` for `Members`, `Items`, `StringUnits`, `StringValue`, `NumberLiteral` and `BooleanValue` of a value of another kind, `invalid_number_literal` for `Number`, `depth_limit_out_of_range` for `ParseWithMaxDepth` with a limit outside 0 through 256, `invalid_utf8` for `String` of text that is not UTF-8, and `invalid_argument_type` for a nil or zero `Value` given to `Set`, `Array`, `Stringify` or `Compact` and a nil `OrderedMap` given to `Object`.

In JavaScript, Python and PHP every error of the library carries its kind, the same name as in Rust and Go, on the error classes of the binding by category (change-errors): a value error for `invalid_number_literal`, `depth_limit_out_of_range`, `invalid_code_unit`, `invalid_number`, `invalid_text` and `unpaired_surrogate`, and a type error for `non_string_key`, `wrong_kind`, `invalid_argument_type`, `host_serialization_refused` and `direct_construction`; a `ParseError` is a value error with the offset of the rejection. JavaScript has `JsonValueError`, a `RangeError`, `JsonTypeError`, a `TypeError`, and `ParseError`, a `JsonValueError` whose `offset` is a number or null; each error has the properties `kind`, `status` and `errno`. Python has `JSONValueError`, a `ValueError`, `JSONTypeError`, a `TypeError`, and `ParseError`, a `JSONValueError`, with the attributes `kind`, `offset`, `status` and `errno`. PHP has `Polyspec\Json\JsonValueError`, an `InvalidArgumentException`, `Polyspec\Json\JsonTypeError`, a `TypeError`, and `Polyspec\Json\ParseError`, a `JsonValueError`, with the methods `kind()`, `offset()`, `status()` and `errno()`. Each binding also declares the classes of the other categories of the contract, the I/O, store, busy and internal errors (`JsonIoError`, `JsonStoreError`, `JsonBusyError` and `JsonInternalError`, in Python `JSONIoError` and so on). A constructor of an error given a kind or a message outside the lists, and the `Value` constructor of JavaScript and Python, raise `direct_construction`.

The JavaScript binding accepts `rejectDuplicates: true` in the options of `parse(source, options)`, beside `maxDepth`. With that option the parser rejects a repeated decoded object key at any depth with a `ParseError` of the kind `duplicate_object_key` whose `offset` is the first byte of the second key token, including when escape sequences spell the same UTF-16 key. The default `false` retains the shared duplicate-key behavior. `stringify(value, options)` takes `htmlSafe`. All other valid values, errors and offsets are unchanged.

The PHP binding takes the rejection of duplicates as the option of `parse($source, $maxDepth, $rejectDuplicates)` (change-parse-options): `parse($source, MAX_DEPTH, true)` rejects a repeated decoded object key at any depth with a `Polyspec\Json\ParseError` of the kind `duplicate_object_key` whose `offset()` is the first byte of the second key token, including when escape sequences spell the same UTF-16 key. The default `false` retains the shared duplicate-key behavior. All other valid values, errors and offsets are unchanged.

The Python binding takes the options of `parse` as keyword arguments: `parse(source, max_depth=256, reject_duplicates=False)`. With `reject_duplicates=True` the parser rejects a repeated decoded object key at any depth with a `ParseError` of the kind `duplicate_object_key` at the first byte of the second key token, including when escape sequences spell the same UTF-16 key. `stringify(value, html_safe=False)` takes `html_safe`. All other valid values, errors and offsets are unchanged. The distribution ships the `py.typed` marker of PEP 561 in the package `polyspec.json`, so type checkers read its annotations.

String access returns a surrogate pair as one character. An escaped unpaired surrogate is never replaced: `string_units()` keeps it in every implementation, and the string value of Rust (`string_value()`), JavaScript (`stringValue()`), PHP (`stringValue()`) and Python (`string_value()`) refuses such a string with `unpaired_surrogate` (change-string-value); `stringText()` of JavaScript and PHP and `string_text()` of Python return null or `None` for it and the text otherwise. The legacy Go package keeps it as WTF-8 bytes. A literal unpaired surrogate of text input has no UTF-8 encoding: Rust, Go and PHP reject its WTF-8 bytes as `invalid UTF-8` before the grammar is read, and JavaScript and Python refuse a `string` or `str` source that holds one with `invalid_text`, as `Value.string` of a text with one does; such a string is made from its code units with `Value.fromUnits(units)` or `Value.from_units(units)`.

The standard JSON interface of each language is `Value.toJSON` of JavaScript, `Value::jsonSerialize` of PHP, `json.dumps` of Python, `Value.MarshalJSON` of Go and the Serde traits of Rust. JavaScript and PHP refuse a value, also when a native structure holds it, with a message that points to `stringify`; `json.dumps` of Python refuses a value with its own `TypeError`, since the binding declares no encoder class. Go and Rust write the compact contract bytes of a value, also inside a native structure.

The integration is the standard interface of the ecosystem, never an encoder of the library: Go `Value` implements `json.Marshaler` (`MarshalJSON` writes the compact text of the value) and `json.Unmarshaler` (`UnmarshalJSON` parses the document with the library parser and keeps its order, number tokens and unpaired surrogates, and rejects invalid JSON), and Rust `Value` implements Serde `Serialize` and `Deserialize`, so `encoding/json` and `serde_json` encode and decode any native structure that holds values with their contract bytes. A native structure is otherwise encoded by the host library, whose rules are its own.

<a id="objects"></a>
## Associative objects

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Member map | `value.members()` | `value.members()` | `value.Members()` | `$value->members()` | `value.members()` |
| String-key lookup | `value.get(key)` | `value.get(key)` | `value.Get(key)` | `$value->get($key)` | `value.get(key)` |
| Code-unit lookup | `value.getUnits(units)` | `value.get_units(units)` | `value.GetUnits(units)` | `$value->getUnits($units)` | `value.get_units(units)` |
| Object construction | `Value.object(map)` | `Value::object(&members)` | `Object(map)` | `Value::object($map)` | `Value.object(map)` |

JavaScript returns an `OrderedMap` from `value.members()`: `insert(key, value)` takes a string `Value` key and returns the replaced value or null, `get(key)` and `getUnits(units)` look a member up, `size` is the number of members, and the map iterates as `[Value, Value]` pairs in insertion order. `Value.object(map)` takes an `OrderedMap` alone, which `new OrderedMap()` makes empty.

Rust returns an immutable `OrderedMap` reference. `OrderedMap::insert(key, value)` accepts a string `Value` key and returns the replaced value when present. `iter()` returns key/value references in insertion order, and `len()` is a `u64`.

Go returns an independent `OrderedMap` copy. `Set(key, value)` accepts a string `Value` key; `Keys()` returns key values in insertion order. `Get` and `GetUnits` return a value pointer or nil. `ParseBytes` copies its input.

PHP and Python return an `OrderedMap` whose keys and values are both `Value` objects, and object construction takes an `OrderedMap` alone: `insert(key, value)` takes a string `Value` key, so a key of another kind is refused with `non_string_key`, and `size()` is the number of members. The PHP map is an `IteratorAggregate`; iterating the Python map gives its keys, and `items()` its pairs. A missing key returns null in PHP and JavaScript, `None` in Rust and Python, and nil in Go.

<a id="scalars"></a>
## Arrays and scalars

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Array construction | `Value.array(items)` | `Value::array(items)` | `Array(items)` | `Value::array($items)` | `Value.array(items)` |
| Array elements | `value.items()` | `value.items()` | `value.Items()` | `$value->items()` | `value.items()` |
| String construction | `Value.string(text)` | `Value::string(text)` | `String(text)` | `Value::string($text)` | `Value.string(text)` |
| String access | `stringValue()` | `string_value()` | `StringValue()` | `stringValue()` | `string_value()` |
| UTF-16 access | `stringUnits()` | `string_units()` | `StringUnits()` | `stringUnits()` | `string_units()` |
| UTF-16 construction | `Value.fromUnits(units)` | `Value::from_units(&units)` | `StringFromUnits(units)` | `Value::fromUnits($units)` | `Value.from_units(units)` |
| Number construction | `Value.number(token)` | `Value::number(token)` | `Number(token)` | `Value::number($token)` | `Value.number(token)` |
| Number access | `numberLiteral()` | `number_literal()` | `NumberLiteral()` | `numberLiteral()` | `number_literal()` |
| Boolean construction | `Value.boolean(flag)` | `Value::boolean(flag)` | `Boolean(flag)` | `Value::boolean($flag)` | `Value.boolean(flag)` |
| Boolean access | `booleanValue()` | `boolean_value()` | `BooleanValue()` | `booleanValue()` | `boolean_value()` |
| Null construction | `Value.null()` | `Value::null()` | `Null()` | `Value::null()` | `Value.null()` |

The kind names are `object`, `array`, `string`, `number`, `boolean` and `null` in every implementation. Rust has the enum `Kind`, Go the constants `ObjectKind` to `NullKind` of `Kind`, Python the `StrEnum` `Kind` (`OBJECT` to `NULL`) and PHP the backed enum `Kind` with the cases `Object_`, `Array_`, `String_`, `Number`, `Boolean` and `Null_`; JavaScript has the type `Kind`, a union of the six strings with no runtime value. `value.kind` is a `Kind` in Rust and Go, the string in JavaScript and a member of `Kind` (which is its string) in Python, and `$value->kind()` is a case of the enum.

`Value.string` takes text: JavaScript and Python refuse a text with an unpaired surrogate with `invalid_text` ([RQ-026](../spec/json-contract.md#requirements)) and make such a string from its code units with `Value.fromUnits(units)` and `Value.from_units(units)`. Go exposes UTF-16 units as a slice, Rust as a `Vec<u64>` that the core checks against 65535; JavaScript, PHP and Python take integer code units and return them as an array or a list. `Value.fromFloat`, `Value::fromFloat` and `Value.from_float` make a number from a finite host float. Array access returns immutable data or independent copies.

<a id="php"></a>
## PHP backends

The PHP package of json is the binding extension `polyspec_json` of the PIE package `polyspec/json`, built from the Rust core by the release as a pre-packaged binary for each PHP minor and platform (T3.25-3). Its public symbols are those of `packages/php-ext/generated/polyspec_json.stub.php`: the classes `Polyspec\Json\Value` and `Polyspec\Json\OrderedMap`, the enum `Polyspec\Json\Kind`, the error classes `Polyspec\Json\JsonValueError`, `Polyspec\Json\JsonTypeError` and `Polyspec\Json\ParseError` among them, the functions `Polyspec\Json\parse` and `Polyspec\Json\stringify` and the constant `Polyspec\Json\MAX_DEPTH`. json has no pure PHP library: the legacy packages `polyspec/ordered-json` and `polyspec/ordered-json-php-ext` keep their last release.

An error class is constructed with a message and a kind of its class; another kind raises `JsonTypeError` with the kind `invalid_argument_type`, and the `Value` constructor raises `direct_construction`.

A pre-packaged binary matches the PHP minor, platform and thread-safety configuration of its name. See [native installation](installation.md#native-php).
