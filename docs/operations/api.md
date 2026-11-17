<!-- doc-id: api -->
# API contract

[한국어](api.ko.md)

The [JSON contract](../spec/json-contract.md) defines behavior shared by all implementations. This document defines the current language bindings. The current identifiers are listed in [installation](installation.md).

The project is `json`, and every package name follows the polyspec convention. JavaScript uses the binding `@polyspec/json`, an npm package with a platform package of each machine. Rust uses Cargo package `polyspec-json` and imports `polyspec_json`. Go uses the binding module `github.com/polyspec/json/packages/go`, package `json`, which links the static library of the Rust core (T3.25); the legacy package `orderedjson` of `legacy/packages/go`, module `github.com/polyspec/ordered-json/packages/go`, stays in the checkout with its package tests until it is removed ([transition](../spec/json-contract.md#transition)). PHP uses the binding extension `polyspec_json` of the PIE package `polyspec/json`, namespace `Polyspec\Json` (T3.25-3). Python uses the binding `polyspec-json` and imports `polyspec.json`, a package under the namespace `polyspec`. The JavaScript, Go, PHP and Python columns are the generated bindings of `packages/rust/interface.json`; the packages `@polyspec/ordered-json`, `polyspec/ordered-json` and `polyspec-ordered-json` are their legacy forms, which keep their last release.

<a id="values"></a>
## Values and parsing

Parsed `Value` objects cannot be modified through the library API. Factories construct strings, number tokens, booleans, null, arrays, and objects. Factories validate constructed JSON through the library parser. Wrong-kind access returns absence or an error, depending on the accessor; a refused argument raises the host error class of its language and carries a kind of the shared [argument kinds](../spec/json-contract.md#argument-kinds), so that no error has an empty kind. Core parsers and serializers do not delegate JSON behavior to host JSON APIs.

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Text parsing | `parse(source, options)` | `parse(source.as_bytes(), &options)` | `Parse([]byte(source), ParseOptions{})` | `parse(source, maxDepth)` | `parse(source, max_depth=…, reject_duplicates=…)` |
| UTF-8 bytes | `parse(bytes, options)` | `parse(bytes, &options)` | `Parse(bytes, ParseOptions{})` | `parse($source, $maxDepth)` | `parse(data)` |
| Depth limit | `options.maxDepth` | `ParseOptions { max_depth }` | `ParseOptions{MaxDepth: &limit}` | `maxDepth` | `max_depth=` |
| Default output | `stringify(value)` | `stringify(&value, &options)` | `Stringify(value, StringifyOptions{})` | `stringify($value)` | `stringify(value)` |
| Compact output | `stringify(value)` | `value.to_string()` | `value.String()` | `(string) $value` | `str(value)` |
| Source inspection | `value.raw` | `value.raw()` | `value.Raw()` | `$value->raw()` | `value.raw` |
| Kind | `value.kind` | `value.kind()` | `value.Kind()` | `$value->kind()` | `value.kind` |

Every binding reports a parse error at its UTF-8 byte offset: Rust, Go, PHP, Python and JavaScript, whose `ParseError.offset` counts bytes for a string source and for a `Uint8Array` alike. JavaScript and Python take text or UTF-8 bytes in the one `parse`: a `string` or a `Uint8Array` in JavaScript, and a `str`, `bytes`, `bytearray` or `memoryview` in Python. Go takes UTF-8 bytes, a `[]byte`, in the one `Parse`. The Go `Value` zero value is invalid. Empty `OrderedMap` values are valid object inputs.

<a id="bindings"></a>
## Binding extensions

A binding may add an API that only its language needs. A binding extension uses the shared parser and serializer, leaves results and error offsets unchanged for inputs it accepts, and documents any additional rejection. It appears in this section instead of the shared operation tables. Its package runs its own tests with the native test runner of its language (`make test-<language>`); an API that no shared case can reach is verified only by those tests.

The Rust crate is the core of the [Rust core](../spec/json-contract.md#core) rules: `parse(source, &ParseOptions)` takes UTF-8 bytes with the options `max_depth` and `reject_duplicates`, which rejects a repeated decoded object key at any depth with `duplicate_object_key` at the first byte of the second key token, and `stringify(&value, &StringifyOptions)` takes `html_safe`. The JavaScript, Go, PHP and Python packages of this document are the bindings generated from `packages/rust/interface.json`.

Every error of the Rust crate is a variant of the exhaustive enum `Error`, so a caller matches every kind without a wildcard arm; `kind()` is the name of the kind of the shared lists, `message()` the Rust wording, and `offset()` the byte offset of a parse rejection, `None` for an argument error and for the depth failure of a constructor. Accessors and lookups of another kind fail with `wrong_kind`, `string_value()` of a string with an unpaired surrogate with `unpaired_surrogate`, code units above 65535 with `invalid_code_unit`, `Value::from_f64` of NaN or an infinity with `non_finite_number`, and `host_json()` always with `host_serialization_refused`. No error has an empty kind.

The Go binding takes the options of `Parse` as the record `ParseOptions`, whose fields are pointers that nil leaves to the core (change-parse-options): `Parse(source, ParseOptions{MaxDepth: &limit, RejectDuplicates: &reject})`. With `RejectDuplicates` true the parser rejects a repeated decoded object key at any depth with a `*ParseError` of the kind `duplicate_object_key` whose `Offset()` is the first byte of the second key token, including when escape sequences spell the same UTF-16 key. The default retains the shared duplicate-key behavior. `Stringify(value, StringifyOptions{HtmlSafe: &safe})` takes `HtmlSafe`. All other valid values, errors and offsets are unchanged.

Every error of the Go binding is a pointer to a type of the package `github.com/polyspec/json/packages/go/errors`, by category (change-errors), so no error has an empty kind: `*JSONValueError` and `*JSONTypeError` have the methods `Kind()`, the name of the kind, `Error()`, the wording of the binding, `Status()` and `Errno()`, and `*ParseError` wraps a `*JSONValueError` and has `Offset()`, a pointer to the byte offset of the rejection; a caller reads an error with `errors.As(err, &target)`. The package also declares the types of the other categories of the contract (`JSONIoError`, `JSONStoreError`, `JSONBusyError` and `JSONInternalError`). A parse rejection carries the name of the shared list, except `unescaped_lone_surrogate`, since `Parse` takes bytes, in which an unpaired surrogate is invalid UTF-8, and `RejectDuplicates` adds `duplicate_object_key`. A refused argument carries its kind: `non_string_key` for `OrderedMap.Insert` of a key of another kind than string, `wrong_kind` for `Members`, `Items`, `StringUnits`, `StringValue`, `NumberLiteral`, `BooleanValue`, `Get` and `GetUnits` of a value of another kind, `invalid_number_literal` for `ValueNumber`, `depth_limit_out_of_range` for a `MaxDepth` outside 0 through 256, `invalid_text` for `ValueString` of text that is not UTF-8, `invalid_code_unit` for a code unit above 65535, `unpaired_surrogate` for `StringValue` of a string with an unpaired surrogate, `non_finite_number` for `ValueFromFloat` of NaN or an infinity, `host_serialization_refused` for `MarshalJSON`, and `invalid_argument_type` for a nil or zero `Value` and a nil `OrderedMap` given to a function.

In JavaScript, Python and PHP every error of the library carries its kind, the same name as in Rust and Go, on the error classes of the binding by category (change-errors): a value error for `invalid_number_literal`, `depth_limit_out_of_range`, `invalid_code_unit`, `invalid_number`, `invalid_text` and `unpaired_surrogate`, and a type error for `non_string_key`, `wrong_kind`, `invalid_argument_type`, `host_serialization_refused` and `direct_construction`; a `ParseError` is a value error with the offset of the rejection. JavaScript has `JsonValueError`, a `RangeError`, `JsonTypeError`, a `TypeError`, and `ParseError`, a `JsonValueError` whose `offset` is a number or null; each error has the properties `kind`, `status` and `errno`. Python has `JSONValueError`, a `ValueError`, `JSONTypeError`, a `TypeError`, and `ParseError`, a `JSONValueError`, with the attributes `kind`, `offset`, `status` and `errno`. PHP has `Polyspec\Json\JsonValueError`, an `InvalidArgumentException`, `Polyspec\Json\JsonTypeError`, a `TypeError`, and `Polyspec\Json\ParseError`, a `JsonValueError`, with the methods `kind()`, `offset()`, `status()` and `errno()`. Each binding also declares the classes of the other categories of the contract, the I/O, store, busy and internal errors (`JsonIoError`, `JsonStoreError`, `JsonBusyError` and `JsonInternalError`, in Python `JSONIoError` and so on). A constructor of an error given a kind or a message outside the lists, and the `Value` constructor of JavaScript and Python, raise `direct_construction`.

The JavaScript binding accepts `rejectDuplicates: true` in the options of `parse(source, options)`, beside `maxDepth`. With that option the parser rejects a repeated decoded object key at any depth with a `ParseError` of the kind `duplicate_object_key` whose `offset` is the first byte of the second key token, including when escape sequences spell the same UTF-16 key. The default `false` retains the shared duplicate-key behavior. `stringify(value, options)` takes `htmlSafe`. All other valid values, errors and offsets are unchanged.

The PHP binding takes the rejection of duplicates as the option of `parse($source, $maxDepth, $rejectDuplicates)` (change-parse-options): `parse($source, MAX_DEPTH, true)` rejects a repeated decoded object key at any depth with a `Polyspec\Json\ParseError` of the kind `duplicate_object_key` whose `offset()` is the first byte of the second key token, including when escape sequences spell the same UTF-16 key. The default `false` retains the shared duplicate-key behavior. All other valid values, errors and offsets are unchanged.

The Python binding takes the options of `parse` as keyword arguments: `parse(source, max_depth=256, reject_duplicates=False)`. With `reject_duplicates=True` the parser rejects a repeated decoded object key at any depth with a `ParseError` of the kind `duplicate_object_key` at the first byte of the second key token, including when escape sequences spell the same UTF-16 key. `stringify(value, html_safe=False)` takes `html_safe`. All other valid values, errors and offsets are unchanged. The distribution ships the `py.typed` marker of PEP 561 in the package `polyspec.json`, so type checkers read its annotations.

String access returns a surrogate pair as one character. An escaped unpaired surrogate is never replaced: `string_units()` keeps it in every implementation, and the string value of Rust (`string_value()`), JavaScript (`stringValue()`), Go (`StringValue()`), PHP (`stringValue()`) and Python (`string_value()`) refuses such a string with `unpaired_surrogate` (change-string-value); `stringText()` of JavaScript and PHP, `StringText()` of Go and `string_text()` of Python return null, nil or `None` for it and the text otherwise. A literal unpaired surrogate of text input has no UTF-8 encoding: Rust, Go and PHP reject its WTF-8 bytes as `invalid UTF-8` before the grammar is read, and JavaScript and Python refuse a `string` or `str` source that holds one with `invalid_text`, as `Value.string` of a text with one does; such a string is made from its code units with `Value.fromUnits(units)` or `Value.from_units(units)`.

The standard JSON interface of each language is `Value.toJSON` of JavaScript, `Value::jsonSerialize` of PHP, `json.dumps` of Python, `Value.MarshalJSON` of Go and the Serde traits of Rust. JavaScript and PHP refuse a value, also when a native structure holds it, with a message that points to `stringify`; `MarshalJSON` of Go refuses it with an error of the kind `host_serialization_refused`, since `encoding/json` rewrites `<`, `>` and `&` in the text that a marshaler returns (change-host-hooks), and the Go binding declares no `UnmarshalJSON`; `json.dumps` of Python refuses a value with its own `TypeError`, since the binding declares no encoder class. Rust writes the compact contract bytes of a value, also inside a native structure.

The integration is the standard interface of the ecosystem, never an encoder of the library: Rust `Value` implements Serde `Serialize` and `Deserialize`, so `serde_json` encodes and decodes any native structure that holds values with their contract bytes. A native structure is otherwise encoded by the host library, whose rules are its own.

<a id="objects"></a>
## Associative objects

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Member map | `value.members()` | `value.members()` | `value.Members()` | `$value->members()` | `value.members()` |
| String-key lookup | `value.get(key)` | `value.get(key)` | `value.Get(key)` | `$value->get($key)` | `value.get(key)` |
| Code-unit lookup | `value.getUnits(units)` | `value.get_units(units)` | `value.GetUnits(units)` | `$value->getUnits($units)` | `value.get_units(units)` |
| Object construction | `Value.object(map)` | `Value::object(&members)` | `ValueObject(map)` | `Value::object($map)` | `Value.object(map)` |

JavaScript returns an `OrderedMap` from `value.members()`: `insert(key, value)` takes a string `Value` key and returns the replaced value or null, `get(key)` and `getUnits(units)` look a member up, `size` is the number of members, and the map iterates as `[Value, Value]` pairs in insertion order. `Value.object(map)` takes an `OrderedMap` alone, which `new OrderedMap()` makes empty.

Rust returns an immutable `OrderedMap` reference. `OrderedMap::insert(key, value)` accepts a string `Value` key and returns the replaced value when present. `iter()` returns key/value references in insertion order, and `len()` is a `u64`.

Go returns a new `OrderedMap` from `value.Members()` for each access. `NewOrderedMap()` makes an empty map, `Insert(key, value)` takes a string `Value` key and returns the replaced value or nil, `Get(key)` and `GetUnits(units)` return a value pointer or nil, `Size()` is the number of members, and `Entries()` gives the keys with their values in insertion order as an `iter.Seq2`. Every function of the Go binding returns an error as its last result. `Parse` copies its input.

PHP and Python return an `OrderedMap` whose keys and values are both `Value` objects, and object construction takes an `OrderedMap` alone: `insert(key, value)` takes a string `Value` key, so a key of another kind is refused with `non_string_key`, and `size()` is the number of members. The PHP map is an `IteratorAggregate`; iterating the Python map gives its keys, and `items()` its pairs. A missing key returns null in PHP and JavaScript, `None` in Rust and Python, and nil in Go.

<a id="scalars"></a>
## Arrays and scalars

| Operation | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| Array construction | `Value.array(items)` | `Value::array(items)` | `ValueArray(items)` | `Value::array($items)` | `Value.array(items)` |
| Array elements | `value.items()` | `value.items()` | `value.Items()` | `$value->items()` | `value.items()` |
| String construction | `Value.string(text)` | `Value::string(text)` | `ValueString(text)` | `Value::string($text)` | `Value.string(text)` |
| String access | `stringValue()` | `string_value()` | `StringValue()` | `stringValue()` | `string_value()` |
| UTF-16 access | `stringUnits()` | `string_units()` | `StringUnits()` | `stringUnits()` | `string_units()` |
| UTF-16 construction | `Value.fromUnits(units)` | `Value::from_units(&units)` | `ValueFromUnits(units)` | `Value::fromUnits($units)` | `Value.from_units(units)` |
| Number construction | `Value.number(token)` | `Value::number(token)` | `ValueNumber(token)` | `Value::number($token)` | `Value.number(token)` |
| Number access | `numberLiteral()` | `number_literal()` | `NumberLiteral()` | `numberLiteral()` | `number_literal()` |
| Boolean construction | `Value.boolean(flag)` | `Value::boolean(flag)` | `ValueBoolean(flag)` | `Value::boolean($flag)` | `Value.boolean(flag)` |
| Boolean access | `booleanValue()` | `boolean_value()` | `BooleanValue()` | `booleanValue()` | `boolean_value()` |
| Null construction | `Value.null()` | `Value::null()` | `ValueNull()` | `Value::null()` | `Value.null()` |

The kind names are `object`, `array`, `string`, `number`, `boolean` and `null` in every implementation. Rust has the enum `Kind`, Go the constants `KindObject` to `KindNull` of the string type `Kind`, Python the `StrEnum` `Kind` (`OBJECT` to `NULL`) and PHP the backed enum `Kind` with the cases `Object_`, `Array_`, `String_`, `Number`, `Boolean` and `Null_`; JavaScript has the type `Kind`, a union of the six strings with no runtime value. `value.kind` is a `Kind` in Rust and Go, the string in JavaScript and a member of `Kind` (which is its string) in Python, and `$value->kind()` is a case of the enum.

`Value.string` takes text: JavaScript and Python refuse a text with an unpaired surrogate with `invalid_text` ([RQ-026](../spec/json-contract.md#requirements)) and make such a string from its code units with `Value.fromUnits(units)` and `Value.from_units(units)`. Go takes and returns UTF-16 units as a `[]uint64` and Rust as a `Vec<u64>`, which the core checks against 65535; JavaScript, PHP and Python take integer code units and return them as an array or a list. `Value.fromFloat`, `ValueFromFloat`, `Value::fromFloat` and `Value.from_float` make a number from a finite host float. Array access returns immutable data or independent copies.

<a id="php"></a>
## PHP backends

The PHP package of json is the binding extension `polyspec_json` of the PIE package `polyspec/json`, built from the Rust core by the release as a pre-packaged binary for each PHP minor and platform (T3.25-3). Its public symbols are those of `packages/php-ext/generated/polyspec_json.stub.php`: the classes `Polyspec\Json\Value` and `Polyspec\Json\OrderedMap`, the enum `Polyspec\Json\Kind`, the error classes `Polyspec\Json\JsonValueError`, `Polyspec\Json\JsonTypeError` and `Polyspec\Json\ParseError` among them, the functions `Polyspec\Json\parse` and `Polyspec\Json\stringify` and the constant `Polyspec\Json\MAX_DEPTH`. json has no pure PHP library: the legacy packages `polyspec/ordered-json` and `polyspec/ordered-json-php-ext` keep their last release.

An error class is constructed with a message and a kind of its class; another kind raises `JsonTypeError` with the kind `invalid_argument_type`, and the `Value` constructor raises `direct_construction`.

A pre-packaged binary matches the PHP minor, platform and thread-safety configuration of its name. See [native installation](installation.md#native-php).
