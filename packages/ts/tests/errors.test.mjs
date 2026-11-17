// Requirements: RQ-005, RQ-025. Every error that the binding @polyspec/json throws names its kind on `kind`: a ParseError the
// rejection kinds of the JSON contract, a JsonTypeError or JsonValueError the argument kinds (change-errors). Each kind has an
// accepting and a refusing site. The test of the legacy package with no change beyond the changes of
// packages/rust/interface.json, each named where it applies (T3.25-1); the test of the kinds that cannot arise in JavaScript
// is tests/scripts/kinds.test.mts, one test for every binding (T3.64).
import assert from 'node:assert/strict';
import test from 'node:test';
import {JsonTypeError, JsonValueError, OrderedMap, ParseError, Value, parse, stringify} from '@polyspec/json';

/** The error that `run` throws, which must be an instance of `type`. */
function thrown(run, type) {
  try { run(); } catch (error) {
    assert.ok(error instanceof type, `${error} is no ${type.name}`);
    return error;
  }
  assert.fail(`${run} threw nothing`);
}

/** An insert of `key` into a new OrderedMap (change-ordered-map: an object takes an OrderedMap whose keys are values). */
const insert = (key, value = Value.null()) => new OrderedMap().insert(key, value);

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
  // change-offsets: a text with an unpaired surrogate has no UTF-8 encoding, and the binding refuses it (B-3) instead of the
  // core kind unescaped_lone_surrogate.
  ['invalid_text', JsonValueError, () => parse('"\\ud800"'), () => parse('"\ud800"')],
  // change-parse-source: the bytes are a Uint8Array given to parse.
  ['invalid_utf8', ParseError, () => parse(new TextEncoder().encode('"한"')), () => parse(new Uint8Array([0x22, 0xff, 0x22]))],
  ['maximum_depth_exceeded', ParseError, () => parse('[[]]', {maxDepth: 2}), () => parse('[[]]', {maxDepth: 1})],
  ['trailing_input', ParseError, () => parse('[1] '), () => parse('[1] x')],
  ['duplicate_object_key', ParseError, () => parse('{"a":1,"b":2}', {rejectDuplicates: true}), () => parse('{"a":1,"a":2}', {rejectDuplicates: true})],
  ['non_string_key', JsonTypeError, () => insert(Value.string('a')), () => insert(Value.number('1'))],
  ['wrong_kind', JsonTypeError, () => parse('"x"').stringValue(), () => parse('1').stringValue()],
  ['invalid_number_literal', JsonValueError, () => Value.number('-0.5e3'), () => Value.number(' 1')],
  ['depth_limit_out_of_range', JsonValueError, () => parse('1', {maxDepth: 256}), () => parse('1', {maxDepth: 257})],
  ['invalid_argument_type', JsonTypeError, () => Value.string('a'), () => Value.string(1)],
  ['host_serialization_refused', JsonTypeError, () => stringify(parse('1')), () => JSON.stringify(parse('1'))],
  ['direct_construction', JsonTypeError, () => Value.null(), () => new Value()],
];

test('every kind has an accepting and a refusing site', () => {
  for (const [kind, type, accept, refuse] of cases) {
    accept();
    assert.equal(thrown(refuse, type).kind, kind, kind);
  }
});

test('every refused argument carries its kind', () => {
  const kind = (run, type = JsonTypeError) => thrown(run, type).kind;
  for (const literal of ['[]', '"1"', 'true', 'null', '1 ', '\n1']) {
    assert.equal(kind(() => Value.number(literal), JsonValueError), 'invalid_number_literal', literal);
  }
  assert.equal(kind(() => Value.number('x'), ParseError), 'expected_value');
  for (const literal of [1, null, undefined]) assert.equal(kind(() => Value.number(literal)), 'invalid_argument_type');
  const object = parse('{}');
  // change-accessors: the accessors are methods; the keys are those of members().
  for (const read of [() => object.items(), () => parse('[]').members(), () => object.stringValue(),
    () => object.stringUnits(), () => object.numberLiteral(), () => object.booleanValue(), () => parse('[]').get('a')]) {
    assert.equal(kind(read), 'wrong_kind', String(read));
  }
  for (const key of [Value.null(), parse('[]'), parse('{}')]) {
    assert.equal(kind(() => insert(key)), 'non_string_key', String(key));
  }
  // change-argument-types: a key of a host type that the function does not take.
  for (const key of [1, null, true]) assert.equal(kind(() => insert(key)), 'invalid_argument_type', String(key));
  for (const key of [1, null, undefined]) assert.equal(kind(() => object.get(key)), 'invalid_argument_type');
  for (const maxDepth of [-1, 257]) assert.equal(kind(() => parse('1', {maxDepth}), JsonValueError), 'depth_limit_out_of_range', String(maxDepth));
  // change-code-units, change-from-units: a string is built from its code units, and the core refuses a unit above 65535
  // (T3.64).
  assert.equal(Value.fromUnits([0xffff]).kind, 'string');
  assert.equal(kind(() => Value.fromUnits([0x10000]), JsonValueError), 'invalid_code_unit');
  // change-from-float: a number is built from a float, and a float that is no JSON number is refused (T3.64).
  assert.equal(Value.fromFloat(1.5).kind, 'number');
  for (const float of [NaN, Infinity, -Infinity]) assert.equal(kind(() => Value.fromFloat(float), JsonValueError), 'non_finite_number', String(float));
  // change-depth-limit: a limit that is no integer is refused by the conversion of the argument, a number with invalid_number
  // and a value of another type with invalid_argument_type.
  for (const maxDepth of [1.5, NaN]) assert.equal(kind(() => parse('1', {maxDepth}), JsonValueError), 'invalid_number', String(maxDepth));
  for (const maxDepth of ['1', null]) assert.equal(kind(() => parse('1', {maxDepth})), 'invalid_argument_type', String(maxDepth));
  for (const run of [() => parse(1), () => parse('1', null), () => parse('1', 'options'), () => parse('1', {rejectDuplicates: 1}),
    () => parse([1]), () => Value.string(null), () => Value.boolean('true'), () => Value.array(null), () => Value.array([1]),
    () => Value.object(null), () => insert(Value.string('a'), 1), () => Value.object([1]), () => stringify({})]) {
    assert.equal(kind(run), 'invalid_argument_type', String(run));
  }
  assert.equal(kind(() => JSON.stringify({nested: [parse('1')]})), 'host_serialization_refused');
  // A ParseError is constructed directly (binding GN-7a): its constructor takes a message and a kind of the class, and
  // refuses another argument with invalid_argument_type.
  const made = new ParseError('m', 'expected_value');
  assert.ok(made instanceof ParseError);
  assert.equal(made.kind, 'expected_value');
  for (const args of [['m', 'not_a_kind'], ['m', 'invalid_argument_type'], ['m', 1], []]) {
    assert.equal(kind(() => new ParseError(...args)), 'invalid_argument_type', JSON.stringify(args));
  }
});
