// Checks the evidence that the feature record names: the feature rows of docs/features.md and its translation, the release
// assets of the published features, the benchmark result and the JSON reports of docs/; with --records also the verification
// records of the checkout against the current sources. The documents themselves (translation pairs, links, anchors,
// checklists) are checked by check-documents of @polyspec/kit (make docs-check). The Markdown is read with mdast.
//
//   node scripts/check-evidence.mts [--records] [--root <directory>]
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import type { Nodes, Root, Table } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toString } from 'mdast-util-to-string';
import { gfm } from 'micromark-extension-gfm';
import { readJsonFile } from './json.mts';
import { present } from './present.mts';
import { AGGREGATE_RECORD, PIE_RECORD, externalPins, manifestDifferences, packageRevisions, sourceManifest, type Manifest } from './records.mts';
import { IMPLEMENTATIONS, ROOT, argumentCases, artifactPaths, fixturePaths, officialCases, repositoryPaths, trackedFiles } from './registry.mts';

const PRIVATE_PATH = /\/(?:Users|home)\/[^/\s"<>]+\//;
const STATES = ['implemented', 'partial', 'planned'];
const VERIFICATIONS = ['shared-suite', 'package-tests', 'docs-tests', 'benchmark', 'not-verified'];
// The record that backs each verification: the run that verifies a commit, which the validation procedure describes, or the
// committed benchmark result.
const EVIDENCE: Record<string, string> = {
  'shared-suite': 'operations/validation.md#records', 'package-tests': 'operations/validation.md#records',
  'docs-tests': 'operations/validation.md#records', benchmark: '../benchmarks/results.json',
};

const markdown = (text: string): Root => fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
/** The URLs of the links below `node`. */
function links(node: Nodes): string[] {
  if (node.type === 'link') return [node.url];
  return 'children' in node ? node.children.flatMap(child => links(child)) : [];
}
const isFeatureTable = (node: Nodes): node is Table => node.type === 'table' && toString(node.children[0]?.children[0] ?? { type: 'text', value: '' }) === 'ID';

export type Feature = { implementation: string; verification: string; distribution: string; evidence: string[]; specification: string[] };

/** A published distribution cell: `published vX.Y.Z <asset>, ...`, each asset an npm tarball, a Composer zip or a wheel of that version. */
function publishedAsset(distribution: string): boolean {
  const found = /^published v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)) ([A-Za-z0-9_.-]+(?:, [A-Za-z0-9_.-]+)*)$/.exec(distribution);
  if (!found) return false;
  const [, release, assets] = found;
  if (release === undefined || assets === undefined) return false;
  const version = release.replaceAll('.', '\\.');
  return assets.split(', ').every(asset => new RegExp(`^[A-Za-z0-9_.-]+(?:-${version}\\.tgz|-${version}\\.zip|-${version}-py3-none-any\\.whl)$`).test(asset));
}

/** The feature rows of the feature table, the table whose header starts with ID; an invalid row or a missing table fails. */
export function featureRows(text: string): Map<string, Feature> {
  const table = markdown(text).children.find(isFeatureTable);
  if (!table) throw new Error('the feature table is missing: no table has the header ID');
  const rows = new Map<string, Feature>();
  for (const row of table.children.slice(1)) {
    const cells = row.children.map(cell => toString(cell).trim());
    const [identifier = '', feature, implementation = '', verification = '', , distribution = ''] = cells;
    if (cells.length !== 7 || !/^F-[A-Z0-9-]+$/.test(identifier)) throw new Error(`the feature row ${identifier} does not hold ID, feature, implementation, verification, evidence, distribution and specification`);
    if (rows.has(identifier)) throw new Error(`the feature ID ${identifier} is repeated`);
    if (!feature || !STATES.includes(implementation)) throw new Error(`${identifier} has the implementation state ${implementation}, not one of ${STATES.join(', ')}`);
    if (!VERIFICATIONS.includes(verification)) throw new Error(`${identifier} has the verification state ${verification}, not one of ${VERIFICATIONS.join(', ')}`);
    if (distribution.startsWith('published') ? !publishedAsset(distribution) : !['source-only', 'not-distributed'].includes(distribution)) {
      throw new Error(`${identifier} has the distribution ${distribution}: a published feature names its release tag and asset, otherwise source-only or not-distributed`);
    }
    if (implementation !== 'implemented' && verification !== 'not-verified') throw new Error(`${identifier} is ${implementation} and cannot claim a completed verification`);
    const translated = (urls: string[]) => urls.map(url => url.replace('.ko.md', '.md'));
    const evidence = translated(links(present(row.children[4], `the evidence cell of ${identifier}`)));
    const specification = translated(links(present(row.children[6], `the specification cell of ${identifier}`)));
    if (specification.length !== 1) throw new Error(`${identifier} needs one specification link`);
    if (verification !== 'not-verified' && !isDeepStrictEqual(evidence, [EVIDENCE[verification]])) throw new Error(`${identifier} is verified by ${verification} and names ${evidence.join(', ') || 'no evidence'}, not ${EVIDENCE[verification]}`);
    rows.set(identifier, { implementation, verification, distribution, evidence, specification });
  }
  if (rows.size === 0) throw new Error('the feature table has no feature rows');
  return rows;
}

