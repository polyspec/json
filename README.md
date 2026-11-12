<!-- doc-id: overview -->
# ordered-json

[한국어](README.ko.md)

JSON libraries for JavaScript, Rust, Go, PHP, and Python. Objects use associative maps that preserve document key order at every depth. Repeated keys retain the first position and the last value.

Standard JSON APIs do not provide one portable behavior for object ordering, duplicate keys, number token spelling, or object/array representation. These differences can change data when JSON moves between JavaScript, Rust, Go, PHP, the PHP extension, and Python. ordered-json defines one lossless value model and applies the same parser, serializer, ordering rules, and repeated-round-trip behavior to all six implementations. In particular, empty objects (`{}`) and empty arrays (`[]`) remain distinct.

This repository is the single source repository for the common specification, official examples, expected results, verifier, and all six implementation packages. The language directories are independent packages and build targets inside this repository; they share one revision without sharing language-specific APIs.

<a id="start"></a>
## Start

~~~sh
git clone https://github.com/polyspec/ordered-json.git
cd ordered-json
~~~

Run JavaScript with an official input from the repository root:

~~~sh
node --input-type=module <<'JS'
import {readFileSync} from 'node:fs';
import {parse, stringify} from './legacy/packages/js/index.js';
const {cases} = JSON.parse(readFileSync('examples/official.json', 'utf8'));
const example = cases.find(example => example.id === 'document-order');
console.log(stringify(parse(example.input)));
JS
~~~

Python runs the same example from `legacy/packages/python/src` without installation:

~~~sh
PYTHONPATH=legacy/packages/python/src python3 - <<'PY'
import json
from polyspec.ordered_json import parse, stringify
with open('examples/official.json', encoding='utf8') as f:
    cases = json.load(f)['cases']
example = next(example for example in cases if example['id'] == 'document-order')
print(stringify(parse(example['input'])))
PY
~~~

Install the Python package from the wheel asset of a release, with pip ([installation](docs/operations/installation.md)). The releases are listed on the Releases page of the repository, and `X.Y.Z` stands for the version of the release:

~~~sh
pip install "https://github.com/polyspec/ordered-json/releases/download/vX.Y.Z/polyspec_ordered_json-X.Y.Z-py3-none-any.whl"
~~~

| Package | Contents | Path |
| --- | --- | --- |
| JavaScript | JavaScript and TypeScript declarations | `legacy/packages/js/` |
| Rust | Rust crate | `packages/rust/` |
| Go | Go package | `legacy/packages/go/` |
| PHP | Pure PHP and the Value API | `legacy/packages/php/` |
| PHP extension | Native PHP extension with PIE metadata | `legacy/packages/php-ext/` |
| Python | Python package `polyspec-ordered-json`, import `polyspec.ordered_json` | `legacy/packages/python/` |

<a id="verification"></a>
## Verification

All implementations use the same [official examples](examples/README.md) and shared expectations. Each implementation package provides its own build target, and the root `make check` verifies all six packages in the current checkout.

~~~sh
make check
~~~

The aggregate record applies to the common revision and all package sources in that checkout. See [installation](docs/operations/installation.md) for tools and identifiers, and [verification](docs/operations/validation.md) for supplementary and PIE checks. Tests and package publication are recorded separately.

<a id="documents"></a>
## Documents

- [JSON contract](docs/spec/json-contract.md)
- [API contract](docs/operations/api.md)
- [Repository contract](docs/operations/repositories.md)
- [Feature state](docs/features.md)
- [Distribution state](docs/operations/distribution.md)
- [Changelog](CHANGELOG.md)
- [Documentation management](docs/operations/documentation-plan.md)
- [Development procedure](AGENTS.md)
