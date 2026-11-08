// Package tests for the JavaScript value API, run by node:test. The shared cases exercise the JSON contract through the adapter; construction guards, frozen
// results, wrong-kind access, option validation and UTF-16 offsets live only here.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MAX_DEPTH, ParseError, Value, parse, parseBytes, stringify} from '../index.js';

// Requirements: RQ-012
test('values_come_only_from_the_library', () => {
  assert.throws(() => new Value(), {name: 'TypeError', message: 'Use parse() or Value factories'});
  assert.throws(() => stringify({kind: 'array'}), {name: 'TypeError'});
  assert.throws(() => stringify(null), {name: 'TypeError'});
  assert.equal(stringify(parse('[1]')), '[1]');
});

// Requirements: RQ-013
test('returned_collections_are_immutable', () => {
  const array = parse('[1,2]');
  assert.ok(Object.isFrozen(array.items));
  assert.throws(() => { array.items[0] = parse('9'); }, {name: 'TypeError'});
  assert.ok(Object.isFrozen(parse('[]').items));
  const object = parse('{"a":1,"b":2}');
  assert.ok(Object.isFrozen(object.keys));
  const members = object.members;
  members.delete('a');
  assert.equal(object.members.size, 2, 'members returns a fresh map for each access');
});

// Requirements: RQ-014
test('wrong_kind_access_is_reported', () => {
  assert.throws(() => parse('[]').members, {name: 'TypeError', message: 'Expected object, got array'});
  assert.throws(() => parse('{}').items, {name: 'TypeError', message: 'Expected array, got object'});
  assert.throws(() => parse('1').stringValue(), {name: 'TypeError', message: 'Expected string, got number'});
  assert.throws(() => parse('"a"').numberLiteral(), {name: 'TypeError', message: 'Expected number, got string'});
  assert.throws(() => parse('null').booleanValue(), {name: 'TypeError', message: 'Expected boolean, got null'});
});

// Requirements: RQ-002, RQ-019
test('member_lookup_uses_decoded_names', () => {
  const value = parse('{"a\\u00e9":1,"b":2}');
  assert.equal(value.get('aé').numberLiteral(), '1');
  assert.equal(value.get('missing'), undefined);
  assert.throws(() => value.get(1), {name: 'TypeError', message: 'Key must be a string'});
});

// Requirements: RQ-001
test('repeated_key_keeps_first_position_and_last_value', () => {
  const members = parse('{"a":1,"b":2,"a":3}').members;
  assert.deepEqual([...members.keys()], ['a', 'b']);
  assert.equal(members.get('a').numberLiteral(), '3');
});

// Requirements: RQ-020
test('host_serialization_boundary', () => {
  const value = parse('[1]');
  assert.throws(() => JSON.stringify(value), {name: 'TypeError', message: 'Use stringify(value) from ordered-json'});
  assert.equal(String(value), '[1]');
});

// Requirements: RQ-018
test('root_keeps_surrounding_text', () => {
  const value = parse('  [1] \n');
  assert.equal(value.raw, '  [1] \n');
  assert.equal(stringify(value), '[1]');
  assert.equal(value.items[0].raw, '1');
});

// Requirements: RQ-006
test('depth_argument_is_bounded', () => {
  assert.throws(() => parse(123), {name: 'TypeError', message: 'Expected JSON text'});
  for (const maxDepth of [-1, MAX_DEPTH + 1, 1.5]) {
    assert.throws(() => parse('[]', {maxDepth}), {name: 'RangeError'});
  }
});

// Requirements: RQ-006
test('depth_limit_is_enforced', () => {
  assert.equal(parse('[[1]]', {maxDepth: 2}).items.length, 1);
  assert.throws(() => parse('[[1]]', {maxDepth: 1}), {name: 'ParseError', message: /maximum nesting depth/i});
});

// Requirements: RQ-007
test('bytes_input_is_validated', () => {
  assert.throws(() => parseBytes([1, 2]), {name: 'TypeError', message: 'Expected Uint8Array'});
  assert.throws(() => parseBytes(new Uint8Array([0x5b, 0x22, 0xff, 0x22, 0x5d])),
    {name: 'ParseError', message: /Invalid UTF-8/});
  assert.equal(stringify(parseBytes(new TextEncoder().encode('{"a":1}'))), '{"a":1}');
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
  const error = (() => { try { parseBytes(bad); } catch (failure) { return failure; } })();
  assert.ok(error instanceof ParseError);
  assert.match(error.message, /Invalid UTF-8/);
  assert.equal(error.offset, 2);
});

