// Adapter only: all examples and expected results live in examples/official.json. The probe of the shared verifier for the
// binding @polyspec/json (scripts/registry.mts), the probe of the legacy package with no change beyond the changes of
// packages/rust/interface.json, each named where it applies (T3.25-1).
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {OrderedMap, ParseError, Value, parse, stringify} from '@polyspec/json';

// change-string-value: a string with an unpaired surrogate has no Unicode text, so the tree reads its code units.
const units = v => String.fromCharCode(...v.stringUnits());

// change-accessors: members(), items() and the accessors of a scalar are methods, and the keys are values.
function tree(v) {
  switch (v.kind) {
    case 'object': return ['object', Array.from(v.members(), ([key, value]) => [units(key), tree(value)])];
    case 'array': return ['array', v.items().map(tree)];
    case 'string': return ['string', units(v)];
    case 'number': return ['number', v.numberLiteral()];
    case 'boolean': return ['boolean', v.booleanValue()];
    default: return ['null'];
  }
}
// change-ordered-map: an object takes an OrderedMap, whose insert of a present key keeps its position and sets its value.
function rebuild(v) {
  if (v.kind === 'object') {
    const keys = Array.from(v.members(), ([key]) => key);
    const members = new OrderedMap();
    for (const key of keys) members.insert(key, Value.null());
    for (const key of keys.toReversed()) members.insert(key, rebuild(v.getUnits(key.stringUnits())));
    return Value.object(members);
  }
  if (v.kind === 'array') return Value.array(v.items().map(rebuild));
  return v;
}
// The calls of an argument request {"call": call, "argument": argument} of the shared verifier.
const calls = {
  number: argument => Value.number(argument.stringValue()),
  max_depth: argument => parse('1', {maxDepth: Number(argument.numberLiteral())}),
  string_value: argument => argument.stringValue(),
  object_key: argument => new OrderedMap().insert(argument, Value.null()),
};
function call(line) {
  const request = parse(line);
  try {
    calls[request.get('call').stringValue()](request.get('argument'));
    return {ok: true};
  } catch (error) {
    if (typeof error.kind !== 'string') throw error;
    return {ok: false, kind: error.kind};
  }
}
for await (const path of createInterface({input: process.stdin, crlfDelay: Infinity})) {
  if (path.startsWith('{')) { console.log(JSON.stringify(call(path))); continue; }
  const bytes = new Uint8Array(readFileSync(path));
  let value;
  // change-parse-source: parse takes the bytes; change-offsets: every offset counts bytes.
  try { value = parse(bytes); }
  catch (error) {
    if (!(error instanceof ParseError)) throw error;
    console.log(JSON.stringify({ok: false, offset: error.offset, unit: 'byte', kind: error.kind})); continue;
  }
  const serialized = stringify(value);
  const roundtrip = parse(new TextEncoder().encode(serialized));
  const factory = stringify(Value.string('quote " slash \\ line\n 한 🌍'));
  console.log(JSON.stringify({ok:true, raw:value.raw, serialized, compact:stringify(value),
    tree:tree(value), roundtrip:stringify(roundtrip), roundtrip_tree:tree(roundtrip),
    rebuilt:stringify(rebuild(value)), factory}));
}
