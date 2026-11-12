<!-- doc-id: contracts-readme -->
# Contracts

[한국어](README.ko.md)

[`core.json`](core.json) holds the cases of the Rust core and of the bindings: each group named after a member of
`packages/rust/interface.json` is linked in the `cases` of that contract and follows the case convention of binding
(G-5). A group whose name ends in `.parsed` is a rule corpus that only the Rust test of the core reads: its value comes
from the JSON text `json`, and it is not linked in the `cases` of the interface contract. [`fixtures/`](fixtures)
holds the shared cases of the verifier ([AGENTS.md](../AGENTS.md#implementations)).
