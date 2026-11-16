// Package tests for the JavaScript value API of the binding @polyspec/json, run by node:test (make test-js). They are the tests
// of the legacy package @polyspec/ordered-json with no change beyond the changes of packages/rust/interface.json, each named
// where it applies (docs/spec/json-contract.md#transition, T3.25-1).
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JsonTypeError, JsonValueError, MAX_DEPTH, OrderedMap, ParseError, Value, parse, stringify} from '@polyspec/json';

const text = new TextEncoder();

/** An object of the entries [name, value], each name a string key (change-ordered-map). */
function object(entries) {
  const members = new OrderedMap();
  for (const [name, value] of entries) members.insert(Value.string(name), value);
  return Value.object(members);
}

/** The names of the members of an object in their order (change-accessors: members() is an OrderedMap of value keys). */
const names = value => [...value.members()].map(([key]) => key.stringValue());

// Requirements: RQ-012
test('values_come_only_from_the_library', () => {
  // change-errors, change-messages: a refused argument is a JsonTypeError with its kind.
  assert.throws(() => new Value(), {name: 'JsonTypeError', kind: 'direct_construction'});
  assert.throws(() => stringify({kind: 'array'}), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  assert.throws(() => stringify(null), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  assert.equal(stringify(parse('[1]')), '[1]');
});

// Requirements: RQ-013
test('returned_collections_are_immutable', () => {
  // change-collections: an accessor returns a new collection for each access, so a change of it leaves the value as it was.
  const array = parse('[1,2]');
  const items = array.items();
  items[0] = parse('9');
  items.push(parse('3'));
  assert.deepEqual(array.items().map(item => item.numberLiteral()), ['1', '2']);
  const value = parse('{"a":1,"b":2}');
  const members = value.members();
  members.insert(Value.string('c'), Value.null());
  assert.equal(value.members().size, 2, 'members returns a fresh map for each access');
  assert.equal(stringify(array), '[1,2]');
});

// Requirements: RQ-014
test('wrong_kind_access_is_reported', () => {
  // change-accessors, change-messages: the accessors are methods, and the kind is the contract.
  for (const read of [() => parse('[]').members(), () => parse('{}').items(), () => parse('1').stringValue(),
    () => parse('"a"').numberLiteral(), () => parse('null').booleanValue()]) {
    assert.throws(read, {name: 'JsonTypeError', kind: 'wrong_kind'}, String(read));
  }
});

// Requirements: RQ-002, RQ-019
test('member_lookup_uses_decoded_names', () => {
  const value = parse('{"a\\u00e9":1,"b":2}');
  assert.equal(value.get('aé').numberLiteral(), '1');
  // change-accessors: lookup is absent, null, for a missing name.
  assert.equal(value.get('missing'), null);
  // change-argument-types: a key of a host type that get does not take.
  assert.throws(() => value.get(1), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
});

// Requirements: RQ-001
test('repeated_key_keeps_first_position_and_last_value', () => {
  const value = parse('{"a":1,"b":2,"a":3}');
  assert.deepEqual(names(value), ['a', 'b']);
  assert.equal(value.get('a').numberLiteral(), '3');
});

// Requirements: RQ-020
test('host_serialization_boundary', () => {
  const value = parse('[1]');
  // change-host-hooks, change-messages
  assert.throws(() => JSON.stringify(value), {name: 'JsonTypeError', kind: 'host_serialization_refused'});
  assert.equal(String(value), '[1]');
});

// Requirements: RQ-018
test('root_keeps_surrounding_text', () => {
  const value = parse('  [1] \n');
  assert.equal(value.raw, '  [1] \n');
  assert.equal(stringify(value), '[1]');
  assert.equal(value.items()[0].raw, '1');
});

// Requirements: RQ-006
test('depth_argument_is_bounded', () => {
  // change-parse-source, change-messages: parse takes a text or its bytes.
  assert.throws(() => parse(123), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  for (const maxDepth of [-1, MAX_DEPTH + 1]) {
    assert.throws(() => parse('[]', {maxDepth}), {name: 'JsonValueError', kind: 'depth_limit_out_of_range'});
  }
  // change-depth-limit: a limit that is no integer is refused by the conversion of the argument.
  assert.throws(() => parse('[]', {maxDepth: 1.5}), {name: 'JsonValueError', kind: 'invalid_number'});
});

// Requirements: RQ-006
test('depth_limit_is_enforced', () => {
  assert.equal(parse('[[1]]', {maxDepth: 2}).items().length, 1);
  assert.throws(() => parse('[[1]]', {maxDepth: 1}), {name: 'ParseError', kind: 'maximum_depth_exceeded'});
});

// Requirements: RQ-007
test('bytes_input_is_validated', () => {
  // change-parse-source: the bytes are a Uint8Array given to parse.
  assert.throws(() => parse([1, 2]), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  assert.throws(() => parse(new Uint8Array([0x5b, 0x22, 0xff, 0x22, 0x5d])), {name: 'ParseError', kind: 'invalid_utf8'});
  assert.equal(stringify(parse(text.encode('{"a":1}'))), '{"a":1}');
});

// Requirements: RQ-005
test('rejection_names_its_kind', () => {
  // The wording is JavaScript's own; the kind is the shared contract.
  const kinds = new Map([
    ['[1,]', 'expected_value'],
    ['{1:2}', 'expected_object_key'],
    ['[1.]', 'expected_digit'],
    ['"a\u0000b"', 'unescaped_control_character'],
    ['[1] x', 'trailing_input'],
  ]);
  for (const [document, kind] of kinds) {
    const error = (() => { try { parse(document); } catch (failure) { return failure; } })();
    assert.ok(error instanceof ParseError, `${document} was accepted`);
    assert.equal(error.kind, kind, `${document}: ${error.message}`);
  }
});

// Requirements: RQ-004, RQ-007
test('invalid_utf8_reports_the_first_bad_byte', () => {
  // The bad byte sits at index 2 of ["<bad>"]; the error names that position.
  const bad = new Uint8Array([0x5b, 0x22, 0xff, 0x22, 0x5d]);
  const error = (() => { try { parse(bad); } catch (failure) { return failure; } })();
  assert.ok(error instanceof ParseError);
  assert.equal(error.kind, 'invalid_utf8');
  assert.equal(error.offset, 2);
});

// Requirements: RQ-004
test('parse_errors_report_offsets', () => {
  const plain = (() => { try { parse('[1,]'); } catch (error) { return error; } })();
  assert.ok(plain instanceof ParseError);
  assert.equal(plain.offset, 3);
  // change-offsets: the offset counts the bytes of the UTF-8 text, four for the astral character.
  const astral = (() => { try { parse('["🌍",]'); } catch (error) { return error; } })();
  assert.equal(astral.offset, 8);
});

// Requirements: RQ-009
test('surrogate_pair_decodes', () => {
  assert.deepEqual(parse('"\\ud83c\\udf0d"').stringUnits(), [0xd83c, 0xdf0d]);
  assert.equal(parse('"\\ud83c\\udf0d"').stringValue(), '🌍');
});

// Requirements: RQ-009
test('unpaired_surrogate_stays_in_units', () => {
  const lone = parse('"a\\ud800"');
  assert.deepEqual(lone.stringUnits(), [0x61, 0xd800]);
  assert.equal(stringify(lone), '"a\\ud800"');
});

// Requirements: RQ-009
test('string_value_refuses_an_unpaired_surrogate', () => {
  // change-string-value: a string with an unpaired surrogate has no Unicode text; its units keep it.
  assert.throws(() => parse('"a\\ud800"').stringValue(), {name: 'JsonValueError', kind: 'unpaired_surrogate'});
});

// Requirements: RQ-008
test('text_input_rejects_lone_surrogates', () => {
  // change-offsets: a text with an unpaired surrogate has no UTF-8 encoding, and the binding refuses it (B-3).
  for (const source of ['["\ud800"]', '["한\udc00"]', '{"\ud800":1}', '["한"]\ud800']) {
    assert.throws(() => parse(source), {name: 'JsonValueError', kind: 'invalid_text'}, source);
  }
});

// Requirements: RQ-016
test('ordered_map_rejects_non_string_key', () => {
  // change-ordered-map: an object takes an OrderedMap whose keys are values.
  assert.throws(() => new OrderedMap().insert(Value.number('1'), Value.null()), {name: 'JsonTypeError', kind: 'non_string_key'});
  // change-argument-types: a key of a host type.
  for (const key of [1, null]) {
    assert.throws(() => new OrderedMap().insert(key, Value.null()), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  }
});

// Requirements: RQ-007
test('utf8_validation_holds_for_long_multibyte_text', () => {
  const long = '한\u{1f30d}'.repeat(64);
  assert.equal(parse(text.encode(`{"key":"${long}"}`)).get('key').stringValue(), long);
  assert.throws(() => parse(new Uint8Array([0x5b, 0x22, 0xff, 0x22, 0x5d])), {name: 'ParseError', kind: 'invalid_utf8', offset: 2});
});

// Requirements: RQ-015
test('factories_validate_arguments', () => {
  // change-messages: the kind is the contract.
  assert.throws(() => Value.string(1), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  assert.throws(() => Value.number(1), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  assert.throws(() => Value.number(' 1'), {name: 'JsonValueError', kind: 'invalid_number_literal'});
  assert.throws(() => Value.boolean('true'), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  assert.equal(stringify(Value.string('"q"')), '"\\"q\\""');
  assert.equal(stringify(Value.array([Value.boolean(true), Value.null()])), '[true,null]');
  assert.equal(stringify(object([['a', Value.number('1')]])), '{"a":1}');
  assert.throws(() => new OrderedMap().insert(Value.string('a'), {}), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
});

// Requirements: RQ-017
test('strict_parse_rejects_duplicate_keys', () => {
  const sources = [
    '{"a":1,"a":2}',
    String.raw`{"a":1,"a":2}`,
    '{"nested":{"a":1,"a":2}}',
    '[{"a":1,"a":2}]',
    String.raw`{"\ud800":1,"\ud800":2}`,
    '{"🌍":{"a":1,"a":2}}',
  ];
  for (const source of sources) {
    parse(source);
    // change-offsets: the offset counts bytes; change-messages.
    const offset = text.encode(source.slice(0, source.lastIndexOf(',"') + 1)).length;
    const expected = {name: 'ParseError', kind: 'duplicate_object_key', offset};
    assert.throws(() => parse(source, {rejectDuplicates: true}), expected, source);
    assert.throws(() => parse(source, {rejectDuplicates: true, maxDepth: 2}), expected, source);
    assert.throws(() => parse(text.encode(source), {rejectDuplicates: true}), expected, source);
  }
});

// Requirements: RQ-017
test('strict_parse_accepts_unique_keys', () => {
  const source = '{"a":1,"nested":[{"b":2}],"state":null}';
  assert.equal(stringify(parse(source, {rejectDuplicates: true})), source);
  assert.equal(stringify(parse(text.encode(source), {rejectDuplicates: true})), source);
  assert.equal(parse('{"a":1,"a":2}', {rejectDuplicates: false}).get('a').numberLiteral(), '2');
  assert.throws(() => parse(new Uint8Array([0xff]), {rejectDuplicates: true}), {name: 'ParseError', kind: 'invalid_utf8', offset: 0});
  for (const rejectDuplicates of [1, 'true', null]) {
    assert.throws(() => parse('{}', {rejectDuplicates}), {name: 'JsonTypeError', kind: 'invalid_argument_type'});
  }
});

test('public_api_exports_the_entry_points', () => {
  // RQ-023: the parse, serialization, factory and accessor functions are exported (change-parse-source: no parseBytes).
  for (const entry of [parse, stringify, Value.string, Value.number, Value.boolean, Value.null, Value.array, Value.object]) {
    assert.equal(typeof entry, 'function');
  }
  const built = object([['a', Value.array([Value.string('x'), Value.number('1'), Value.boolean(true), Value.null()])]]);
  assert.equal(stringify(built), '{"a":["x",1,true,null]}');
  const items = parse(stringify(built)).get('a').items();
  assert.deepEqual(items.map(item => item.kind), ['string', 'number', 'boolean', 'null']);
  assert.equal(items[0].stringValue(), 'x');
  assert.equal(items[1].numberLiteral(), '1');
  assert.equal(items[2].booleanValue(), true);
  assert.equal(built.members().size, 1);
});

test('parse_error_exposes_kind_offset_and_message', () => {
  // RQ-024: a parse error exposes its kind, its offset and its message.
  const error = (() => { try { parse('[1,]'); } catch (failure) { return failure; } })();
  assert.ok(error instanceof ParseError);
  assert.ok(error instanceof JsonValueError, 'change-errors: a parse error is of the category value');
  assert.equal(error.kind, 'expected_value');
  assert.equal(error.offset, 3);
  assert.equal(typeof error.message, 'string');
  assert.ok(error.message.length > 0);
});

// Requirements: RQ-020
test('host_serialization_embeds_values', () => {
  // A native structure that holds a value is refused by the host encoder, which points to the library serializer.
  const value = parse('{"b":1.50,"a":[2]}');
  assert.throws(() => JSON.stringify({props: value}), {name: 'JsonTypeError', kind: 'host_serialization_refused'});
  assert.throws(() => JSON.stringify([value]), JsonTypeError);
  assert.equal(stringify(value), '{"b":1.50,"a":[2]}');
});

// Requirements: RQ-003
test('arrays_and_objects_stay_distinct', () => {
  assert.deepEqual(parse('[3,1,2]').items().map(item => item.numberLiteral()), ['3', '1', '2']);
  assert.equal(parse('[]').kind, 'array');
  assert.equal(parse('{}').kind, 'object');
  assert.equal(stringify(parse('{"a":[],"b":{},"c":[{}]}')), '{"a":[],"b":{},"c":[{}]}');
});

// Requirements: RQ-010
test('number_tokens_are_kept_exactly', () => {
  const tokens = ['1.0e+2', '-0', '0.10', '123456789012345678901234567890', '1E400'];
  assert.deepEqual(parse(`[${tokens}]`).items().map(item => item.numberLiteral()), tokens);
  for (const [source, kind] of [['NaN', 'expected_value'], ['Infinity', 'expected_value'], ['-Infinity', 'expected_digit'], ['[NaN]', 'expected_value']]) {
    assert.throws(() => parse(source), {name: 'ParseError', kind}, source);
  }
});

// Requirements: RQ-011
test('serialization_is_idempotent', () => {
  const once = stringify(parse(' { "b" : 1 , "a" : 2 , "b" : 3 } '));
  assert.equal(once, '{"b":3,"a":2}');
  assert.equal(stringify(parse(once)), once);
});
