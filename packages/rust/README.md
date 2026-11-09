<!-- doc-id: rust-overview -->
# ordered-json for Rust

[한국어](README.ko.md)

Strict JSON with associative objects that preserve document key order recursively. Repeated keys retain the first position and the last value. Official inputs and expected results are maintained in the monorepo examples.

<a id="usage"></a>
## Usage

Rust >= 1.71; Cargo package `polyspec-ordered-json`, import `polyspec_ordered_json`.

The usage fragment takes `source` (or `$source`) from an object case in the [common official examples](https://github.com/polyspec/ordered-json/blob/main/examples/official.json). Use the fragment inside a function that can return an error. Every error is an `Error` whose `kind()` is the exhaustive enum `ErrorKind`, named as the [API contract](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.md#bindings) states.

~~~rust
use polyspec_ordered_json::{parse, stringify};
let value = parse(source)?;
let output = stringify(&value);
~~~

Typed values use `polyspec_ordered_json::serde::{to_string, from_str, from_slice}` with Serde
`Serialize` and owned `Deserialize`. Struct fields retain declaration order. Duplicate keys,
unknown fields, type errors and non-finite numbers fail. Embedded `Value` fields preserve
object order and number tokens.


The [JSON contract](https://github.com/polyspec/ordered-json/blob/main/docs/spec/json-contract.md) and [API contract](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.md) define behavior. Source is provided by this repository. The Cargo package is not configured for registry publication. Registry publication and versioned releases are not verified; a source version string is not a release record.

<a id="verification"></a>
## Verification

Install Git, make, any Node.js to start the bootstrap and this implementation's runtime/build tools, then run `make install-tools TOOLS=npm`, `make install-packages` and `make install`, which install Node.js, Python, Go and the other tools of `mise.toml` into `var/tools` at the digests of `mise.lock`. Run from this checkout:

~~~sh
make check
~~~

The command invokes the root verifier against this package. The root aggregate check tests all packages from the same source revision and writes the current result to `var/records/verification.json`, the record of that run.

Use `make check JSON_TEST_SUITE=/path/to/JSONTestSuite` for supplementary cases. [Development procedure](../../AGENTS.md#package-rust) and [changelog](../../CHANGELOG.md) describe required checks and changes.
