// Requirements: RQ-022.
// The official examples of examples/official.json, run by node:test: each case is a top-level test named by its id.
// A case parses its input and compares the source text, the compact
// serialization and the value tree with the expected results, then the tree of the reparsed serialization and of the
// value rebuilt through the factories (docs/spec/json-contract.md#acceptance).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {Value, parse, stringify} from '../index.js';

const official = JSON.parse(readFileSync(new URL('../../../examples/official.json', import.meta.url), 'utf8'));

function tree(value) {
  switch (value.kind) {
    case 'object': return ['object', Array.from(value.members, ([key, member]) => [key, tree(member)])];
    case 'array': return ['array', value.items.map(tree)];
    case 'string': return ['string', value.stringValue()];
    case 'number': return ['number', value.numberLiteral()];
    case 'boolean': return ['boolean', value.booleanValue()];
    default: return ['null'];
  }
}

// Inserts the keys in their first order, then sets the values in reverse order.
function rebuild(value) {
  if (value.kind === 'object') return Value.object([
    ...value.keys.map(key => [key, Value.null()]),
    ...value.keys.toReversed().map(key => [key, rebuild(value.get(key.stringValue()))]),
  ]);
  if (value.kind === 'array') return Value.array(value.items.map(rebuild));
  return value;
}

for (const example of official.cases) {
  test(example.id, () => {
    const value = parse(example.input);
    assert.equal(value.raw, example.input);
    assert.equal(stringify(value), example.compact);
    assert.deepEqual(tree(value), example.tree);
    assert.deepEqual(tree(parse(stringify(value))), example.tree);
    assert.deepEqual(tree(parse(stringify(rebuild(value)))), example.tree);
  });
}
