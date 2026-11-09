// The evidence check, on synthetic checkouts: the feature rows and their states, the published assets, the state words outside
// the Implementation cell, and the verification and PIE records against the current sources.
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { checkEvidence, featureRows } from '../../scripts/check-evidence.mts';
import { AGGREGATE_RECORD, PIE_RECORD, sha256, sourceManifest, writeRecord } from '../../scripts/records.mts';
import { ARGUMENTS, FIXTURES, IMPLEMENTATIONS, OFFICIAL, REGISTRY } from '../../scripts/registry.mts';
import { createRecord } from '../../scripts/verify.mts';
import { readJsonFile } from '../../scripts/json.mts';
import { checkout, known } from './checkout.mts';

const HEADER = '| ID | Feature | Implementation | Verification | Evidence | Distribution | Specification |\n| --- | --- | --- | --- | --- | --- | --- |\n';
const ROW = '| F-ORDER | Order | implemented | shared-suite | [result](operations/validation.md#records) | source-only | [contract](../README.md#contract) |\n';
const SOURCE = `${REGISTRY.roots.js}/index.js`;
const SUPPLEMENTARY = { project: 'nst/JSONTestSuite', revision: 'a'.repeat(40), cases: 1, inputs_sha256: sha256('supplementary inputs') };
const VERSIONS = Object.fromEntries(IMPLEMENTATIONS.map(name => [name, name === 'php-extension' ? { php: 'synthetic', extension_version: 'synthetic' } : { version: 'synthetic' }]));

/** A checkout with one feature, one official example, one fixture and the record of a complete verification. */
function evidence(context: TestContext, { before = '', after = '' } = {}) {
  const repository = checkout(context);
  const { root, write, json } = repository;
  const pair = (body: string) => {
    const english = `<!-- doc-id: features -->\n${body}`;
    write('docs/features.md', english);
    write('docs/features.ko.md', `<!-- source-sha256: ${sha256(english)} -->\n${english}`);
  };
  pair(`# Features\n\n<a id="state"></a>\n## State\n\n${before}${HEADER}${ROW}${after}`);
  write(SOURCE, 'export const fixture = true;\n');
  json(OFFICIAL, { cases: [{ id: 'fixture', input: '{}', tree: ['object', []], compact: '{}' }] });
  write(`${FIXTURES}/valid/object.json`, '{}');
  json(ARGUMENTS, { schema: 1, comment: 'synthetic', absent: {}, cases: [{ name: 'number', call: 'number', argument: '1', kind: null }] });
  write('mise.toml', `[tools]\n"http:pie" = { version = "synthetic", url = "https://example.invalid/pie", checksum = "sha256:${sha256('pie tool')}" }\n"http:jsontestsuite" = { version = "${SUPPLEMENTARY.revision}", url = "https://example.invalid/suite", checksum = "sha256:${sha256('suite archive')}" }\n`);
  json('external-inputs.json', { schema_version: 1, supplementary: { cases: SUPPLEMENTARY.cases, inputs_sha256: SUPPLEMENTARY.inputs_sha256 } });
  const record = (supplementary = 0) => createRecord(root, sourceManifest(root), Object.fromEntries(IMPLEMENTATIONS.map(name => [name, { status: 'passed', cases: 3 + supplementary }])), { official: 1, fixtures: 1, arguments: 1, supplementary }, VERSIONS, supplementary ? SUPPLEMENTARY : null);
  writeRecord(path.join(root, AGGREGATE_RECORD), record(), root);
  const change = (file: string, from: string, to: string) => {
    const text = readFileSync(path.join(root, file), 'utf8');
    assert.ok(text.includes(from), `${file} holds ${from}`);
    write(file, text.replace(from, to));
  };
  const fails = (part: string) => {
    const { errors } = checkEvidence(root, true);
    assert.ok(errors.some(error => error.includes(part)), `${part} is not in ${JSON.stringify(errors)}`);
  };
  return { ...repository, pair, change, fails, record };
}

test('a complete record of the current sources passes', (context) => {
  const { root } = evidence(context);
  assert.deepEqual(checkEvidence(root, true), { errors: [], features: 1 });
});

test('a feature row holds every field with a known state and the evidence of its verification', () => {
  assert.equal(featureRows(HEADER + ROW).get('F-ORDER')?.verification, 'shared-suite');
  assert.throws(() => featureRows(HEADER + ROW.replace(' source-only |', '')), /does not hold ID, feature/);
  assert.throws(() => featureRows(HEADER + ROW.replace('| implemented |', '| complete |')), /implementation state complete/);
  assert.throws(() => featureRows(HEADER + ROW.replace('| implemented |', '| planned |')), /cannot claim a completed verification/);
  assert.throws(() => featureRows(HEADER + ROW.replace('[result](operations/validation.md#records)', 'none')), /names no evidence/);
  const packageTests = ROW.replace('F-ORDER', 'F-RUST-SERDE').replace('shared-suite', 'package-tests');
  assert.ok(featureRows(HEADER + packageTests).has('F-RUST-SERDE'));
  assert.throws(() => featureRows(HEADER + packageTests.replace('operations/validation.md#records', 'other.json')), /names other.json/);
});

test('a published feature names its release tag and the assets of that version', () => {
  const published = (distribution: string) => featureRows(HEADER + ROW.replace('source-only', distribution));
  assert.equal(published('published v0.0.8 polyspec-ordered-json-npm-0.0.8.tgz, polyspec_ordered_json-0.0.8-py3-none-any.whl').get('F-ORDER')?.distribution.startsWith('published v0.0.8'), true);
  for (const distribution of ['published', 'published v0.0.8 polyspec-ordered-json-npm-0.0.7.tgz', 'published main polyspec-ordered-json-npm-0.0.8.tgz']) {
    assert.throws(() => published(distribution), /names its release tag and asset/, distribution);
  }
});

