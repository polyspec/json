// Requirements: RQ-005, RQ-025. Every error that the package throws names its kind on `kind`: a ParseError the rejection
// kinds of the JSON contract, a TypeError or RangeError the argument kinds. Each kind has an accepting and a refusing site.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {ParseError, Value, parse, parseBytes, stringify} from '../index.js';

/** The kinds of the list of the section of `anchor` in the JSON contract, each with the text of its item. */
function listed(anchor) {
  const spec = readFileSync(new URL('../../../../docs/spec/json-contract.md', import.meta.url), 'utf8');
  const section = spec.split(anchor)[1].split('\n<a id=')[0];
  return new Map([...section.matchAll(/^- `([a-z0-9_]+)`(.*)$/gm)].map(([, name, text]) => [name, text]));
}

/** The error that `run` throws, which must be an instance of `type`. */
function thrown(run, type) {
  try { run(); } catch (error) {
    assert.ok(error instanceof type, `${error} is no ${type.name}`);
    return error;
  }
  assert.fail(`${run} threw nothing`);
}

const cases = [
  // [kind, error class, accepting site, refusing site]
  ['expected_value', ParseError, () => parse('[1]'), () => parse('[1,]')],
  ['expected_digit', ParseError, () => parse('1.5'), () => parse('1.')],
  ['expected_colon', ParseError, () => parse('{"a":1}'), () => parse('{"a" 1}')],
  ['expected_delimiter', ParseError, () => parse('[1,2]'), () => parse('[1 2]')],
  ['expected_object_key', ParseError, () => parse('{"a":1}'), () => parse('{1:2}')],
  ['invalid_escape', ParseError, () => parse('"\\n"'), () => parse('"\\x"')],
  ['invalid_unicode_escape', ParseError, () => parse('"\\u0041"'), () => parse('"\\u00g1"')],
  ['unfinished_escape', ParseError, () => parse('"\\\\"'), () => parse('"\\')],
  ['unterminated_string', ParseError, () => parse('"a"'), () => parse('"a')],
  ['unescaped_control_character', ParseError, () => parse('"a\\tb"'), () => parse('"a\tb"')],
  ['unescaped_lone_surrogate', ParseError, () => parse('"\\ud800"'), () => parse('"\ud800"')],
  ['invalid_utf8', ParseError, () => parseBytes(new TextEncoder().encode('"한"')), () => parseBytes(new Uint8Array([0x22, 0xff, 0x22]))],
  ['maximum_depth_exceeded', ParseError, () => parse('[[]]', {maxDepth: 2}), () => parse('[[]]', {maxDepth: 1})],
  ['trailing_input', ParseError, () => parse('[1] '), () => parse('[1] x')],
  ['duplicate_object_key', ParseError, () => parse('{"a":1,"b":2}', {rejectDuplicates: true}), () => parse('{"a":1,"a":2}', {rejectDuplicates: true})],
  ['non_string_key', TypeError, () => Value.object([['a', Value.null()]]), () => Value.object([[Value.number('1'), Value.null()]])],
  ['wrong_kind', TypeError, () => parse('"x"').stringValue(), () => parse('1').stringValue()],
  ['invalid_number_literal', TypeError, () => Value.number('-0.5e3'), () => Value.number(' 1')],
  ['depth_limit_out_of_range', RangeError, () => parse('1', {maxDepth: 256}), () => parse('1', {maxDepth: 257})],
  ['invalid_argument_type', TypeError, () => Value.string('a'), () => Value.string(1)],
  ['host_serialization_refused', TypeError, () => stringify(parse('1')), () => JSON.stringify(parse('1'))],
  ['direct_construction', TypeError, () => new ParseError('Expected JSON value', 0), () => new Value()],
];

test('every kind has an accepting and a refusing site', () => {
  for (const [kind, type, accept, refuse] of cases) {
    accept();
    assert.equal(thrown(refuse, type).kind, kind, kind);
  }
});

test('the kinds are the shared lists, and a kind that cannot arise in JavaScript is stated so', () => {
  const lists = new Map([...listed('<a id="rejection-kinds"></a>'), ...listed('<a id="argument-kinds"></a>')]);
  const named = new Set(cases.map(([kind]) => kind));
  for (const [name, text] of lists) {
    if (!named.has(name)) assert.match(text, /cannot arise in[^.]*JavaScript/, `${name} has no case and no statement for JavaScript`);
  }
  for (const kind of named) assert.ok(lists.has(kind) || kind === 'duplicate_object_key', kind);
});

test('every refused argument carries its kind', () => {
  const kind = (run, type = TypeError) => thrown(run, type).kind;
  for (const literal of ['[]', '"1"', 'true', 'null', '1 ', '\n1']) assert.equal(kind(() => Value.number(literal)), 'invalid_number_literal', literal);
  assert.equal(kind(() => Value.number('x'), ParseError), 'expected_value');
  for (const literal of [1, null, undefined]) assert.equal(kind(() => Value.number(literal)), 'invalid_argument_type');
  const object = parse('{}');
  for (const read of [() => object.items, () => parse('[]').members, () => parse('[]').keys, () => object.stringValue(),
    () => object.stringUnits(), () => object.numberLiteral(), () => object.booleanValue(), () => parse('[]').get('a')]) {
    assert.equal(kind(read), 'wrong_kind', String(read));
  }
  for (const key of [1, null, Value.null(), parse('[]'), parse('{}'), true]) {
    assert.equal(kind(() => Value.object([[key, Value.null()]])), 'non_string_key', String(key));
  }
  for (const key of [1, null, undefined]) assert.equal(kind(() => object.get(key)), 'non_string_key');
  for (const maxDepth of [-1, 257, 1.5, '1', null, NaN]) assert.equal(kind(() => parse('1', {maxDepth}), RangeError), 'depth_limit_out_of_range', String(maxDepth));
  for (const run of [() => parse(1), () => parse('1', null), () => parse('1', 'options'), () => parse('1', {rejectDuplicates: 1}),
    () => parseBytes([1]), () => Value.string(null), () => Value.boolean('true'), () => Value.array(null), () => Value.array([1]),
    () => Value.object(null), () => Value.object([['a', 1]]), () => Value.object([1]), () => Value.object([['a']]), () => stringify({})]) {
    assert.equal(kind(run), 'invalid_argument_type', String(run));
  }
  assert.equal(kind(() => JSON.stringify({nested: [parse('1')]})), 'host_serialization_refused');
  for (const message of ['Not a message', '']) assert.equal(kind(() => new ParseError(message, 0)), 'direct_construction', message);
  assert.equal(new ParseError('Expected integer', 4).kind, 'expected_digit');
});