/**
 * The implementation states outside the Implementation cell of a feature row, and the nodes other than the table in the section
 * of the feature table. A state is a code span or a table cell whose whole content is the state word; in prose the word is
 * ordinary English.
 */
function trackerErrors(name: string, text: string): string[] {
  const tree = markdown(text);
  const errors: [number, number, string][] = [];
  const outside = (node: Nodes) => errors.push([positionOf(node).start.line, positionOf(node).start.column, `state \`${toString(node).trim()}\` stands outside the Implementation cell of a feature row`]);
  const visit = (node: Nodes) => {
    if (node.type === 'inlineCode' && STATES.includes(node.value.trim())) outside(node);
    if (node.type === 'table') {
      for (const row of node.children) {
        const feature = toString(row.children[0] ?? { type: 'text', value: '' }).trim().startsWith('F-');
        row.children.forEach((cell, column) => {
          if (STATES.includes(toString(cell).trim()) && cell.children[0]?.type === 'text' && !(feature && column === 2)) outside(cell.children[0]);
        });
      }
    }
    if ('children' in node) node.children.forEach(visit);
  };
  visit(tree);
  const index = tree.children.findIndex(isFeatureTable);
  if (index >= 0) {
    const before = tree.children.slice(0, index).findLastIndex(node => node.type === 'heading');
    const after = tree.children.findIndex((node, at) => at > index && (node.type === 'heading' || /^<a\s+id="[a-z0-9][a-z0-9-]*"\s*><\/a>$/.test(text.slice(positionOf(node).start.offset, positionOf(node).end.offset))));
    for (const node of tree.children.slice(before + 1, after < 0 ? undefined : after)) {
      if (node !== tree.children[index]) errors.push([positionOf(node).start.line, 1, 'the node is not the feature table; the section of the feature table holds only the table']);
    }
  }
  return errors.sort(([a, b], [c, d]) => a - c || b - d).map(([line, column, message]) => `${name}:${line}:${column}: ${message}`);
}

type Counts = { official: number; fixtures: number; arguments: number; supplementary: number; total: number };

/** The case counts of a record: complete, consistent and equal to the shared inputs of `root`. */
function checkCounts(root: string, counts: Counts, label: string): void {
  if (!isDeepStrictEqual(Object.keys(counts ?? {}).sort(), ['arguments', 'fixtures', 'official', 'supplementary', 'total']) || Object.values(counts).some(count => !Number.isInteger(count) || count < 0)) {
    throw new Error(`${label} names the case counts ${JSON.stringify(counts)}, not official, fixtures, arguments, supplementary and total`);
  }
  if (counts.total !== counts.official + counts.fixtures + counts.arguments + counts.supplementary) throw new Error(`${label}: the case total ${counts.total} is not the sum of its counts`);
  const official = officialCases(root).length;
  const fixtures = fixturePaths(root, 'valid').length + fixturePaths(root, 'invalid').length;
  const argumentCount = argumentCases(root).cases.length;
  if (counts.official !== official || counts.fixtures !== fixtures || !fixtures || counts.arguments !== argumentCount) throw new Error(`${label} counts ${counts.official} official examples, ${counts.fixtures} fixtures and ${counts.arguments} argument cases; the repository holds ${official}, ${fixtures} and ${argumentCount}`);
}

/** Supplementary inputs come from outside the repository, so a record names the pinned ones or none. */
function checkSupplementary(root: string, record: { supplementary?: unknown }, counts: Counts): void {
  if (!counts.supplementary) {
    if (record.supplementary !== null) throw new Error('a record that ran no supplementary case names no supplementary inputs');
    return;
  }
  const { project, revision, cases, inputs_sha256 } = externalPins(root).supplementary;
  if (!isDeepStrictEqual(record.supplementary, { project, revision, cases, inputs_sha256 }) || counts.supplementary !== cases) throw new Error('the supplementary inputs differ from the pin in external-inputs.json');
}