test('a state word stands only in the Implementation cell, and the section holds only the table', (context) => {
  const { root } = evidence(context, { after: '\n<a id="limits"></a>\n## Limits\n\n`partial` marks work in progress.\n\n| Kind | State |\n| --- | --- |\n| work | planned |\n' });
  const { errors } = checkEvidence(root, true);
  // The Korean file starts with its source-sha256 line, so its lines are one further.
  for (const [name, offset] of [['docs/features.md', 0], ['docs/features.ko.md', 1]] as const) {
    assert.ok(errors.includes(`${name}:${14 + offset}:1: state \`partial\` stands outside the Implementation cell of a feature row`), JSON.stringify(errors));
    assert.ok(errors.includes(`${name}:${18 + offset}:10: state \`planned\` stands outside the Implementation cell of a feature row`), JSON.stringify(errors));
  }
  assert.equal(errors.length, 4);
  const paragraph = evidence(context, { before: '`implemented` means the behavior exists.\n\n' });
  const found = checkEvidence(paragraph.root, true).errors;
  assert.ok(found.includes('docs/features.md:7:1: the node is not the feature table; the section of the feature table holds only the table'), JSON.stringify(found));
  assert.ok(found.includes('docs/features.md:7:1: state `implemented` stands outside the Implementation cell of a feature row'), JSON.stringify(found));
});

test('the translation names the same states', (context) => {
  const { change, fails } = evidence(context);
  change('docs/features.ko.md', '| source-only |', '| not-distributed |');
  fails('the English and Korean feature states or references differ');
});

test('a changed, added or removed source makes the record stale, which only --records reads', (context) => {
  const { root, write, fails } = evidence(context);
  write(SOURCE, 'export const fixture = false;\n');
  assert.deepEqual(checkEvidence(root, false).errors, []);
  fails(`changed ${SOURCE}`);
  const added = evidence(context);
  added.write(`${REGISTRY.roots.js}/new.js`, 'export const added = true;\n');
  added.fails(`added ${REGISTRY.roots.js}/new.js`);
});

test('the records are the output of the run in var/records, not committed files', (context) => {
  const { root, fails } = evidence(context);
  // A stale record left in docs/ is not read; the evidence is the record of the run.
  writeFileSync(path.join(root, 'docs/verification.json'), JSON.stringify({ sources: { sha256: '0'.repeat(64), files: {} } }));
  assert.deepEqual(checkEvidence(root, true).errors, []);
  rmSync(path.join(root, AGGREGATE_RECORD));
  fails(`${AGGREGATE_RECORD} does not exist`);
});

test('the record names every implementation and the extension version apart from PHP', (context) => {
  const { root, fails } = evidence(context);
  const record = readJsonFile<{ implementations: Record<string, { runtime?: Record<string, string> }> }>(path.join(root, AGGREGATE_RECORD), 'verification-record.schema.json');
  delete known(known(record.implementations['php-extension'], 'the result of php-extension').runtime, 'the runtime of php-extension').extension_version;
  writeRecord(path.join(root, AGGREGATE_RECORD), record, root);
  fails('names the PHP release and the extension version separately');
  delete record.implementations['php-extension'];
  writeRecord(path.join(root, AGGREGATE_RECORD), record, root);
  fails('not every implementation');
});

test('the supplementary inputs and the PIE tool of a record are the pinned ones', (context) => {
  const { root, record, fails } = evidence(context);
  const aggregate = record(1);
  writeRecord(path.join(root, AGGREGATE_RECORD), aggregate, root);
  assert.deepEqual(checkEvidence(root, true).errors, []);
  writeRecord(path.join(root, AGGREGATE_RECORD), { ...aggregate, supplementary: { ...SUPPLEMENTARY, revision: 'b'.repeat(40) } }, root);
  fails('the supplementary inputs differ from the pin');
  writeRecord(path.join(root, AGGREGATE_RECORD), aggregate, root);
  const pie = {
    schema_version: 1, scope: 'pie-build', status: 'passed', checked_at: aggregate.checked_at, sources: aggregate.sources, packages: aggregate.packages,
    pie: { version: 'PIE synthetic', phar_sha256: sha256('pie tool') }, package: 'polyspec/ordered-json-php-ext:*@dev',
    commands: [{ arguments: ['build'], exit_code: 0 }], artifact: { path: `${REGISTRY.roots['php-extension']}/src/modules/polyspec_ordered_json.so` },
    cases: aggregate.cases, implementations: { 'php-extension': { status: 'passed', cases: aggregate.cases.total, runtime: VERSIONS['php-extension'] } }, supplementary: aggregate.supplementary,
  };
  writeRecord(path.join(root, PIE_RECORD), pie, root);
  assert.deepEqual(checkEvidence(root, true).errors, []);
  writeRecord(path.join(root, PIE_RECORD), { ...pie, pie: { ...pie.pie, phar_sha256: sha256('other tool') } }, root);
  fails('the PIE of the record differs from the pin');
  writeRecord(path.join(root, PIE_RECORD), { ...pie, artifact: { path: pie.artifact.path, sha256: 'a'.repeat(64) } }, root);
  fails('a linked module has no reproducible hash');
});

test('a report holds no local home-directory path', (context) => {
  const { json, fails } = evidence(context);
  json('docs/report.json', { path: '/' + 'home/example/project/' });
  fails('docs/report.json: a public report contains a local home-directory path');
});
