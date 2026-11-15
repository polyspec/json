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
type Case = Json & { id: string };
const core = JSON.parse(readFileSync(path.join(ROOT, 'contracts/core.json'), 'utf8')) as Record<string, Case[]>;
const DECODER = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** The bytes of a `source` of binding G-5: its text, or `{"hex": ...}`. */
const bytesOf = (source: unknown): Buffer =>
  typeof source === 'string' ? Buffer.from(source, 'utf8') : Buffer.from(String((source as Json)['hex']), 'hex');
/** The source of a case: its own, or the one of the parse that makes its value. */
const sourceOf = (kase: Case): unknown => kase['source'] ?? ((kase['value'] as Json)['args'] as Json)['source'];
const caseId = (category: string, file: string): string => `${category}_${file.replace(/\.json$/, '')}`.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
const byId = (group: string): Map<string, Case> => new Map((core[group] ?? []).map((kase) => [kase.id, kase]));

test('every fixture is a parse case with its bytes, and every valid one a stringify case with the compact text of the reference', () => {
  const parsed = byId('parse.fixtures');
  const written = byId('stringify.fixtures');
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
  assert.equal(parsed.size + written.size > 0, true, 'contracts/core.json has no fixture group');
  assert.deepEqual(findings, []);
});

test('every official example is a stringify case with its compact text', () => {
  const written = byId('stringify.official');
  const examples = (JSON.parse(readFileSync(path.join(ROOT, 'examples/official.json'), 'utf8')) as { cases: { id: string; source: string; compact: string }[] }).cases;
  assert.ok(examples.length > 0);
  const findings = examples
    .filter(({ id, source, compact }) => {
      const kase = written.get(id.replace(/[^a-z0-9]+/gi, '_').toLowerCase());
      return kase === undefined || sourceOf(kase) !== source || kase['text'] !== compact;
    })
    .map(({ id }) => `stringify.official has no case of ${id}`);
  assert.deepEqual(findings, []);
});

test('every argument case has a case of its member with the same argument and kind', () => {
  const { cases } = JSON.parse(readFileSync(path.join(ROOT, 'contracts/fixtures/arguments.json'), 'utf8')) as { cases: { name: string; call: string; argument: unknown; kind: string | null }[] };
  const groups = (member: string): Case[] => Object.entries(core).filter(([group]) => group === member || group.startsWith(`${member}.`)).flatMap(([, list]) => list);
  const kindOf = (kase: Case): string | null => ((kase['raises'] as Json | undefined)?.['kind'] as string | undefined) ?? null;
  // The value that a case of string_value reads: its receiver, made by a factory of the value, or null without one.
  const receiverValue = (kase: Case): unknown => {
    const receiver = kase['receiver'] as Json | undefined;
    if (receiver === undefined) return kase['units'] === undefined && kase['text'] === undefined && kase['literal'] === undefined ? null : undefined;
    const args = receiver['args'] as Json;
    return { 'value.string': args['text'], 'value.number': Number(args['literal']), 'value.array': args['items'], 'value.object': {}, 'value.boolean': args['value'] }[String(receiver['new'])];
  };
  const keyValue = (key: Json): unknown => (key['kind'] === 'null' ? null : key['kind'] === 'map' ? {} : key['kind'] === 'number' ? Number(key['value']) : key['value']);
  const findings = cases
    .filter(({ call, argument, kind }) => {
      const match = (kase: Case): boolean => kindOf(kase) === kind;
      if (call === 'number') return !groups('value.number').some((kase) => kase['literal'] === argument && match(kase));
      if (call === 'max_depth') return !groups('parse').some((kase) => kase['source'] === '1' && (kase['options'] as Json | undefined)?.['max_depth'] === argument && match(kase));
      if (call === 'string_value') return !groups('value.string_value').some((kase) => JSON.stringify(receiverValue(kase)) === JSON.stringify(argument) && match(kase));
      return !groups('ordered_map.insert').some((kase) => JSON.stringify(keyValue(kase['key'] as Json)) === JSON.stringify(argument) && match(kase));
    })
    .map(({ name }) => `no case of the argument case ${name}`);
  assert.ok(cases.length > 0);
  assert.deepEqual(findings, []);
});

test('a source of a case is text only where the bytes are UTF-8 without a byte order mark', () => {
  const findings = (core['parse.fixtures'] ?? []).filter((kase) => {
    const source = kase['source'];
    if (typeof source !== 'string') {
      try {
        return !DECODER.decode(bytesOf(source)).startsWith('﻿');
      } catch {
        return false;
      }
    }
    return source.startsWith('﻿');
  });
  assert.deepEqual(findings.map((kase) => kase.id), []);
});
