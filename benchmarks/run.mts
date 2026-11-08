// Runs the equal-workload performance comparison of every implementation (make benchmark, make benchmark-check) and writes
// benchmarks/results.json. Each implementation measures the inputs of benchmarks/workload.json with its own harness
// (benchmarks/js.mjs, benchmarks/php.php, internal/benchmark of the Go package, examples/benchmark.rs of the Rust package), which prints one
// tab-separated row for each input and mode. The PHP extension is built in a copy in the run directory, and cargo builds into
// the run directory too, so no build output of the checkout or of another run decides the result.
//
//   node benchmarks/run.mts [--iterations <n>] [--warmup <n>] [--samples <n>] [--check | --update-baseline]
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { parseJson, readJsonFile } from '../scripts/json.mts';
import { present } from '../scripts/present.mts';
import { writeRecord } from '../scripts/records.mts';
import { ROOT, builtExtension, pathOf, prepare, repositoryPaths, withRun, type Argv } from '../scripts/registry.mts';

type Protocol = { warmup: number; warmup_ms: number; iterations: number; samples: number; median_tolerance: number; p95_tolerance: number };
type Entry = { file: string; input_bytes: number; sha256: string } & Record<(typeof COUNTS)[number] | 'max_depth', number>;
type Row = { file: string; implementation: string; parse_ns: number; stringify_ns: number; roundtrip_ns: number; parse_p95_ns: number; stringify_p95_ns: number; roundtrip_p95_ns: number; samples: unknown; sha256: string; input_bytes: number; output_bytes: number };

const COUNTS = ['objects', 'arrays', 'strings', 'numbers', 'booleans', 'nulls', 'nodes'] as const;
const FIXTURES = path.join(ROOT, 'benchmarks/fixtures');
const RESULTS = path.join(ROOT, 'benchmarks/results.json');
const CURRENT = path.join(ROOT, '.cache/benchmark.current.json');
// The rows whose output must be the same document in every implementation of ordered-json.
const ORDERED = new Set(['js:ordered-json', 'go:ordered-json', 'php:custom', 'php-extension:extension', 'rust:ordered-json']);

/** What a document contains: each kind of node, every node and the deepest level. An object key is a string node of its own. */
export function structure(node: unknown, depth = 0): Record<(typeof COUNTS)[number] | 'max_depth', number> {
  const result = { objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0, nodes: 1, max_depth: depth };
  const merge = (inner: typeof result) => {
    for (const key of COUNTS) result[key] += inner[key];
    result.max_depth = Math.max(result.max_depth, inner.max_depth);
  };
  if (Array.isArray(node)) {
    result.arrays = 1;
    for (const value of node) merge(structure(value, depth + 1));
  } else if (node !== null && typeof node === 'object') {
    result.objects = 1;
    for (const value of Object.values(node)) {
      merge({ objects: 0, arrays: 0, strings: 1, numbers: 0, booleans: 0, nulls: 0, nodes: 1, max_depth: depth + 1 });
      merge(structure(value, depth + 1));
    }
  } else if (typeof node === 'string') result.strings = 1;
  else if (typeof node === 'boolean') result.booleans = 1;
  else if (node === null) result.nulls = 1;
  else result.numbers = 1;
  return result;
}

/** Checks that the workload names exactly the inputs of `directory`, each with its size, sha256 and structure. */
export function validateWorkload(entries: Entry[], directory = FIXTURES): void {
  const declared = entries.map(entry => entry.file).sort();
  const actual = readdirSync(directory).filter(name => name.endsWith('.json')).sort();
  if (!isDeepStrictEqual(actual, declared)) throw new Error(`the workload names ${declared.join(', ')}, but ${directory} holds ${actual.join(', ')}`);
  for (const entry of entries) {
    const source = readFileSync(path.join(directory, entry.file));
    if (source.length !== entry.input_bytes) throw new Error(`${entry.file} has ${source.length} bytes, not the ${entry.input_bytes} of the workload`);
    if (createHash('sha256').update(source).digest('hex') !== entry.sha256) throw new Error(`the sha256 of ${entry.file} differs from the workload`);
    const { file: _file, input_bytes: _bytes, sha256: _sha, ...counts } = entry;
    if (!isDeepStrictEqual(counts, structure(JSON.parse(source.toString('utf8'))))) throw new Error(`the workload does not describe ${entry.file}: ${JSON.stringify(counts)}`);
  }
}

/** Whether the checkout has changes; a result is evidence only when measured from a clean checkout. */
export const sourceState = (): { dirty: boolean } => ({ dirty: execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim() !== '' });

