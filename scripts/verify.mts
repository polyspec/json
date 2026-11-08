// The shared verifier: it builds the selected implementations in a run directory of their own, sends every shared case to
// the probe of each (one document path in, one JSON reply out) and compares each reply with the expected result: the golden
// results of examples/official.json, and for the repository fixtures and the optional supplementary suite the independent
// reference (reference.mts). Every implementation must also reject the same input at the same position with the same kind,
// one of the list of the JSON contract. The package tests of each implementation are no part of it: make test-<language>
// runs them with the native runner of each language.
//
//   node scripts/verify.mts [--only <implementation>]... [--suite <JSONTestSuite checkout>]
//   node scripts/verify.mts --record [--suite <checkout>]   every implementation, then var/records/verification.json and the
//                                                            evidence check of that record (make verify-all)
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { reference, Rejected, type Accepted } from './reference.mts';
import { AGGREGATE_RECORD, externalPins, inputIssues, manifestDifferences, packageRevisions, sourceManifest, supplementaryManifest, writeRecord, type Manifest, type Supplementary } from './records.mts';
import { parseJson } from './json.mts';
import { present } from './present.mts';
import { Failures, IMPLEMENTATIONS, ROOT, officialCases, endGroup, fixturePaths, prepare, probeCommands, runtimeVersions, withRun, type Argv, type Run } from './registry.mts';

/** The text that every probe builds through its string factory, compact. */
const FACTORY_STRING = '"quote \\" slash \\\\ line\\n \\ud55c \\ud83c\\udf0d"';
// The shared list of rejection kinds: the items of the section of that anchor of the JSON contract.
const CONTRACT = 'docs/spec/json-contract.md';
const KINDS_ANCHOR = '<a id="rejection-kinds"></a>';
/** Each probe reply has this long after its request; a whole run has no limit. */
const CASE_SECONDS = 60;
export const SUITE_FIX = 'run make install-tools, which installs the http:jsontestsuite of mise.toml';

type Expected = Accepted | { ok: false };
export type Case = { name: string; file: string; expected: Expected };
type Reply = Record<string, unknown> & { ok?: boolean; offset?: unknown; unit?: unknown; kind?: unknown };
export type Counts = { official: number; fixtures: number; supplementary: number };

/** The expected result of a supplementary or fixture input that the reference rejects: a rejection. */
function referenceOrRejection(bytes: Uint8Array): Expected {
  try {
    return reference(bytes);
  } catch (error) {
    if (error instanceof Rejected) return { ok: false };
    throw error;
  }
}

/** The shared cases: the official examples (written into `directory`), the fixtures and the cases of the optional suite. */
export function sharedCases(directory: string, suite?: string, root = ROOT): { cases: Case[]; counts: Counts } {
  const cases: Case[] = [];
  const official = officialCases(root);
  for (const example of official) {
    const file = path.join(directory, `${example.id}.json`);
    writeFileSync(file, example.input);
    cases.push({ name: `official/${example.id}`, file, expected: { ok: true, raw: example.input, serialized: example.compact, compact: example.compact, tree: example.tree, rebuilt: example.tree } });
  }
  for (const category of ['valid', 'invalid'] as const) {
    for (const file of fixturePaths(root, category)) {
      // A valid fixture must be valid for the reference too; an invalid one is a rejection by its folder.
      const expected = category === 'valid' ? reference(readFileSync(file)) : { ok: false as const };
      cases.push({ name: path.relative(root, file), file, expected });
    }
  }
  let supplementary = 0;
  if (suite !== undefined) {
    const folder = path.join(suite, 'test_parsing');
    const names = readdirSync(folder).filter(name => name.endsWith('.json')).sort();
    if (names.length === 0) throw new Error(`the supplementary suite ${suite} has no case in test_parsing/`);
    for (const name of names) {
      const file = path.join(folder, name);
      // n_ must be rejected; y_ must be accepted, so the reference accepts it or fails; i_ is what the reference decides.
      const expected = name.startsWith('n_') ? { ok: false as const } : name.startsWith('y_') ? reference(readFileSync(file)) : referenceOrRejection(readFileSync(file));
      cases.push({ name: `JSONTestSuite/${name}`, file, expected });
    }
    supplementary = names.length;
  }
  return { cases, counts: { official: official.length, fixtures: cases.length - official.length - supplementary, supplementary } };
}

