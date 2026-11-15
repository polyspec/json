<!-- doc-id: contracts-readme -->
# Contracts

[한국어](README.ko.md)

[`core.json`](core.json) holds the cases of the Rust core and of the bindings in the case convention of binding (G-5).
A group named after a member of `packages/rust/interface.json` is linked in the `cases` of that contract. A group
`<member>.<corpus>` holds more cases of that member, and the Rust test of the core runs each as a case of the member:

- `.fixtures`: each file of [`fixtures/valid`](fixtures/valid) and [`fixtures/invalid`](fixtures/invalid) as a `source`
  (text, or `{"hex"}` for bytes that are no UTF-8 text or that start with a byte order mark); a valid input is also a case
  of `stringify`, whose text is the compact text of the independent reference (`scripts/reference.mts`).
- `.official`: each example of [`examples/official.json`](../examples/official.json) as a case of `stringify` with its
  compact text.
- `.arguments`: the cases of [`fixtures/arguments.json`](fixtures/arguments.json) that the plain groups do not hold.
- `.api`: the behaviours of the tests of the language packages under `legacy/`.
- `.parsed`: a case whose receiver or value is the instance value `{"new": "parse", ...}` of binding GN-13f.

`tests/scripts/case-corpus.test.mts` fails a fixture, an official example or an argument case without its case. Every
group is linked in the `cases` of the interface contract except the `.parsed` groups of a method: binding 0.0.8 refuses a
receiver made by `parse`, whose result type `json_value` it does not resolve to the class `value`, and a receiver made by
`value.get` or `value.get_units`, whose result is optional. The Rust test runs those groups until binding takes them.
[`fixtures/`](fixtures) also holds the shared cases of the verifier ([AGENTS.md](../AGENTS.md#implementations)).
