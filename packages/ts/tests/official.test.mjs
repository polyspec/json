// Requirements: RQ-022.
// The official examples of examples/official.json, run by node:test against the binding @polyspec/json: each case is a
// top-level test named by its id. A case parses its input and compares the source text, the compact serialization and the
// value tree with the expected results, then the tree of the reparsed serialization and of the value rebuilt through the
// factories (docs/spec/json-contract.md#acceptance). The test of the legacy package with no change beyond change-accessors,
// change-ordered-map and change-string-value (T3.25-1).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {OrderedMap, Value, parse, stringify} from '@polyspec/json';

const official = JSON.parse(readFileSync(new URL('../../../examples/official.json', import.meta.url), 'utf8'));

// change-accessors: members(), items() and the accessors of a scalar are methods, and the keys are values.
// change-string-value: a string with an unpaired surrogate has no Unicode text, so the tree reads its code units.
const units = value => String.fromCharCode(...value.stringUnits());

function tree(value) {
  switch (value.kind) {
    case 'object': return ['object', Array.from(value.members(), ([key, member]) => [units(key), tree(member)])];
    case 'array': return ['array', value.items().map(tree)];
    case 'string': return ['string', units(value)];
    case 'number': return ['number', value.numberLiteral()];
    case 'boolean': return ['boolean', value.booleanValue()];
    default: return ['null'];
  }
}

// Inserts the keys in their first order, then sets the values in reverse order (change-ordered-map: an object takes an
// OrderedMap, whose insert of a present key keeps its position and sets its value).
function rebuild(value) {
  if (value.kind === 'object') {
    const keys = Array.from(value.members(), ([key]) => key);
    const members = new OrderedMap();
    for (const key of keys) members.insert(key, Value.null());
    for (const key of keys.toReversed()) members.insert(key, rebuild(value.getUnits(key.stringUnits())));
    return Value.object(members);
  }
  if (value.kind === 'array') return Value.array(value.items().map(rebuild));
  return value;
}

for (const example of official.cases) {
  test(example.id, () => {
    const value = parse(example.source);
    assert.equal(value.raw, example.source);
    assert.equal(stringify(value), example.compact);
    assert.deepEqual(tree(value), example.tree);
    assert.deepEqual(tree(parse(stringify(value))), example.tree);
    assert.deepEqual(tree(parse(stringify(rebuild(value)))), example.tree);
  });
}