// Requirements: RQ-004
test('parse_errors_report_offsets', () => {
  const plain = (() => { try { parse('[1,]'); } catch (error) { return error; } })();
  assert.ok(plain instanceof ParseError);
  assert.equal(plain.offset, 3);
  // The astral character occupies two UTF-16 units, which the offset must count.
  const astral = (() => { try { parse('["🌍",]'); } catch (error) { return error; } })();
  assert.equal(astral.offset, 6);
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
test('string_value_keeps_an_unpaired_surrogate', () => {
  assert.equal(parse('"a\\ud800"').stringValue(), 'a\ud800');
});

// Requirements: RQ-008
test('text_input_rejects_lone_surrogates', () => {
  // The offset counts UTF-16 units and names the surrogate itself; the text is checked before its grammar, as bytes are
  // checked for UTF-8 before theirs.
  for (const [source, offset] of [['["\ud800"]', 2], ['["한\udc00"]', 3], ['{"\ud800":1}', 2], ['["한"]\ud800', 5]]) {
    assert.throws(() => parse(source), {name: 'ParseError', kind: 'unescaped_lone_surrogate', offset}, source);
  }
});

// Requirements: RQ-016
test('ordered_map_rejects_non_string_key', () => {
  assert.throws(() => Value.object([[Value.number('1'), Value.null()]]), {name: 'TypeError', message: 'Expected string, got number'});
  for (const key of [1, null]) assert.throws(() => Value.object([[key, Value.null()]]), {name: 'TypeError'});
});

// Requirements: RQ-007
test('utf8_validation_holds_for_long_multibyte_text', () => {
  const text = '\ud55c\u{1f30d}'.repeat(64);
  const encoded = new TextEncoder().encode(`{"key":"${text}"}`);
  assert.equal(parseBytes(encoded).get('key').stringValue(), text);
  assert.throws(() => parseBytes(new Uint8Array([0x5b, 0x22, 0xff, 0x22, 0x5d])),
    {name: 'ParseError', kind: 'invalid_utf8', offset: 2});
});

// Requirements: RQ-015
test('factories_validate_arguments', () => {
  assert.throws(() => Value.string(1), {name: 'TypeError', message: 'Expected string'});
  assert.throws(() => Value.number(1), {name: 'TypeError', message: 'Pass a number literal as a string'});
  assert.throws(() => Value.number(' 1'), {name: 'TypeError', message: 'Number literal cannot contain whitespace'});
  assert.throws(() => Value.boolean('true'), {name: 'TypeError', message: 'Expected boolean'});
  assert.equal(stringify(Value.string('"q"')), '"\\"q\\""');
  assert.equal(stringify(Value.array([Value.boolean(true), Value.null()])), '[true,null]');
  assert.equal(stringify(Value.object([['a', Value.number('1')]])), '{"a":1}');
  assert.throws(() => Value.object([['a', {}]]), {name: 'TypeError'});
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
    const offset = source.lastIndexOf(',"') + 1;
    const expected = {name: 'ParseError', kind: 'duplicate_object_key', offset, unit: 'utf16',
      message: `Duplicate object key at UTF-16 offset ${offset}`};
    assert.throws(() => parse(source, {rejectDuplicates: true}), expected, source);
    assert.throws(() => parse(source, {rejectDuplicates: true, maxDepth: 2}), expected, source);
    assert.throws(() => parseBytes(new TextEncoder().encode(source), {rejectDuplicates: true}), expected, source);
  }
});

// Requirements: RQ-017
test('strict_parse_accepts_unique_keys', () => {
  const source = '{"a":1,"nested":[{"b":2}],"state":null}';
  assert.equal(stringify(parse(source, {rejectDuplicates: true})), source);
  assert.equal(stringify(parseBytes(new TextEncoder().encode(source), {rejectDuplicates: true})), source);
  assert.equal(parse('{"a":1,"a":2}', {rejectDuplicates: false}).get('a').numberLiteral(), '2');
  assert.throws(() => parseBytes(new Uint8Array([0xff]), {rejectDuplicates: true}),
    {name: 'ParseError', kind: 'invalid_utf8', offset: 0, unit: 'byte'});
  for (const rejectDuplicates of [1, 'true', null]) {
    assert.throws(() => parse('{}', {rejectDuplicates}),
      {name: 'TypeError', message: 'rejectDuplicates must be a boolean'});
  }
});

test('public_api_exports_the_entry_points', () => {
  // RQ-023: the parse, serialization, factory and accessor functions are exported.
  for (const entry of [parse, parseBytes, stringify, Value.string, Value.number, Value.boolean, Value.null, Value.array, Value.object]) {
    assert.equal(typeof entry, 'function');
  }
  const built = Value.object([['a', Value.array([Value.string('x'), Value.number('1'), Value.boolean(true), Value.null()])]]);
  assert.equal(stringify(built), '{"a":["x",1,true,null]}');
  const items = parse(stringify(built)).get('a').items;
  assert.deepEqual(items.map(item => item.kind), ['string', 'number', 'boolean', 'null']);
  assert.equal(items[0].stringValue(), 'x');
  assert.equal(items[1].numberLiteral(), '1');
  assert.equal(items[2].booleanValue(), true);
  assert.equal(built.members.size, 1);
});

test('parse_error_exposes_kind_offset_and_message', () => {
  // RQ-024: a parse error exposes its kind, its offset and its message.
  const error = (() => { try { parse('[1,]'); } catch (failure) { return failure; } })();
  assert.ok(error instanceof ParseError);
  assert.equal(error.kind, 'expected_value');
  assert.equal(error.offset, 3);
  assert.equal(typeof error.message, 'string');
  assert.ok(error.message.length > 0);
});

// Requirements: RQ-020
test('host_serialization_embeds_values', () => {
  // A native structure that holds a value is refused by the host encoder, which points to the library serializer.
  const value = parse('{"b":1.50,"a":[2]}');
  assert.throws(() => JSON.stringify({props: value}), {name: 'TypeError', message: 'Use stringify(value) from ordered-json'});
  assert.throws(() => JSON.stringify([value]), {name: 'TypeError'});
  assert.equal(stringify(value), '{"b":1.50,"a":[2]}');
});

// Requirements: RQ-003
test('arrays_and_objects_stay_distinct', () => {
  assert.deepEqual(parse('[3,1,2]').items.map(item => item.numberLiteral()), ['3', '1', '2']);
  assert.equal(parse('[]').kind, 'array');
  assert.equal(parse('{}').kind, 'object');
  assert.equal(stringify(parse('{"a":[],"b":{},"c":[{}]}')), '{"a":[],"b":{},"c":[{}]}');
});

// Requirements: RQ-010
test('number_tokens_are_kept_exactly', () => {
  const tokens = ['1.0e+2', '-0', '0.10', '123456789012345678901234567890', '1E400'];
  assert.deepEqual(parse(`[${tokens}]`).items.map(item => item.numberLiteral()), tokens);
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
