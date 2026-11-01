// The CI of ordered-json is one pipeline (PRINCIPLES S12): ci.yml calls the workflow that kit gives it as its job kit, which runs
// the gates of kit-gates once and the targets that config/ci.json declares. make kit-check judges the shape of ci.yml; this test
// keeps the full suite whole: every target of CHECK_TARGETS, the full suite of make check, runs in CI as a gate of kit-gates or
// as a target of config/ci.json, and config/ci.json names no gate of kit-gates again.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { ROOT } from '../../scripts/registry.mts';

/** The prerequisites of the make target `target` in the make database of the root Makefile. */
function prerequisites(target: string): string[] {
  const database = spawnSync('make', ['-pnq', '--no-print-directory', '-C', ROOT], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const line = new RegExp(`^${target}:(?!=)(.*)$`, 'm').exec(database.stdout);
  assert.ok(line, `the make database of ${ROOT} declares ${target}: ${database.stderr.trim()}`);
  return (line[1] ?? '').trim().split(/\s+/).filter(Boolean);
}

/** The words of the make variable `name` in the make database of the root Makefile, expanded as make prints it. */
function variable(name: string): string[] {
  const database = spawnSync('make', ['-pnq', '--no-print-directory', '-C', ROOT], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const line = new RegExp(`^${name} :?= (.*)$`, 'm').exec(database.stdout);
  assert.ok(line, `the make database of ${ROOT} declares ${name}`);
  return (line[1] ?? '').trim().split(/\s+/).filter(Boolean);
}

/** Whether `value` is a JSON object. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The targets that config/ci.json declares for the jobs of the pipeline: targets.shared, targets.parity and targets.runtimes. */
function declaredTargets(): string[] {
  const config: unknown = JSON.parse(readFileSync(path.join(ROOT, 'config/ci.json'), 'utf8'));
  const targets = isObject(config) && isObject(config.targets) ? config.targets : {};
  const runtimes = isObject(targets.runtimes) ? Object.values(targets.runtimes) : [];
  return [targets.shared, targets.parity, ...runtimes].flatMap(list => Array.isArray(list) ? list.filter(item => typeof item === 'string') : []);
}

test('every target of the full suite runs in the pipeline, as a gate of kit-gates or a target of config/ci.json', () => {
  const gates = new Set(prerequisites('kit-gates'));
  const declared = new Set(declaredTargets());
  const suite = variable('CHECK_TARGETS');
  assert.ok(suite.length > 0, 'the Makefile declares CHECK_TARGETS');
  assert.deepEqual(suite.filter(target => !gates.has(target) && !declared.has(target)), []);
});

test('config/ci.json names no gate of kit-gates again, which the job kit runs once (S12)', () => {
  const gates = new Set(prerequisites('kit-gates'));
  assert.deepEqual(declaredTargets().filter(target => gates.has(target)), []);
});
