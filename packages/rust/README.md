<!-- doc-id: rust-overview -->
# json for Rust

[한국어](README.ko.md)

Strict JSON with associative objects that preserve document key order recursively. Repeated keys retain the first position and the last value. Official inputs and expected results are maintained in the monorepo examples.

<a id="usage"></a>
## Usage

Rust 1.99.0, the pinned toolchain of the repository; Cargo package `polyspec-json`, import `polyspec_json`. The crate is the Rust core of the [JSON contract](https://github.com/polyspec/json/blob/main/docs/spec/json-contract.md#core), and the package includes `interface.json`, the interface contract of the bindings that bindgen generates from it.

The usage fragment takes `source` (or `$source`) from an object case in the [common official examples](https://github.com/polyspec/json/blob/main/examples/official.json). Use the fragment inside a function that can return an error. Every error is a variant of the exhaustive enum `Error`; `kind()` is the name of its kind of the shared lists and `offset()` the byte offset of a parse rejection. Accessors of another kind fail with `wrong_kind`, `string_value()` of a string with an unpaired surrogate fails with `unpaired_surrogate`, and `string_units()` returns the UTF-16 code units of every string.

~~~rust
use polyspec_json::{parse, stringify, ParseOptions, StringifyOptions};
let value = parse(source.as_bytes(), &ParseOptions::default())?;
let output = stringify(&value, &StringifyOptions::default());
let html = stringify(&value, &StringifyOptions { html_safe: Some(true) });
~~~

`Value` implements Serde `Serialize` and `Deserialize`: `Serialize` writes the compact bytes of the value and
`Deserialize` parses the raw JSON text of a field with the library parser, so `serde_json` encodes and decodes a native
structure that holds `Value` fields with their object order and number tokens. The crate has no typed encoder of its
own; the rest of the structure follows the rules of `serde_json`.

`Value::from_f64` and `number_text` write a float as ECMAScript `Number::toString` writes it and refuse NaN and the infinities with `non_finite_number`; `Value::string` writes its text as UTF-8 with the escapes that RFC 8259 requires.


The [JSON contract](https://github.com/polyspec/json/blob/main/docs/spec/json-contract.md) and [API contract](https://github.com/polyspec/json/blob/main/docs/operations/api.md) define behavior. Source is provided by this repository. The Cargo package is not configured for registry publication. Registry publication and versioned releases are not verified; a source version string is not a release record.

<a id="verification"></a>
## Verification

Install Git, make, any Node.js to start the bootstrap and this implementation's runtime/build tools, then run `make install-tools TOOLS=npm`, `make install-packages` and `make install`, which install Node.js, Python, Go and the other tools of `mise.toml` into `var/tools` at the digests of `mise.lock`. Run from this checkout:

~~~sh
make check
~~~

The command invokes the root verifier against this package. The root aggregate check tests all packages from the same source revision and writes the current result to `var/records/verification.json`, the record of that run.

Use `make check JSON_TEST_SUITE=/path/to/JSONTestSuite` for supplementary cases. [Development procedure](../../AGENTS.md#package-rust) and [changelog](../../CHANGELOG.md) describe required checks and changes.
