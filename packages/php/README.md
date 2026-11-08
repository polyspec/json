<!-- doc-id: php-overview -->
# ordered-json for PHP

[한국어](README.ko.md)

Strict JSON with associative objects that preserve document key order recursively. Repeated keys retain the first position and the last value. Official inputs and expected results are maintained in the monorepo examples.

<a id="usage"></a>
## Usage

PHP >= 8.4 with JSON and PCRE; Composer package `polyspec/ordered-json`, whose classes Composer loads by PSR-4 and whose functions by `files`.

The usage fragment takes `source` (or `$source`) from an object case in the [common official examples](https://github.com/polyspec/ordered-json/blob/main/examples/official.json).

~~~php
require 'vendor/autoload.php';
$value = Polyspec\OrderedJson\parse($source);
$output = Polyspec\OrderedJson\stringify($value);
~~~


The [native extension](https://github.com/polyspec/ordered-json/tree/main/packages/php-ext) is a separate optional package. Pure PHP needs no extension checkout. `parse()` uses the extension when it is loaded and the pure PHP implementation otherwise. The tests run with PHPUnit, once without the extension (`make test-php`) and once with it (`make test-php-ext`).

`Polyspec\OrderedJson\Value::parseRejectDuplicates($source)` rejects a repeated decoded object key at any depth with `Polyspec\OrderedJson\ParseError` of kind `duplicate_object_key` instead of keeping the last value. It parses with the pure PHP parser even when the extension is loaded.

The [JSON contract](https://github.com/polyspec/ordered-json/blob/main/docs/spec/json-contract.md) and [API contract](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.md) define behavior. Source is provided by this repository. Registry publication and versioned releases are not verified; a source version string is not a release record.

<a id="verification"></a>
## Verification

Install Git, make, any Node.js to start the bootstrap and this implementation's runtime/build tools, then run `make install-tools TOOLS=npm`, `make install-packages` and `make install`, which install Node.js, Python, Go and the other tools of `mise.toml` into `var/tools` at the digests of `mise.lock`. Run from this checkout:

~~~sh
make check
~~~

The command invokes the root verifier against this package. The root aggregate check tests all packages from the same source revision and writes the current result to `var/records/verification.json`, the record of that run.

Use `make check JSON_TEST_SUITE=/path/to/JSONTestSuite` for supplementary cases. [Development procedure](../../AGENTS.md#package-php) and [changelog](../../CHANGELOG.md) describe required checks and changes.