/** The sources of a record are the current ones. */
function checkSources(root: string, sources: Manifest | undefined, label: string, fix: string): void {
  const current = sourceManifest(root);
  if (!isDeepStrictEqual(sources, current)) throw new Error(`${label} is stale: the checked sources differ; run ${fix}:\n${manifestDifferences(sources, current).join('\n')}`);
}

type Implementation = { status?: string; cases?: number; runtime?: Record<string, string> };

/** The aggregate record of make verify-all: every implementation passed every shared case of the current sources. */
/** The aggregate record of make verify-all, scripts/schema/verification-record.schema.json. */
type VerificationRecord = { schema_version?: number; status?: string; checked_at?: string; sources?: Manifest; cases: Counts; implementations: Record<string, Implementation>; packages?: unknown; supplementary?: unknown };
/** The PIE record of make pie-check, scripts/schema/pie-record.schema.json. */
type PieRecord = { schema_version?: number; scope?: string; status?: string; checked_at?: string; sources?: Manifest; packages?: unknown; package?: string; pie: { phar_sha256?: string; version?: string }; artifact?: Record<string, string>; commands: { arguments: string[]; exit_code: number }[]; cases: Counts; implementations: Record<string, Implementation>; supplementary?: unknown };
/** benchmarks/results.json as evidence, scripts/schema/benchmark-evidence.schema.json. */
type BenchmarkRecord = { schema_version?: number; source?: Record<string, unknown>; protocol?: unknown; fixtures?: unknown; comparison?: { status?: string } };

/** The position of a node of the parsed Markdown; fromMarkdown gives every node its position. */
function positionOf(node: Nodes): NonNullable<Nodes['position']> {
  if (node.position === undefined) throw new Error(`the Markdown parser gave the ${node.type} node no position`);
  return node.position;
}

function checkVerification(root: string, record: VerificationRecord): void {
  if (record.schema_version !== 2 || record.status !== 'passed' || Number.isNaN(Date.parse(record.checked_at ?? ''))) throw new Error('the verification record is not a passed record of schema 2 with its time');
  checkSources(root, record.sources, 'the verification record', 'make verify-all');
  checkCounts(root, record.cases, 'the verification record');
  if (!isDeepStrictEqual(Object.keys(record.implementations).sort(), [...IMPLEMENTATIONS].sort())) throw new Error(`the verification record names ${Object.keys(record.implementations).join(', ')}, not every implementation ${IMPLEMENTATIONS.join(', ')}`);
  for (const [name, result] of Object.entries(record.implementations)) {
    if (result.status !== 'passed' || result.cases !== record.cases.total || !result.runtime || !Object.keys(result.runtime).length) throw new Error(`the result of ${name} is incomplete: ${JSON.stringify(result)}`);
  }
  const native = record.implementations['php-extension']?.runtime ?? {};
  if ('php-extension' in record.implementations && (!native.extension_version || !native.php)) throw new Error('the verification record names the PHP release and the extension version separately');
  if (!isDeepStrictEqual(record.packages, packageRevisions(root))) throw new Error('the package revisions of the verification record differ from the current sources');
  checkSupplementary(root, record, record.cases);
}

/** The PIE record of make pie-check: PIE built the extension, and its module passed every shared case of the current sources. */
function checkPieVerification(root: string, record: PieRecord): void {
  if (record.schema_version !== 1 || record.scope !== 'pie-build' || record.status !== 'passed' || Number.isNaN(Date.parse(record.checked_at ?? ''))) throw new Error('the PIE record is not a passed pie-build record of schema 1 with its time');
  checkSources(root, record.sources, 'the PIE record', 'make pie-check');
  if (!isDeepStrictEqual(record.packages, packageRevisions(root))) throw new Error('the package revisions of the PIE record differ from the current sources');
  if (record.package !== 'polyspec/ordered-json-php-ext:*@dev') throw new Error(`the PIE record builds ${record.package}, not polyspec/ordered-json-php-ext:*@dev`);
  const { pie } = externalPins(root);
  if (record.pie.phar_sha256 !== pie.phar_sha256 || !String(record.pie.version).includes(pie.release)) throw new Error('the PIE of the record differs from the pin in external-inputs.json');
  const declared = artifactPaths('php-extension', { paths: repositoryPaths(root), cache: '' }).map(file => path.relative(root, file));
  if (!isDeepStrictEqual(record.artifact, { path: declared[0] }) || declared.length !== 1) throw new Error(`the PIE record names the artifact ${JSON.stringify(record.artifact)}, not only the path ${declared[0]} that the registry declares; a linked module has no reproducible hash`);
  if (record.commands.some(command => command.exit_code !== 0) || !record.commands.some(command => command.arguments[0] === 'build')) throw new Error('the PIE record holds no successful PIE build');
  checkCounts(root, record.cases, 'the PIE record');
  const native = record.implementations['php-extension'];
  if (!isDeepStrictEqual(Object.keys(record.implementations), ['php-extension']) || native?.status !== 'passed' || native.cases !== record.cases.total || !native.runtime?.php || !native.runtime.extension_version) {
    throw new Error('the module that PIE built must pass every shared case, with the PHP release and the extension version');
  }
  checkSupplementary(root, record, record.cases);
}