/** The first line that `command` prints, or `unavailable`. */
function version([program, ...args]: Argv): string {
  const result = spawnSync(program, args, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? present(`${result.stdout}${result.stderr}`.split('\n')[0], 'the first line of a version') : 'unavailable';
}

const environment = () => ({
  system: os.type(), release: os.release(), machine: os.machine(),
  node: version(['node', '--version']), go: version(['go', 'version']), php: version(['php', '-n', '-v']), rust: version(['rustc', '--version']),
  cargo: version(['cargo', '--version']), phpize: version(['phpize', '--version']), php_config: version(['php-config', '--version']),
  rust_profile: 'release', php_ini: '-n',
});

/** The rows that a harness prints. */
function measure(label: string, command: Argv, cwd: string, env: NodeJS.ProcessEnv): Row[] {
  const [program, ...args] = command;
  const result = spawnSync(program, args, { cwd, env, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (result.status !== 0) throw new Error(`benchmark ${label} failed with exit ${result.status}: ${command.join(' ')}\n${result.stderr.trim() || result.stdout.trim() || result.error?.message || 'no output'}`);
  return result.stdout.split('\n').filter(Boolean).map((line) => {
    const fields = line.split('\t');
    if (fields.length !== 12) throw new Error(`benchmark ${label} printed a row of ${fields.length} fields, not 12: ${line}`);
    const [file, name, parse, stringify, roundtrip, parse95, stringify95, roundtrip95, samples, sha256, input, output] = fields;
    return {
      file: path.basename(present(file, 'the file of a row')), implementation: `${label}:${present(name, 'the name of a row')}`, parse_ns: Number(parse), stringify_ns: Number(stringify), roundtrip_ns: Number(roundtrip),
      parse_p95_ns: Number(parse95), stringify_p95_ns: Number(stringify95), roundtrip_p95_ns: Number(roundtrip95),
      samples: parseJson<unknown>(present(samples, 'the samples of a row'), 'json-value.schema.json', `the samples of benchmark ${label}`), sha256: present(sha256, 'the sha256 of a row'),
      input_bytes: Number(input), output_bytes: Number(output),
    };
  });
}

/** The comparison of a measurement with the previous result: the median ratio across inputs of each metric within its tolerance. */
export function compare(previous: { environment?: unknown; protocol?: unknown; results: Row[] } | undefined, current: { environment: unknown; protocol: Protocol; results: Row[] }) {
  if (!previous) return { status: 'no-baseline' };
  if (!isDeepStrictEqual(previous.environment, current.environment) || !isDeepStrictEqual(previous.protocol, current.protocol)) {
    return { status: 'not-comparable', reason: 'environment fingerprint or measurement protocol differs' };
  }
  const old = new Map(previous.results.map(row => [`${row.implementation}\0${row.file}`, row]));
  const ratios = new Map<string, { implementation: string; metric: keyof Row; tolerance: number; values: number[] }>();
  const failures: unknown[] = [];
  const { median_tolerance: median, p95_tolerance: p95 } = current.protocol;
  for (const row of current.results.filter(item => ORDERED.has(item.implementation))) {
    const before = old.get(`${row.implementation}\0${row.file}`);
    if (!before) {
      failures.push({ key: [row.implementation, row.file], reason: 'missing baseline' });
      continue;
    }
    for (const [metric, tolerance] of [['parse_ns', median], ['stringify_ns', median], ['roundtrip_ns', median], ['parse_p95_ns', p95], ['stringify_p95_ns', p95], ['roundtrip_p95_ns', p95]] as const) {
      if (before[metric] <= 0) continue;
      const key = `${row.implementation}\0${metric}`;
      const entry = ratios.get(key) ?? { implementation: row.implementation, metric, tolerance, values: [] };
      entry.values.push(row[metric] / before[metric]);
      ratios.set(key, entry);
    }
  }
  for (const { implementation, metric, tolerance, values } of ratios.values()) {
    values.sort((a, b) => a - b);
    const aggregate = present(values[Math.floor(values.length / 2)], 'the median ratio');
    if (aggregate > 1 + tolerance) failures.push({ implementation, metric, aggregate_ratio: aggregate, tolerance, fixture_ratios: values });
  }
  return { status: failures.length ? 'failed' : 'passed', failures };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { iterations: { type: 'string' }, warmup: { type: 'string' }, samples: { type: 'string' }, check: { type: 'boolean' }, 'update-baseline': { type: 'boolean' } } });
  const workload = readJsonFile<{ schema_version: number; benchmark: Protocol; fixtures: Entry[] }>(path.join(ROOT, 'benchmarks/workload.json'), 'benchmark-workload.schema.json');
  if (workload.schema_version !== 2) throw new Error(`benchmarks/workload.json has the schema ${workload.schema_version}, not 2`);
  const count = (given: string | undefined, declared: number) => {
    const value = given === undefined ? declared : Number(given);
    if (!Number.isInteger(value) || value < 1) throw new Error(`a measurement count is a positive integer, not ${given}`);
    return value;
  };
  const protocol: Protocol = { ...workload.benchmark, iterations: count(values.iterations, workload.benchmark.iterations), warmup: count(values.warmup, workload.benchmark.warmup), samples: count(values.samples, workload.benchmark.samples) };
  validateWorkload(workload.fixtures);
  const files = workload.fixtures.map(entry => path.join(FIXTURES, entry.file));
  const env = { ...process.env, OJ_BENCH_ITERATIONS: String(protocol.iterations), OJ_BENCH_WARMUP: String(protocol.warmup), OJ_BENCH_WARMUP_MS: String(protocol.warmup_ms), OJ_BENCH_SAMPLES: String(protocol.samples) };
  const rows = await withRun(['php-extension'], async (run) => {
    await prepare(['php-extension'], run);
    const extension = builtExtension();
    if (!existsSync(extension)) throw new Error('the PHP extension of the benchmark was not built');
    // The directory of each implementation is its root in config/implementations.json.
    const packages = repositoryPaths();
    const php = env;
    const commands: [string, string, Argv, NodeJS.ProcessEnv][] = [
      ['js', ROOT, ['node', 'benchmarks/js.mjs', ...files], { ...env, OJ_PACKAGE: packages.js }],
      ['go', pathOf(packages, 'go'), ['go', 'run', './internal/benchmark', ...files], env],
      ['php', ROOT, ['php', '-n', '-d', `auto_prepend_file=${path.join(pathOf(packages, 'php'), 'vendor/autoload.php')}`, 'benchmarks/php.php', 'custom', ...files], php],
      ['php-native', ROOT, ['php', '-n', 'benchmarks/php.php', 'native-json', ...files], php],
      ['php-extension', ROOT, ['php', '-n', '-d', `extension=${extension}`, 'benchmarks/php.php', 'extension', ...files], php],
      ['rust', ROOT, ['cargo', 'run', '--locked', '--release', '--quiet', '--manifest-path', path.join(pathOf(packages, 'rust'), 'Cargo.toml'), '--example', 'benchmark', '--', ...files], { ...env, CARGO_TARGET_DIR: path.join(run.cache, 'rust-target') }],
    ];
    return commands.flatMap(([label, cwd, command, environment]) => measure(label, command, cwd, environment));
  });
  const digests = new Map<string, Set<string>>();
  for (const row of rows.filter(item => ORDERED.has(item.implementation))) digests.set(row.file, (digests.get(row.file) ?? new Set()).add(row.sha256));
  const inconsistent = [...digests].filter(([, set]) => set.size !== 1);
  if (inconsistent.length) throw new Error(`the implementations of ordered-json wrote different outputs: ${inconsistent.map(([file, set]) => `${file} ${[...set].join(' ')}`).join('; ')}`);
  const expected = ['js:ordered-json', 'js:native-json', 'go:ordered-json', 'go:native-json', 'php:custom', 'php-native:native-json', 'php-extension:extension', 'rust:ordered-json', 'rust:native-json'];
  if (!isDeepStrictEqual([...new Set(rows.map(row => row.implementation))].sort(), [...expected].sort()) || rows.length !== expected.length * files.length) {
    throw new Error(`the benchmark rows are incomplete or repeated: expected ${expected.length * files.length}, got ${rows.length}`);
  }
  for (const row of rows) {
    if (row.input_bytes !== present(workload.fixtures.find(entry => entry.file === row.file), `the workload entry of ${row.file}`).input_bytes) throw new Error(`the input size of ${row.implementation}/${row.file} differs from the workload`);
  }
  const current = { environment: environment(), protocol, results: rows };
  const previous = existsSync(RESULTS) ? readJsonFile<{ environment?: unknown; protocol?: unknown; results: Row[] }>(RESULTS, 'benchmark-results.schema.json') : undefined;
  const comparison = values['update-baseline'] ? { status: 'baseline-updated' } : compare(previous, current);
  const record = { schema_version: 2, source: sourceState(), protocol, environment: current.environment, fixtures: workload.fixtures, results: rows, comparison };
  const failed = comparison.status === 'failed';
  if (failed) {
    writeRecord(CURRENT, record);
    console.log(`Saved the failed measurement for review at ${CURRENT}`);
  } else if (!values.check) {
    writeRecord(RESULTS, record);
  }
  for (const row of rows) console.log(`${row.file.padEnd(24)} ${row.implementation.padEnd(14)} parse=${row.parse_ns.toFixed(0)}ns stringify=${row.stringify_ns.toFixed(0)}ns`);
  console.log(`Comparison: ${JSON.stringify(comparison)}`);
  console.log(`${failed ? 'Kept' : values.check ? 'Checked' : 'Saved'} ${RESULTS}`);
  if (failed) throw new Error('the benchmark regression exceeds the documented tolerance');
}

if (import.meta.main) await main();
