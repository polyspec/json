// RQ-005, RQ-011, RQ-022: the shared inputs of the verifier of the language packages (examples/official.json and
// contracts/fixtures/) are case groups of contracts/core.json, which the Rust core and every generated binding run
// (binding G-5, GN-13f). Each fixture and each official example has its case: a valid input is parsed and written again
// as the compact text of the independent reference, an invalid input is refused with a kind of the JSON contract, and
// each argument case has a case of the member that its call names.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { reference } from '../../scripts/reference.mts';
import { ROOT } from '../../scripts/registry.mts';

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const field = (value: unknown, name: string): unknown => (isObject(value) ? value[name] : undefined);
const read = (file: string): unknown => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));

const core = read('contracts/core.json');
const DECODER = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** The cases of a group of contracts/core.json. */
const group = (name: string): Json[] => list(field(core, name)).filter(isObject);
/** The cases of a member: its group and every group `<member>.<corpus>`. */
const memberCases = (member: string): Json[] =>
  Object.keys(isObject(core) ? core : {})
    .filter((name) => name === member || name.startsWith(`${member}.`))
    .flatMap(group);
const byId = (name: string): Map<string, Json> => new Map(group(name).map((kase) => [String(field(kase, 'id')), kase]));

/** The bytes of a `source` of binding G-5: its text, or `{"hex": ...}`. */
const bytesOf = (source: unknown): Buffer =>
  typeof source === 'string' ? Buffer.from(source, 'utf8') : Buffer.from(String(field(source, 'hex')), 'hex');
/** The source of a case: its own, or the one of the parse that makes its value. */
const sourceOf = (kase: Json): unknown => kase['source'] ?? field(field(kase['value'], 'args'), 'source');
const caseId = (category: string, file: string): string => `${category}_${file.replace(/\.json$/, '')}`.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
const kindOf = (kase: Json): unknown => field(kase['raises'], 'kind') ?? null;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

test('every fixture is a parse case with its bytes, and every valid one a stringify case with the compact text of the reference', () => {
  const parsed = byId('parse.fixtures');
  const written = byId('stringify.fixtures');
  assert.ok(parsed.size > 0, 'contracts/core.json has no group parse.fixtures');
  const findings: string[] = [];
  for (const category of ['valid', 'invalid']) {
    const directory = path.join(ROOT, 'contracts/fixtures', category);
    for (const file of readdirSync(directory).filter((name) => name.endsWith('.json'))) {
      const bytes = readFileSync(path.join(directory, file));
      const id = caseId(category, file);
      const kase = parsed.get(id);
      if (kase === undefined || !bytesOf(kase['source']).equals(bytes)) {
        findings.push(`parse.fixtures has no case ${id} with the bytes of ${category}/${file}`);
        continue;
      }
      if (category === 'invalid') {
        if (kase['raises'] === undefined) findings.push(`parse.fixtures ${id} does not raise`);
        continue;
      }
      if (kase['raises'] !== undefined) findings.push(`parse.fixtures ${id} raises`);
      const write = written.get(id);
      if (write === undefined || !bytesOf(sourceOf(write)).equals(bytes) || write['text'] !== reference(bytes).compact) {
        findings.push(`stringify.fixtures has no case ${id} with the compact text of the reference`);
      }
    }
  }
  assert.deepEqual(findings, []);
});

test('every official example is a stringify case with its compact text', () => {
  const written = byId('stringify.official');
  const examples = list(field(read('examples/official.json'), 'cases')).filter(isObject);
  assert.ok(examples.length > 0);
  const findings = examples
    .filter((example) => {
      const kase = written.get(String(example['id']).replace(/[^a-z0-9]+/gi, '_').toLowerCase());
      return kase === undefined || sourceOf(kase) !== example['source'] || kase['text'] !== example['compact'];
    })
    .map((example) => `stringify.official has no case of ${String(example['id'])}`);
  assert.deepEqual(findings, []);
});

test('every argument case has a case of its member with the same argument and kind', () => {
  const cases = list(field(read('contracts/fixtures/arguments.json'), 'cases')).filter(isObject);
  assert.ok(cases.length > 0);
  // The value that a case of string_value reads: its receiver, made by a factory of the value, or null without one.
  const receiverValue = (kase: Json): unknown => {
    const receiver = kase['receiver'];
    if (receiver === undefined) return kase['units'] === undefined && kase['text'] === undefined && kase['literal'] === undefined ? null : undefined;
    const args = field(receiver, 'args');
    const made: Record<string, unknown> = { 'value.string': field(args, 'text'), 'value.number': Number(field(args, 'literal')), 'value.array': field(args, 'items'), 'value.object': {}, 'value.boolean': field(args, 'value') };
    return made[String(field(receiver, 'new'))];
  };
  const keyValue = (key: unknown): unknown => {
    const kind = field(key, 'kind');
    if (kind === 'null') return null;
    if (kind === 'map') return {};
    if (kind === 'number') return Number(field(key, 'value'));
    return field(key, 'value');
  };
  const findings = cases
    .filter((check) => {
      const { call, argument } = check;
      const match = (kase: Json): boolean => kindOf(kase) === (check['kind'] ?? null);
      if (call === 'number') return !memberCases('value.number').some((kase) => kase['literal'] === argument && match(kase));
      if (call === 'max_depth') return !memberCases('parse').some((kase) => kase['source'] === '1' && field(kase['options'], 'max_depth') === argument && match(kase));
      if (call === 'string_value') return !memberCases('value.string_value').some((kase) => same(receiverValue(kase), argument) && match(kase));
      return !memberCases('ordered_map.insert').some((kase) => same(keyValue(kase['key']), argument) && match(kase));
    })
    .map((check) => `no case of the argument case ${String(check['name'])}`);
  assert.deepEqual(findings, []);
});

test('a source of a fixture case is text only where the bytes are UTF-8 without a byte order mark', () => {
  const findings = group('parse.fixtures').filter((kase) => {
    const source = kase['source'];
    if (typeof source === 'string') return source.startsWith('﻿');
    try {
      return !DECODER.decode(bytesOf(source)).startsWith('﻿');
    } catch {
      return false;
    }
  });
  assert.deepEqual(findings.map((kase) => kase['id']), []);
});

test('T3.37: no case of contracts/core.json has the key ok, since a case without raises already states that the member returns', () => {
  const findings = Object.keys(isObject(core) ? core : {}).flatMap((name) =>
    group(name).filter((kase) => 'ok' in kase).map((kase) => `${name} ${String(kase['id'])} has the key ok`),
  );
  assert.deepEqual(findings, []);
});
