// The shared verifier: the rejection kinds of the JSON contract, the comparison of rejection positions and kinds, the probe
// protocol with its deadline, a run that reports every failing probe, and the aggregate record that only a complete run writes.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { sourceManifest } from '../../scripts/records.mts';
import { ARGUMENTS, FIXTURES, Failures, IMPLEMENTATIONS, OFFICIAL, REGISTRY, ROOT, argumentCases, fixturePaths, officialCases, type Argv } from '../../scripts/registry.mts';
import { Probe, argumentChecks, argumentKinds, byteOffset, createRecord, expectedArgumentReply, kindDisagreements, positionDisagreements, rejectionKinds, sharedCases, verifyProbes } from '../../scripts/verify.mts';
import { checkout, known } from './checkout.mts';

/** A probe that runs `source` with node. */
const node = (source: string): Argv => [process.execPath, '-e', source];

test('the rejection kinds are the list of the section of the JSON contract', (context) => {
  const kinds = rejectionKinds();
  assert.ok(kinds.includes('invalid_utf8'));
  const { root, write } = checkout(context);
  write('docs/spec/json-contract.md', '# JSON contract\n\n<a id="rejection-kinds"></a>\n### Rejection kinds\n\nThe list.\n\n- `first_kind`\n- `second_kind`\n\n<a id="numbers"></a>\n## Numbers\n\n- `not_a_kind`\n');
  assert.deepEqual(rejectionKinds(root), ['first_kind', 'second_kind']);
  write('docs/spec/json-contract.md', '# JSON contract\n');
  assert.throws(() => rejectionKinds(root), /has no section/);
});

test('the argument kinds are the list of their section of the JSON contract', (context) => {
  assert.deepEqual(argumentKinds(), ['non_string_key', 'wrong_kind', 'invalid_number_literal', 'depth_limit_out_of_range', 'invalid_argument_type', 'invalid_code_unit', 'host_serialization_refused', 'direct_construction', 'unpaired_surrogate', 'non_finite_number', 'internal']);
  assert.equal(rejectionKinds().filter(kind => argumentKinds().includes(kind)).length, 0);
  const { root, write } = checkout(context);
  write('docs/spec/json-contract.md', '# JSON contract\n\n<a id="rejection-kinds"></a>\n### Rejection kinds\n\n- `first_kind`\n\n<a id="argument-kinds"></a>\n### Argument kinds\n\nThe list.\n\n- `third_kind` — a refused argument.\n\n<a id="numbers"></a>\n## Numbers\n');
  assert.deepEqual(argumentKinds(root), ['third_kind']);
  write('docs/spec/json-contract.md', '# JSON contract\n\n<a id="rejection-kinds"></a>\n### Rejection kinds\n\n- `first_kind`\n');
  assert.throws(() => argumentKinds(root), /has no section <a id="argument-kinds">/);
});

