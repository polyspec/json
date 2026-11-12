<!-- doc-id: python-overview -->
# ordered-json for Python

[한국어](README.ko.md)

Strict JSON with associative objects that preserve document key order recursively. Repeated keys retain the first position and the last value. Official inputs and expected results are maintained in the monorepo examples.

<a id="usage"></a>
## Usage

Python >= 3.14. The package is `polyspec-ordered-json` under the import name `polyspec.ordered_json`, installed from the wheel asset of a release, where `X.Y.Z` is the version of the release:

~~~sh
pip install "https://github.com/polyspec/ordered-json/releases/download/vX.Y.Z/polyspec_ordered_json-X.Y.Z-py3-none-any.whl"
~~~

The usage fragment takes `source` from an object case in the [common official examples](https://github.com/polyspec/ordered-json/blob/main/examples/official.json). Parse errors report UTF-8 byte offsets; `Value.string_value()` returns a surrogate pair as one character and an unpaired surrogate as its own character, like the JavaScript binding.

~~~python
from polyspec.ordered_json import parse, stringify

value = parse(source)
output = stringify(value)
~~~

`parse(source, ParseOptions(reject_duplicates=True))` rejects a repeated decoded object key at any depth with `ParseError` of kind `duplicate_object_key` at the first byte of the second key token, instead of keeping the last value.

The [JSON contract](https://github.com/polyspec/ordered-json/blob/main/docs/spec/json-contract.md) and [API contract](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.md) define behavior. Source is provided by this repository. Registry publication and versioned releases are not verified; a source version string is not a release record.

<a id="verification"></a>
## Verification

Install Git, make and any Node.js to start the bootstrap, then run `make install-tools TOOLS=npm`, `make install-packages` and `make install`, which install Node.js, Python, Go and the other tools of `mise.toml` into `var/tools` at the digests of `mise.lock`. Run from this checkout:

~~~sh
make check
~~~

The command invokes the root verifier against this package. The root aggregate check tests all packages from the same source revision and writes the current result to `var/records/verification.json`, the record of that run.

Use `make check JSON_TEST_SUITE=/path/to/JSONTestSuite` for supplementary cases. [Development procedure](../../../AGENTS.md#package-python) and [changelog](../../../CHANGELOG.md) describe required checks and changes.
