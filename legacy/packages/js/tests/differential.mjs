// Requirements: V-6 (5) of docs/spec/json-contract.md#transition (T3.25-1).
// The differential test of the two JavaScript implementations (make test-differential-js): every file of test_parsing of the
// supplementary suite as bytes and every source of examples/official.json parse in this legacy package and in the binding
// package @polyspec/json installed in JSON_BINDING_NODE, and each gives the same outcome in both: the same compact
// serialization, or a rejection of the same kind at the same byte offset. A difference fails, since none has a verdict. It is
// no test of make test-js, which runs the files *.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import * as legacy from '../index.js';

const { JSON_BINDING_NODE, JSON_TEST_SUITE } = process.env;
assert.ok(JSON_BINDING_NODE, 'JSON_BINDING_NODE names the folder in which make binding-node-package installs @polyspec/json');
assert.ok(JSON_TEST_SUITE, 'JSON_TEST_SUITE names the installed supplementary suite (make json-install-suite)');
const binding = createRequire(path.join(JSON_BINDING_NODE, 'package.json'))('@polyspec/json');

function outcome(run) {
  try {
    return { text: run() };
  } catch (error) {
    if (typeof error?.kind !== 'string') throw error;
    return { kind: error.kind, offset: error.offset };
  }
}

const parsing = path.join(JSON_TEST_SUITE, 'test_parsing');
for (const name of readdirSync(parsing).sort()) {
  test(`test_parsing/${name}`, () => {
    const bytes = new Uint8Array(readFileSync(path.join(parsing, name)));
    assert.deepEqual(
      outcome(() => binding.stringify(binding.parse(bytes))),
      outcome(() => legacy.stringify(legacy.parseBytes(bytes))),
    );
  });
}

const official = JSON.parse(readFileSync(new URL('../../../../examples/official.json', import.meta.url), 'utf8'));
for (const example of official.cases) {
  test(`official/${example.id}`, () => {
    assert.deepEqual(
      outcome(() => binding.stringify(binding.parse(example.source))),
      outcome(() => legacy.stringify(legacy.parse(example.source))),
    );
  });
}