test('the argument cases name kinds of the contract and reach every argument kind of the shared calls', (context) => {
  const checks = argumentChecks();
  assert.equal(checks.length, argumentCases().cases.length);
  const kinds = new Set(checks.map(check => check.kind));
  for (const kind of [null, 'non_string_key', 'wrong_kind', 'invalid_number_literal', 'depth_limit_out_of_range', 'expected_value']) assert.ok(kinds.has(kind), `no argument case names ${kind}`);
  // Every call has an accepted case and a refused one.
  for (const call of ['number', 'max_depth', 'string_value', 'object_key']) {
    assert.ok(checks.some(check => check.call === call && check.kind === null), call);
    assert.ok(checks.some(check => check.call === call && check.kind !== null), call);
  }
  const key = known(checks.find(check => check.call === 'object_key' && check.kind !== null), 'an object key case');
  assert.deepEqual(expectedArgumentReply(key, 'php'), { absent: true });
  assert.deepEqual(expectedArgumentReply(key, 'rust'), { ok: false, kind: 'non_string_key' });
  assert.match(key.request, /^\{"call":"object_key","argument":/);
  const { root, write, json } = checkout(context);
  write('docs/spec/json-contract.md', '<a id="rejection-kinds"></a>\n### R\n\n- `expected_value`\n\n<a id="argument-kinds"></a>\n### A\n\n- `wrong_kind`\n');
  const comment = 'synthetic';
  json(ARGUMENTS, { schema: 1, comment, absent: {}, cases: [{ name: 'a', call: 'number', argument: 'x', kind: 'not_a_kind' }] });
  assert.throws(() => argumentChecks(root), /kinds outside the JSON contract \(a: not_a_kind\)/);
  json(ARGUMENTS, { schema: 1, comment, absent: { number: ['cobol'] }, cases: [{ name: 'a', call: 'number', argument: 'x', kind: null }] });
  assert.throws(() => argumentChecks(root), /outside config\/implementations.json \(cobol\)/);
  json(ARGUMENTS, { schema: 1, comment, absent: {}, cases: [{ name: 'a', call: 'parse', argument: 'x', kind: null }] });
  assert.throws(() => argumentChecks(root), /arguments.json/);
});

test('an argument case passes only with its expected reply', async () => {
  // A probe that accepts every document as an empty object and answers every argument request with its expected reply.
  const checks = argumentChecks();
  const replies = Object.fromEntries(checks.map(check => [check.request, expectedArgumentReply(check, 'synthetic')]));
  const source = `const replies = ${JSON.stringify(replies)}; require('node:readline').createInterface({ input: process.stdin }).on('line', line => console.log(JSON.stringify(replies[line] ?? { ok: false, offset: 0, unit: 'byte', kind: 'expected_value' })))`;
  await assert.rejects(verifyProbes({ synthetic: node(source) }), (error: Failures) => {
    assert.ok(!error.failures.some(failure => failure.startsWith('synthetic arguments/')), error.message.slice(0, 500));
    return true;
  });
  const wrong = `require('node:readline').createInterface({ input: process.stdin }).on('line', line => console.log(JSON.stringify(line.startsWith('{') ? { ok: true } : { ok: false, offset: 0, unit: 'byte', kind: 'expected_value' })))`;
  await assert.rejects(verifyProbes({ synthetic: node(wrong) }), (error: Failures) => {
    assert.ok(error.failures.some(failure => failure.startsWith('synthetic arguments/number-array:') && failure.includes('"kind":"invalid_number_literal"')), error.message.slice(0, 500));
    assert.ok(!error.failures.some(failure => failure.startsWith('synthetic arguments/number-literal:')), error.message.slice(0, 500));
    return true;
  });
});

test('a UTF-16 offset is the byte offset of its character', () => {
  const document = Buffer.from('["\u{1f30d}x', 'utf8');
  assert.equal(byteOffset(document, 4, 'utf16'), 6);
  // An offset between the halves of a surrogate pair is the first byte of the character.
  assert.equal(byteOffset(document, 3, 'utf16'), 2);
  assert.equal(byteOffset(document, 6, 'byte'), 6);
  assert.throws(() => byteOffset(document, 1, 'char'), /unit of its offset/);
});

test('the implementations reject the same input at the same position with the same kind', () => {
  const documents = new Map([['case', Buffer.from('[1,]')]]);
  const replies = (a: object, b: object) => new Map([['case', new Map([['js', { ok: false, ...a }], ['go', { ok: false, ...b }]])]]);
  assert.deepEqual(positionDisagreements(replies({ offset: 3, unit: 'utf16' }, { offset: 3, unit: 'byte' }), documents), []);
  assert.match(known(positionDisagreements(replies({ offset: 3, unit: 'byte' }, { offset: 2, unit: 'byte' }), documents)[0], 'the disagreement'), /case: go=2, js=3/);
  const kinds = ['expected_value', 'trailing_input'];
  assert.deepEqual(kindDisagreements(replies({ kind: 'expected_value' }, { kind: 'expected_value' }), kinds), []);
  assert.match(known(kindDisagreements(replies({ kind: 'expected_value' }, { kind: 'trailing_input' }), kinds)[0], 'the disagreement'), /case: expected_value=js, trailing_input=go/);
  assert.match(known(kindDisagreements(replies({ kind: 'other' }, {}), kinds)[0], 'the disagreement'), /go: rejections report no kind\njs: unknown rejection kind other/);
});

test('a probe answers each request with one line and fails by name at its deadline', async (context) => {
  const { root } = checkout(context);
  const file = path.join(root, 'case.json');
  writeFileSync(file, '[]');
  const echo = new Probe('echo', node("require('node:readline').createInterface({ input: process.stdin }).on('line', line => console.log(JSON.stringify(line)))"), 5);
  assert.equal((await echo.exchange('first', file))[0], JSON.stringify(file));
  await echo.finish();
  const silent = new Probe('silent', node('setInterval(() => {}, 1000)'), 1);
  await assert.rejects(silent.exchange('quiet', file), /silent quiet: no reply within 1 s/);
  const noisy = new Probe('noisy', node("console.error('a warning'); require('node:readline').createInterface({ input: process.stdin }).on('line', () => console.log('{}'))"), 5);
  await noisy.exchange('first', file);
  await assert.rejects(noisy.finish(), /noisy probe emitted warnings:\na warning/);
});

test('the shared cases are the official examples, the fixtures and the cases of the suite', (context) => {
  const { root } = checkout(context);
  const { cases, counts } = sharedCases(root);
  const official = officialCases().length;
  assert.deepEqual(counts, { official, fixtures: fixturePaths(ROOT, 'valid').length + fixturePaths(ROOT, 'invalid').length, supplementary: 0 });
  assert.equal(cases.length, counts.official + counts.fixtures);
  assert.ok(cases.every(item => item.expected.ok === !item.name.startsWith(`${FIXTURES}/invalid/`)));
});

test('every failing probe is reported after every probe ran', async () => {
  const rejectAll = node("require('node:readline').createInterface({ input: process.stdin }).on('line', () => console.log(JSON.stringify({ ok: false, offset: 0, unit: 'byte', kind: 'expected_value' })))");
  await assert.rejects(verifyProbes({ first: rejectAll, second: node('process.exit(3)') }), (error: Failures) => {
    assert.ok(error instanceof Failures);
    assert.ok(error.failures.some(failure => failure.startsWith('first official/document-order: ok')), error.message.slice(0, 500));
    assert.ok(error.failures.some(failure => failure.startsWith('second probe failed at official/') || failure.startsWith('second official/')), error.message.slice(0, 500));
    return true;
  });
});

test('only a complete run of the current sources makes a record', (context) => {
  const { root, write, json } = checkout(context);
  const source = `${REGISTRY.roots.js}/index.js`;
  write(source, 'export const fixture = true;\n');
  json(OFFICIAL, { cases: [{ id: 'fixture', source: '{}', tree: ['object', []], compact: '{}' }] });
  write(`${FIXTURES}/valid/object.json`, '{}');
  const counts = { official: 1, fixtures: 1, arguments: 1, supplementary: 0 };
  const results = Object.fromEntries(IMPLEMENTATIONS.map(name => [name, { status: 'passed', cases: 3 }]));
  const versions = Object.fromEntries(IMPLEMENTATIONS.map(name => [name, { version: 'synthetic' }]));
  const before = sourceManifest(root);
  assert.equal(createRecord(root, before, results, counts, versions, null).cases.total, 3);
  assert.throws(() => createRecord(root, before, { ...results, go: { status: 'failed', cases: 3 } }, counts, versions, null), /go did not/);
  assert.throws(() => createRecord(root, before, results, { ...counts, fixtures: 0 }, versions, null), /repository fixtures/);
  assert.throws(() => createRecord(root, before, results, { ...counts, arguments: 0 }, versions, null), /argument cases/);
  write(source, '// changed during the run\n');
  assert.throws(() => createRecord(root, before, results, counts, versions, null), new RegExp(`sources changed during verification[^]*changed ${source}`));
});
