// make benchmark-host writes the record of its measurement (T3.12): benchmarks/host-cost.mts runs the measuring command,
// reads one JSON line per measurement with the load average of that moment, warns above the limit without failing, and
// fails only for a usage error, a command that fails, a line that is no measurement and a run without a measurement.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

const SCRIPT = path.join(import.meta.dirname, '../../benchmarks/host-cost.mts');
const LINES = [
  { document: 'one large string', direction: 'out', runs: 21, host_ms: 2, text_ms: 4 },
  { document: 'many small strings', direction: 'in, UTF-16', runs: 21, host_ms: 9, text_ms: 4 },
];

/** A measuring command that prints `lines` and exits with `code`. */
function command(lines: string[], code = 0): string[] {
  return [process.execPath, '-e', `for (const line of ${JSON.stringify(lines)}) console.log(line); process.exitCode = ${code};`];
}

function measure(context: TestContext, lines: string[], code = 0): { status: number | null; stdout: string; stderr: string; report: string } {
  const folder = mkdtempSync(path.join(tmpdir(), 'json-host-cost-'));
  context.after(() => rmSync(folder, { recursive: true, force: true }));
  const report = path.join(folder, 'bench/host-cost-rust.json');
  const run = spawnSync(process.execPath, [SCRIPT, '--report', report, '--', ...command(lines, code)], { encoding: 'utf8' });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr, report };
}

test('the record holds each median, the fixed run count, the ratio and the load average of its measurement', (context) => {
  const run = measure(context, LINES.map((line) => JSON.stringify(line)));
  assert.equal(run.status, 0, run.stderr);
  const record: unknown = JSON.parse(readFileSync(run.report, 'utf8'));
  assert.ok(Array.isArray(record));
  const entries: unknown[] = record;
  assert.equal(entries.length, 2);
  for (const [index, entry] of entries.entries()) {
    assert.ok(entry !== null && typeof entry === 'object');
    const { load_average: load, ...rest }: Record<string, unknown> = { ...entry };
    const line = LINES[index];
    assert.ok(line !== undefined);
    assert.deepEqual(rest, { language: 'rust', ...line, ratio: line.host_ms / line.text_ms });
    assert.ok(Array.isArray(load) && load.length === 3 && load.every((value) => typeof value === 'number' && value >= 0), `load_average of entry ${index}`);
  }
});

test('a ratio above the limit prints a WARNING line with the value and the limit, and the measurement passes', (context) => {
  const run = measure(context, LINES.map((line) => JSON.stringify(line)));
  assert.equal(run.status, 0, run.stderr);
  const warnings = run.stdout.split('\n').filter((line) => line.startsWith('WARNING'));
  assert.deepEqual(warnings, ['WARNING: many small strings in, UTF-16: value_in/value_out takes 2.25 times the time of text, above the limit 1.50']);
  assert.match(run.stdout, /one large string\tout\t.*ratio 0\.50\tload /);
});

test('a usage error fails without a record', (context) => {
  const folder = mkdtempSync(path.join(tmpdir(), 'json-host-cost-'));
  context.after(() => rmSync(folder, { recursive: true, force: true }));
  const report = path.join(folder, 'host-cost-rust.json');
  const none = spawnSync(process.execPath, [SCRIPT, '--', ...command([])], { encoding: 'utf8' });
  assert.notEqual(none.status, 0);
  assert.match(none.stderr, /--report/);
  const bare = spawnSync(process.execPath, [SCRIPT, '--report', report], { encoding: 'utf8' });
  assert.notEqual(bare.status, 0);
  assert.match(bare.stderr, /usage/);
  assert.equal(existsSync(report), false);
});

test('a missing input fails without a record: a command that fails, a line that is no measurement, and no measurement', (context) => {
  const failed = measure(context, [JSON.stringify(LINES[0])], 3);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /exited with 3/);
  assert.equal(existsSync(failed.report), false);
  const other = measure(context, ['Compiling polyspec-json']);
  assert.notEqual(other.status, 0);
  assert.match(other.stderr, /Compiling polyspec-json/);
  assert.equal(existsSync(other.report), false);
  const partial = measure(context, [JSON.stringify({ document: 'one large string', direction: 'out', runs: 21, host_ms: 2 })]);
  assert.notEqual(partial.status, 0);
  assert.match(partial.stderr, /text_ms/);
  const empty = measure(context, []);
  assert.notEqual(empty.status, 0);
  assert.match(empty.stderr, /no measurement/);
  assert.equal(existsSync(empty.report), false);
});
