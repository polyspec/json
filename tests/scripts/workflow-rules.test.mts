// The CI of json is one pipeline (PRINCIPLES S12): ci.yml calls ci-pipeline.yml of this repository as its job kit,
// whose steps run the target of each job by name: kit-gates-static, kit-gates-verify and kit-gates-runtime-<runtime> for each
// runtime of its matrix. This test keeps the full suite whole: every target of CHECK_TARGETS, the full suite of make check, is
// a prerequisite of exactly one target that a step of the pipeline runs, and those targets hold no other target.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { ROOT } from '../../scripts/registry.mts';

/** The make database of the root Makefile. */
function database(): string {
  return spawnSync('make', ['-pnq', '--no-print-directory', '-C', ROOT], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout;
}

/** The prerequisites of the make target `target` in the make database `text`. */
function prerequisites(text: string, target: string): string[] {
  const line = new RegExp(`^${target}:(?!=)(.*)$`, 'm').exec(text);
  assert.ok(line, `the make database of ${ROOT} declares ${target}`);
  return (line[1] ?? '').trim().split(/\s+/).filter(Boolean);
}

/** The words of the make variable `name` in the make database `text`, expanded as make prints it. */
function variable(text: string, name: string): string[] {
  const line = new RegExp(`^${name} :?= (.*)$`, 'm').exec(text);
  assert.ok(line, `the make database of ${ROOT} declares ${name}`);
  return (line[1] ?? '').trim().split(/\s+/).filter(Boolean);
}

/** The targets that the steps of the pipeline run through make ci-targets, with matrix.runtime taken from its literal list. */
function jobTargets(): string[] {
  const text = readFileSync(path.join(ROOT, '.github/workflows/ci-pipeline.yml'), 'utf8');
  const runtimes = (/^\s+runtime: \[([^\]]*)\]\s*$/m.exec(text)?.[1] ?? '').split(',').map(value => value.trim()).filter(Boolean);
  assert.ok(runtimes.length > 0, 'the runtime job of the pipeline lists its runtimes');
  return [...text.matchAll(/make ci-targets TARGETS=(.+)$/gm)]
    .map(match => (match[1] ?? '').trim())
    .flatMap(target => (target.includes('${{ matrix.runtime }}') ? runtimes.map(runtime => target.replace('${{ matrix.runtime }}', runtime)) : [target]));
}

test('every target of the full suite runs in exactly one job of the pipeline', () => {
  const text = database();
  const suite = variable(text, 'CHECK_TARGETS');
  assert.ok(suite.length > 0, 'the Makefile declares CHECK_TARGETS');
  const run = jobTargets().flatMap(target => prerequisites(text, target));
  assert.deepEqual(run.filter((target, index) => run.indexOf(target) !== index), [], 'no target runs in two jobs');
  assert.deepEqual([...run].sort(), [...suite].sort());
});

// verify-all reads the PIE record of make pie-check, which holds the sources of the tree that it checked; a record of an earlier
// tree is stale. So verify-all names pie-check as its prerequisite and reads only the record of its own tree, and pie-check is
// no target of its own in the full suite.
test('verify-all writes the PIE record that it reads before it reads it', () => {
  const text = database();
  assert.ok(prerequisites(text, 'verify-all').includes('pie-check'), 'verify-all names pie-check as its prerequisite');
  assert.ok(!variable(text, 'CHECK_TARGETS').includes('pie-check'), 'pie-check runs inside verify-all, not as a target of its own');
});

/** The recipe lines of the make target `target` in the make database `text`, as make prints them, variables unexpanded. */
function recipe(text: string, target: string): string[] {
  const block = new RegExp(`^${target}:(?!=).*\\n((?:#.*\\n)*)((?:\\t.*\\n)*)`, 'm').exec(text);
  assert.ok(block, `the make database of ${ROOT} declares ${target}`);
  return (block[2] ?? '').split('\n').map(line => line.trim()).filter(Boolean);
}

// The Rust sources are in the form of rustfmt, which a review cannot judge by reading: fmt-check checks every crate of the
// workspace, the binding packages included, with cargo fmt --all --check, and the full suite runs it.
test('the full suite checks the form of every crate with cargo fmt', () => {
  const text = database();
  assert.ok(variable(text, 'CHECK_TARGETS').includes('fmt-check'), 'CHECK_TARGETS names fmt-check');
  assert.deepEqual(recipe(text, 'fmt-check'), ['$(CARGO) fmt --all --check']);
});