/**
 * The byte offset of a reported position in `document`. A UTF-16 offset counts code units, so a prefix may end between the
 * halves of a surrogate pair; the byte position is then the first byte of that character.
 */
export function byteOffset(document: Uint8Array, offset: number, unit: unknown): number {
  if (unit === 'byte') return offset;
  if (unit !== 'utf16') throw new Error(`a rejection reports the unit of its offset, byte or utf16, not ${JSON.stringify(unit)}`);
  let prefix = new TextDecoder().decode(document).slice(0, offset);
  if (/[\ud800-\udbff]$/.test(prefix)) prefix = prefix.slice(0, -1);
  return Buffer.byteLength(prefix);
}

/** The disagreements of the positions at which the implementations reject each document. */
export function positionDisagreements(rejections: Map<string, Map<string, Reply>>, documents: Map<string, Uint8Array>): string[] {
  const disagreements: string[] = [];
  for (const [name, reported] of [...rejections].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (reported.size < 2) continue;
    const resolved = [...reported].sort(([a], [b]) => (a < b ? -1 : 1)).map(([language, reply]) => {
      const { offset } = reply;
      if (typeof offset !== 'number' || !Number.isInteger(offset)) throw new Error(`${language} ${name}: a rejection reports its offset`);
      return [language, byteOffset(present(documents.get(name), `the document of ${name}`), offset, reply.unit)] as const;
    });
    if (new Set(resolved.map(([, offset]) => offset)).size > 1) disagreements.push(`${name}: ${resolved.map(([language, offset]) => `${language}=${offset}`).join(', ')}`);
  }
  return disagreements.length ? [`the implementations reject the same input at different positions:\n${disagreements.join('\n')}`] : [];
}

