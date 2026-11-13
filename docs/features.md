<!-- doc-id: features -->
# Feature state

[한국어](features.ko.md)

<a id="state"></a>
## Current implementation

| ID | Feature | Implementation | Verification | Evidence | Distribution | Specification |
| --- | --- | --- | --- | --- | --- | --- |
| F-ORDER | Recursive associative objects; first key position, last value | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [objects](spec/json-contract.md#objects) |
| F-ARRAY | Array order and object/array distinction | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [arrays](spec/json-contract.md#arrays) |
| F-PARSE | JSON grammar, UTF-8 validation, default nesting limit | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [parsing](spec/json-contract.md#parsing) |
| F-NUMBER | Exact number tokens | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [numbers](spec/json-contract.md#numbers) |
| F-STRING | Decoded strings and escaped surrogate code units | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [strings](spec/json-contract.md#strings) |
| F-OUTPUT | Associative serialization and source inspection | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [serialization](spec/json-contract.md#serialization) |
| F-IDEMPOTENT | Repeated parse and serialization preserve the same type tree and output | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [serialization](spec/json-contract.md#serialization) |
| F-CONSTRUCT | Construction from ordered maps and arrays of Value objects | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [construction](spec/json-contract.md#construction) |
| F-RUST-SERDE | Native Serde serialization and deserialization of Rust Value | implemented | package-tests | [result](operations/validation.md#records) | source-only | [binding](operations/api.md#bindings) |
| F-STRICT-KEYS | Parsing that rejects repeated decoded object keys in every implementation | implemented | package-tests | [result](operations/validation.md#records) | source-only | [binding](operations/api.md#bindings) |
| F-PHP-NATIVE | PHP extension parser and serializer with the shared PHP API and validated ParseError messages | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [PHP](operations/api.md#php) |
| F-DOCS | Bilingual documents, link/status checks, verification freshness | implemented | docs-tests | [result](operations/validation.md#records) | source-only | [procedure](operations/documentation-plan.md#checks) |
| F-REPOS | Single repository with independently buildable implementation packages and shared conformance | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [repositories](operations/repositories.md) |
| F-BINDINGS | Bindings of PHP, Python, Node, Go and WASM that binding generates from the Rust core; the core and its cases pass, and binding generates no target yet | partial | not-verified | [T3.2](plans/execution/checklist.md) | source-only | [core](spec/json-contract.md#core) |
| F-BENCHMARK | Repository-contained reproducible benchmark protocol and committed results | implemented | not-verified | [remeasurement conditions](plans/kit-standard/plan.md#prerelease-reconsideration) | source-only | [benchmarks](../benchmarks/README.md) |

<a id="limits"></a>
## Verification and distribution limits

The previous native macOS and PIE records are not current evidence. A new PIE record will be created only after a local PHAR is available and `make pie-check` passes.

Passing shared cases establishes their recorded acceptance criteria. It does not establish exhaustive input coverage, all declared minimum runtimes, all platforms, or every host encoder integration. See [verification limits](operations/validation.md#limits). Source metadata contains development version strings. A row marked `published` names the release tag and the asset of its GitHub release; `make evidence-check` checks that form.

The committed benchmark timings are retained for historical comparison. They are not claimed as current verification evidence until T2.48 has a reliable idle-machine remeasurement.