/** The benchmark result: its timings are of one machine, so it is checked on what it names. */
function checkBenchmark(root: string, record: BenchmarkRecord): void {
  if (record.schema_version !== 2) throw new Error(`the benchmark result has the schema ${record.schema_version}, not 2`);
  if (!isDeepStrictEqual(record.source, { dirty: false })) throw new Error('a benchmark result is evidence only when measured from a clean checkout, and its source holds only dirty');
  const workload = readJsonFile<{ benchmark: unknown; fixtures: unknown }>(path.join(root, 'benchmarks/workload.json'), 'benchmark-workload.schema.json');
  if (!isDeepStrictEqual(record.protocol, workload.benchmark)) throw new Error('the benchmark result uses another protocol than benchmarks/workload.json declares');
  if (!isDeepStrictEqual(record.fixtures, workload.fixtures)) throw new Error('the benchmark result measures other inputs than benchmarks/workload.json declares');
  if (record.comparison?.status === 'failed') throw new Error('a failed benchmark comparison is not evidence');
}

/** The errors of the evidence of the checkout at `root`, and the number of its feature rows. */
export function checkEvidence(root: string, records: boolean): { errors: string[]; features: number } {
  const errors: string[] = [];
  let features = new Map<string, Feature>();
  for (const name of ['docs/features.md', 'docs/features.ko.md']) {
    if (existsSync(path.join(root, name))) errors.push(...trackerErrors(name, readFileSync(path.join(root, name), 'utf8')));
  }
  try {
    features = featureRows(readFileSync(path.join(root, 'docs/features.md'), 'utf8'));
    if (!isDeepStrictEqual(features, featureRows(readFileSync(path.join(root, 'docs/features.ko.md'), 'utf8')))) throw new Error('the English and Korean feature states or references differ');
    const verifications = [...features.values()].map(feature => feature.verification);
    if (records && verifications.some(verification => verification !== 'not-verified')) {
      if (!existsSync(path.join(root, AGGREGATE_RECORD))) throw new Error(`${AGGREGATE_RECORD} does not exist; make verify-all writes it before this check`);
      checkVerification(root, readJsonFile<VerificationRecord>(path.join(root, AGGREGATE_RECORD), 'verification-record.schema.json'));
    }
    if (verifications.includes('benchmark')) checkBenchmark(root, readJsonFile<BenchmarkRecord>(path.join(root, 'benchmarks/results.json'), 'benchmark-evidence.schema.json'));
  } catch (error) {
    errors.push(`docs/features.md: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (records && existsSync(path.join(root, PIE_RECORD))) {
    try {
      checkPieVerification(root, readJsonFile<PieRecord>(path.join(root, PIE_RECORD), 'pie-record.schema.json'));
    } catch (error) {
      errors.push(`${PIE_RECORD}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const report of trackedFiles(root).filter(file => file.startsWith('docs/') && file.endsWith('.json'))) {
    const body = readFileSync(path.join(root, report), 'utf8');
    try {
      JSON.parse(body);
    } catch (error) {
      errors.push(`${report}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (PRIVATE_PATH.test(body)) errors.push(`${report}: a public report contains a local home-directory path`);
  }
  return { errors, features: features.size };
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { records: { type: 'boolean' }, root: { type: 'string' } } });
  const { errors, features } = checkEvidence(path.resolve(values.root ?? ROOT), values.records ?? false);
  for (const error of errors) console.error(error);
  if (errors.length) process.exitCode = 1;
  else console.log(`Evidence check passed: ${features} feature records.`);
}
