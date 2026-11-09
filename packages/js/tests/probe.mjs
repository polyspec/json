// Adapter only: all examples and expected results live in examples/official.json.
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {parse, parseBytes, stringify, Value, ParseError} from '../index.js';

function tree(v) {
  switch (v.kind) {
    case 'object': return ['object', Array.from(v.members, ([key, value]) => [key, tree(value)])];
    case 'array': return ['array', v.items.map(tree)];
    case 'string': return ['string', v.stringValue()];
    case 'number': return ['number', v.numberLiteral()];
    case 'boolean': return ['boolean', v.booleanValue()];
    default: return ['null'];
  }
}
function rebuild(v) {
  if (v.kind === 'object') return Value.object([
    ...v.keys.map(key => [key, Value.null()]),
    ...v.keys.toReversed().map(key => [key, rebuild(v.get(key.stringValue()))]),
  ]);
  if (v.kind === 'array') return Value.array(v.items.map(rebuild));
  return v;
}
// The calls of an argument request {"call": call, "argument": argument} of the shared verifier.
const calls = {
  number: argument => Value.number(argument.stringValue()),
  max_depth: argument => parse('1', {maxDepth: Number(argument.numberLiteral())}),
  string_value: argument => argument.stringValue(),
  object_key: argument => Value.object([[argument, Value.null()]]),
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
  const bytes = readFileSync(path);
  let value;
  try { value = parseBytes(bytes); }
  catch (error) {
    if (!(error instanceof ParseError)) throw error;
    console.log(JSON.stringify({ok: false, offset: error.offset, unit: error.unit, kind: error.kind})); continue;
  }
  const serialized = stringify(value);
  const roundtrip = parseBytes(new TextEncoder().encode(serialized));
  const factory = stringify(Value.string('quote " slash \\ line\n 한 🌍'));
  console.log(JSON.stringify({ok:true, raw:value.raw, serialized, compact:stringify(value),
    tree:tree(value), roundtrip:stringify(roundtrip), roundtrip_tree:tree(roundtrip),
    rebuilt:stringify(rebuild(value)), factory}));
}
