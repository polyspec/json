// T3.64: the kinds of each binding are the shared lists of docs/spec/json-contract.md. Each legacy package had this test
// for itself (TestKindsAreTheSharedLists); the tests that moved to the bindings left it out, so nothing compared a binding
// with the lists. The bindings are generated from one contract, so one test reads the inputs that they share: the kinds of
// packages/rust/interface.json, the lists of the contract, and the hand-written tests of each binding, whose sites name the
// kinds that the binding gives. A listed kind is one that the tests of a binding reach, or its item states that it cannot
// arise in that language; an item that states it of a language whose tests reach the kind is wrong.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { ROOT } from '../../scripts/registry.mts';

const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8');
const tracked = (folder: string): string[] => execFileSync('git', ['ls-files', '--', folder], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);

/** The items of the list after the anchor `anchor` of the contract: the kind and the text of its item. */
function listed(anchor: string): Map<string, string> {
  const spec = read('docs/spec/json-contract.md');
  const start = spec.indexOf(anchor);
  assert.ok(start >= 0, `the contract has the anchor ${anchor}`);
  const items = new Map<string, string>();
  let seen = false;
  for (const line of spec.slice(start).split('\n').slice(1)) {
    const item = /^- `([a-z0-9_]+)`(.*)$/.exec(line);
    if (item?.[1] !== undefined) {
      items.set(item[1], item[2] ?? '');
      seen = true;
    } else if (seen && line.trim() !== '') break;
  }
  return items;
}

/** The kinds of the core: the variants of errors.kinds of the interface contract, in the snake case of a kind. */
function coreKinds(): Set<string> {
  const contract: unknown = JSON.parse(read('packages/rust/interface.json'));
  const kinds = typeof contract === 'object' && contract !== null && 'errors' in contract && typeof contract.errors === 'object' && contract.errors !== null && 'kinds' in contract.errors ? contract.errors.kinds : [];
  assert.ok(Array.isArray(kinds) && kinds.length > 0, 'packages/rust/interface.json names the kinds of the core');
  return new Set(kinds.map((kind: unknown) => {
    const variant = typeof kind === 'object' && kind !== null && 'variant' in kind ? String(kind.variant) : '';
    return (variant.split('::').at(-1) ?? '').replace(/(?<!^)[A-Z]/g, letter => `_${letter}`).toLowerCase();
  }));
}

// The language of each binding as the contract names it, with the folder of its hand-written tests.
const BINDINGS: Record<string, string> = { JavaScript: 'packages/ts/tests', Python: 'packages/python/tests', PHP: 'packages/php-ext/tests' };
// The legacy package of each language of the transition; a language whose package is removed has none.
const LEGACY: Record<string, string> = { JavaScript: 'legacy/packages/js', Python: 'legacy/packages/python', PHP: 'legacy/packages/php', Go: 'legacy/packages/go' };

/** The languages that a sentence of an item says the kind cannot arise in, apart for the bindings and for the legacy packages. */
function cannotArise(text: string): { bindings: Set<string>; legacy: Set<string> } {
  const result = { bindings: new Set<string>(), legacy: new Set<string>() };
  for (const sentence of text.split(/(?<=\.)\s+/)) {
    const clause = /cannot arise(.*)$/.exec(sentence)?.[1];
    if (clause === undefined) continue;
    // A sentence that names the packages of the transition speaks of the legacy packages, wherever it names them.
    const target = sentence.includes('transition') ? result.legacy : result.bindings;
    for (const language of Object.keys(LEGACY)) if (new RegExp(`\\b${language}\\b`).test(clause)) target.add(language);
  }
  return result;
}

test('T3.64: every kind of the core is listed, and every listed kind is of the core, of a binding or of a legacy package', () => {
  const core = coreKinds();
  const items = new Map([...listed('<a id="rejection-kinds"></a>'), ...listed('<a id="argument-kinds"></a>')]);
  // duplicate_object_key is the kind of the option reject_duplicates, which the contract states with the option (RQ-017).
  for (const kind of core) assert.ok(kind === 'duplicate_object_key' || items.has(kind), `the contract lists ${kind}`);
  const sources = Object.values(BINDINGS).flatMap(tracked).map(read).join('\n');
  const legacy = Object.values(LEGACY).flatMap(tracked).filter(file => !/README|\.md$/.test(file)).map(read).join('\n');
  for (const kind of items.keys()) {
    if (core.has(kind)) continue;
    const named = new RegExp(`['"\`]${kind}['"\`]`);
    assert.ok(named.test(sources) || named.test(legacy), `${kind} is no kind of the core, and no test of a binding and no legacy package names it`);
  }
});

test('T3.64: an item states that a kind cannot arise in a language exactly when the tests of its binding do not reach it', () => {
  const items = new Map([...listed('<a id="rejection-kinds"></a>'), ...listed('<a id="argument-kinds"></a>')]);
  const core = coreKinds();
  const findings: string[] = [];
  for (const [language, folder] of Object.entries(BINDINGS)) {
    const sources = tracked(folder).map(read).join('\n');
    for (const [kind, text] of items) {
      const stated = cannotArise(text).bindings.has(language);
      const reached = new RegExp(`['"\`]${kind}['"\`]`).test(sources);
      // internal is a broken invariant, which only an injected fault of the generated tests raises (RQ-033).
      if (kind === 'internal') continue;
      if (reached && stated) findings.push(`${kind}: its item states that it cannot arise in ${language}, and ${folder} names it`);
      if (!reached && !stated && core.has(kind)) findings.push(`${kind}: ${folder} does not name it, and its item does not state that it cannot arise in ${language}`);
    }
  }
  for (const [kind, text] of items) {
    for (const language of cannotArise(text).legacy) {
      if (tracked(LEGACY[language] ?? '').length === 0) findings.push(`${kind}: its item names ${language} among the packages of the transition, and ${LEGACY[language]} is removed`);
    }
  }
  assert.deepEqual(findings, []);
});