/** The rejection kinds: the list items of the section that KINDS_ANCHOR opens in the JSON contract, up to the next heading or anchor. */
export function rejectionKinds(root = ROOT): string[] {
  const text = readFileSync(path.join(root, CONTRACT), 'utf8');
  const start = text.indexOf(KINDS_ANCHOR);
  if (start < 0) throw new Error(`${CONTRACT} has no section ${KINDS_ANCHOR}`);
  const [section] = text.slice(start).split('\n').slice(2).join('\n').split(/^(?:<a id=|#)/m);
  if (section === undefined) throw new Error(`${CONTRACT} has no text after ${KINDS_ANCHOR}`);
  const kinds = [...section.matchAll(/^- `([a-z][a-z0-9_]*)`/gm)].map(match => present(match[1], 'the kind of a list item'));
  if (kinds.length === 0 || new Set(kinds).size !== kinds.length) throw new Error(`${CONTRACT} lists no rejection kind, or one twice, in its section ${KINDS_ANCHOR}: ${kinds.join(', ')}`);
  return kinds;
}

/** The disagreements of the kinds that the implementations name for each rejected document, each a kind of `known`. */
export function kindDisagreements(rejections: Map<string, Map<string, Reply>>, known: string[] = rejectionKinds()): string[] {
  const missing = new Set<string>();
  const unknown = new Set<string>();
  const disagreements: string[] = [];
  for (const [name, reported] of [...rejections].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const seen = new Map<string, string[]>();
    for (const [language, reply] of reported) {
      if (typeof reply.kind !== 'string') {
        missing.add(language);
        continue;
      }
      const kind = reply.kind;
      if (!known.includes(kind)) unknown.add(`${language}: unknown rejection kind ${kind}`);
      seen.set(kind, [...(seen.get(kind) ?? []), language]);
    }
    if (seen.size > 1) disagreements.push(`${name}: ${[...seen].sort(([a], [b]) => (a < b ? -1 : 1)).map(([kind, languages]) => `${kind}=${languages.sort((a, b) => (a < b ? -1 : 1)).join(',')}`).join(', ')}`);
  }
  const problems = [...[...missing].sort((a, b) => (a < b ? -1 : 1)).map(language => `${language}: rejections report no kind`), ...[...unknown].sort((a, b) => (a < b ? -1 : 1)), ...disagreements];
  return problems.length ? [`the implementations name different reasons for rejecting a document:\n${problems.slice(0, 20).join('\n')}`] : [];
}

/**
 * One probe process: one request line in, one reply line out, each with a deadline of CASE_SECONDS. Only LF delimits a reply,
 * since a JSON string may hold U+2028 and U+2029. Standard error is read alongside, so a probe never blocks on a full pipe.
 */
export class Probe {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly started = performance.now();
  private stdout = '';
  private stderr = '';
  private closed = false;
  private wake: (() => void) | undefined;
  private readonly exit: Promise<number>;

  readonly language: string;
  private readonly seconds: number;

  /** A probe of `language` started with `command`, whose replies and exit each have `seconds`. */
  constructor(language: string, [program, ...args]: Argv, seconds = CASE_SECONDS) {
    this.language = language;
    this.seconds = seconds;
    this.child = spawn(program, args, { detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stdout.setEncoding('utf8').on('data', (chunk: string) => { this.stdout += chunk; this.wake?.(); });
    this.child.stderr.setEncoding('utf8').on('data', (chunk: string) => { this.stderr += chunk; });
    // A probe that has gone away is reported by the reply it does not give.
    this.child.stdin.on('error', () => {});
    this.exit = new Promise((resolve) => {
      this.child.on('error', (error) => { this.stderr += `${error.message}\n`; this.closed = true; this.wake?.(); resolve(127); });
      this.child.on('close', (code, signal) => { this.closed = true; this.wake?.(); resolve(code ?? (signal ? 128 : 1)); });
    });
  }

  get elapsed(): string {
    return `${Math.round(performance.now() - this.started)} ms`;
  }

  /** Waits until `ready`, the close of the probe or the deadline; true when the deadline passed first. */
  private async until(ready: () => boolean): Promise<boolean> {
    const deadline = performance.now() + this.seconds * 1000;
    while (!ready() && !this.closed) {
      const remaining = deadline - performance.now();
      if (remaining <= 0) return true;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, remaining);
        this.wake = () => { clearTimeout(timer); resolve(); };
      });
      this.wake = undefined;
    }
    return false;
  }

  /** The reply to the document `file` of the case `name`, and its time in milliseconds. */
  async exchange(name: string, file: string): Promise<[string, number]> {
    const sent = performance.now();
    this.child.stdin.write(`${file}\n`);
    if (await this.until(() => this.stdout.includes('\n'))) {
      this.stop();
      throw new Error(`${this.language} ${name}: no reply within ${this.seconds} s; stopped after ${this.elapsed}`);
    }
    const end = this.stdout.indexOf('\n');
    if (end < 0) throw new Error(`${this.language} probe failed at ${name}:\n${this.stderr}`);
    const line = this.stdout.slice(0, end);
    this.stdout = this.stdout.slice(end + 1);
    return [line, performance.now() - sent];
  }

  /** Closes the input and requires the probe to exit with status 0, no output left over and nothing on standard error. */
  async finish(): Promise<void> {
    this.child.stdin.end();
    if (await this.until(() => false)) {
      this.stop();
      throw new Error(`${this.language} probe: no exit within ${this.seconds} s after the last reply`);
    }
    const code = await this.exit;
    if (code !== 0) throw new Error(`${this.language} probe failed with exit ${code}:\n${this.stderr}`);
    if (this.stderr) throw new Error(`${this.language} probe emitted warnings:\n${this.stderr}`);
    if (this.stdout) throw new Error(`${this.language} probe gave more replies than cases`);
  }

  /** Ends the process group of the probe, grandchildren included. */
  stop(): void {
    endGroup(this.child.pid);
  }
}

const shown = (value: unknown): string => (JSON.stringify(value) ?? 'undefined').slice(0, 500);

/** The mismatches of one reply: one message for each field that differs. A rebuilt document is read by the reference. */
function mismatches(language: string, name: string, expected: Expected, reply: Reply): string[] {
  let actual: Reply = reply;
  let wanted: Record<string, unknown> = expected;
  if (reply.ok) {
    // An expected rejection has no compact text or tree, so an accepted reply differs from it in those fields too.
    const accepted = expected.ok ? expected : undefined;
    wanted = { ...expected, roundtrip: accepted?.compact, roundtrip_tree: accepted?.tree, factory: FACTORY_STRING };
    // Constructors may quote names differently, so the rebuilt JSON is compared by its tree, with unique names.
    try {
      actual = { ...reply, rebuilt: reference(Buffer.from(String(reply.rebuilt)), true).tree };
    } catch (error) {
      if (error instanceof Rejected) return [`${language} ${name}: invalid rebuilt JSON: ${error.message}`];
      throw error;
    }
  }
  return [...new Set([...Object.keys(actual), ...Object.keys(wanted)])].sort()
    .filter(key => !isDeepStrictEqual(actual[key], wanted[key]))
    .map(key => `${language} ${name}: ${key}\nexpected ${shown(wanted[key])}\nactual   ${shown(actual[key])}`);
}

/**
 * Sends every shared case to the probe of each implementation and compares the replies. Every case of every probe runs; a
 * probe that stops answering ends its own cases only. Failures names every failure after all ran.
 */
export async function verifyProbes(commands: Record<string, Argv>, suite?: string, root = ROOT): Promise<{ results: Record<string, { status: 'passed'; cases: number }>; counts: Counts }> {
  const directory = mkdtempSync(path.join(tmpdir(), 'ordered-json-examples-'));
  try {
    const { cases, counts } = sharedCases(directory, suite, root);
    const documents = new Map(cases.map(({ name, file }) => [name, readFileSync(file)]));
    const rejections = new Map<string, Map<string, Reply>>();
    const results: Record<string, { status: 'passed'; cases: number }> = {};
    const failures: string[] = [];
    const failed = new Set<string>();
    for (const [language, command] of Object.entries(commands)) {
      const probe = new Probe(language, command);
      const found: string[] = [];
      try {
        for (const { name, file, expected } of cases) {
          const [line, elapsed] = await probe.exchange(name, file);
          let reply = parseJson<Reply>(line, 'probe-reply.schema.json', `${language} ${name}`);
          if (!reply.ok) {
            // A rejection also reports where it stopped and why; those are compared across implementations.
            rejections.set(name, (rejections.get(name) ?? new Map<string, Reply>()).set(language, reply));
            reply = { ok: false };
          }
          const differences = mismatches(language, name, expected, reply);
          found.push(...differences);
          if (!differences.length) console.log(`${language}: ${name} ok (${Math.round(elapsed)} ms)`);
        }
        await probe.finish();
      } catch (error) {
        // The probe stopped answering or broke the protocol; its remaining cases cannot run.
        found.push(error instanceof Error ? error.message : String(error));
      } finally {
        probe.stop();
      }
      if (found.length) {
        failures.push(...found);
        failed.add(language);
        console.log(`${language}: ${found.length} failures in ${cases.length} cases (${probe.elapsed})`);
        continue;
      }
      console.log(`${language}: ${counts.official} official examples + ${cases.length - counts.official} shared cases passed (${probe.elapsed})`);
      results[language] = { status: 'passed', cases: cases.length };
    }
    failures.push(...positionDisagreements(rejections, documents), ...kindDisagreements(rejections));
    if (failures.length) throw new Failures(failures, failed);
    if (rejections.size) console.log('rejection positions and kinds agree across implementations');
    console.log('All selected implementations match the same expected results.');
    return { results, counts };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Builds the selected implementations in `run` and verifies their probes; Failures names every failure of both steps. */
export async function verify(selected: string[], run: Run, suite?: string, warnings: { implementation: string; message: string }[] = []) {
  const failures: string[] = [];
  const failed = new Set<string>();
  try {
    warnings.push(...await prepare(selected, run));
  } catch (error) {
    if (!(error instanceof Failures)) throw error;
    failures.push(...error.failures);
    error.implementations.forEach(name => failed.add(name));
  }
  // An implementation whose build failed has no probe to compare.
  const built = selected.filter(name => !failed.has(name));
  failures.push(...[...failed].map(name => `${name}: the shared cases did not run because its build failed`));
  let verified;
  if (built.length) {
    try {
      verified = await verifyProbes(probeCommands(built, run), suite);
    } catch (error) {
      if (!(error instanceof Failures)) throw error;
      failures.push(...error.failures);
    }
  }
  if (failures.length) throw new Failures(failures, failed);
  if (verified === undefined) throw new Error('no implementation was selected');
  return verified;
}

/**
 * The aggregate record of a verification of every implementation of `root`: the sources it began with, which must still be the
 * current ones, every implementation passed with every case and its runtime versions, and the revision of each package.
 */
export function createRecord(root: string, before: Manifest, results: Record<string, { status: string; cases: number }>, counts: Counts, versions: Record<string, Record<string, string>>, supplementary: Supplementary | null, warnings: { implementation: string; message: string }[] = []) {
  const current = sourceManifest(root);
  if (current.sha256 !== before.sha256) throw new Error(`the sources changed during verification; no record was written:\n${manifestDifferences(before, current).join('\n')}`);
  const total = counts.official + counts.fixtures + counts.supplementary;
  if (!counts.official || !counts.fixtures) throw new Error('a record needs the official examples and the repository fixtures');
  const missing = IMPLEMENTATIONS.filter(name => results[name]?.status !== 'passed' || results[name].cases !== total || !Object.keys(versions[name] ?? {}).length);
  if (missing.length) throw new Error(`a record needs every implementation passed with every case and its runtime versions; ${missing.join(', ')} did not`);
  return {
    schema_version: 2,
    status: 'passed',
    checked_at: new Date().toISOString(),
    platform: { system: process.platform, machine: process.arch, node: process.version },
    sources: before,
    cases: { ...counts, total },
    implementations: Object.fromEntries(IMPLEMENTATIONS.map(name => [name, { ...results[name], runtime: versions[name] }])),
    supplementary,
    build_warnings: warnings,
    packages: packageRevisions(root),
  };
}

/** Verifies every implementation, writes the aggregate record and checks it with the evidence check (make verify-all). */
async function record(suite: string | undefined): Promise<void> {
  const before = sourceManifest();
  const supplementary: Supplementary | null = suite === undefined ? null : supplementaryManifest(suite);
  const issues = inputIssues(externalPins(), supplementary ? { supplementary } : {});
  if (issues.length) throw new Failures(issues.map(issue => `external input differs from its pin: ${issue}`));
  const warnings: { implementation: string; message: string }[] = [];
  const { results, counts, versions } = await withRun(IMPLEMENTATIONS, async run => ({ ...await verify(IMPLEMENTATIONS, run, suite, warnings), versions: runtimeVersions(IMPLEMENTATIONS, run) }));
  if (suite !== undefined && !isDeepStrictEqual(supplementaryManifest(suite), supplementary)) throw new Error('the supplementary inputs changed during verification; no record was written');
  writeRecord(path.join(ROOT, AGGREGATE_RECORD), createRecord(ROOT, before, results, counts, versions, supplementary, warnings));
  console.log(`Saved ${AGGREGATE_RECORD}`);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/check-evidence.mts'), '--records'], { cwd: ROOT, stdio: 'inherit' });
}

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { only: { type: 'string', multiple: true }, suite: { type: 'string' }, record: { type: 'boolean' } } });
  const suite = values.suite === undefined ? undefined : path.resolve(values.suite);
  if (suite !== undefined && !existsSync(path.join(suite, 'test_parsing'))) {
    console.error(`the supplementary suite ${values.suite} has no test_parsing/; ${SUITE_FIX}`);
    return 1;
  }
  const unknown = (values.only ?? []).filter(name => !IMPLEMENTATIONS.includes(name));
  if (unknown.length) {
    console.error(`--only names ${unknown.join(', ')}; the implementations of config/implementations.json are ${IMPLEMENTATIONS.join(', ')}`);
    return 2;
  }
  if (values.record && values.only) {
    console.error('--record verifies every implementation; it takes no --only');
    return 2;
  }
  try {
    if (values.record) await record(suite);
    else await withRun(values.only ?? IMPLEMENTATIONS, run => verify(values.only ?? IMPLEMENTATIONS, run, suite));
  } catch (error) {
    if (!(error instanceof Failures)) throw error;
    console.error(`verification failed with ${error.failures.length} failures${values.record ? '; no record was written' : ''}:`);
    for (const failure of error.failures) console.error(`- ${failure.replaceAll('\n', '\n  ')}`);
    return 1;
  }
  return 0;
}

if (import.meta.main) process.exitCode = await main();
