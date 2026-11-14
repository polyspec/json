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

/** The dry run of the make target `target` of the root Makefile: its exit status and the commands that make would run. */
function dryRun(target: string): { status: number | null; output: string } {
  const run = spawnSync('make', ['-n', '--no-print-directory', '-C', ROOT, target], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

// A fresh checkout has no node_modules, so the bootstrap of kit that make install-tools TOOLS=npm runs is not there, and an
// npm of another release refuses the checkout, whose devEngines names its npm (EBADDEVENGINES). make bootstrap installs the
// lock with the npm release of devEngines.packageManager, which npm exec runs outside the checkout with --prefix.
test('make bootstrap installs the lock with the npm of devEngines', () => {
  const { status, output } = dryRun('bootstrap');
  assert.equal(status, 0, `the Makefile defines bootstrap:\n${output}`);
  assert.match(output, /devEngines\.packageManager\.version/, 'the recipe reads the npm release of devEngines.packageManager');
  assert.match(output, /exec --yes --package="npm@\$version" -- npm --prefix "\$root" ci --ignore-scripts/, 'the recipe runs npm ci --ignore-scripts with that release');
  assert.match(output, /npm_config_cache="\$root\/var\/bootstrap\/npm-cache"/, 'the npm cache of the bootstrap is in var/bootstrap of the checkout');
});

/** The member `key` of the JSON object `value`, or undefined. */
function member(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Object.entries(value).find(([name]) => name === key)?.[1] : undefined;
}

/** The JSON value of the file `file` of the repository. */
function readJson(file: string): unknown {
  const value: unknown = JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));
  return value;
}

/** The PHP minors whose extension a release builds: phpExtension.minors of config/toolchain.json. */
function phpExtensionMinors(): string[] {
  const minors = member(member(readJson('config/toolchain.json'), 'phpExtension'), 'minors');
  assert.ok(Array.isArray(minors) && minors.length > 0 && minors.every(minor => typeof minor === 'string'), 'config/toolchain.json names the PHP minors of the extension in phpExtension.minors');
  return minors.map(String);
}

// The PHP extension of packages/php-ext requires the PHP range of its composer.json, and a build of the extension loads in the
// PHP minor that built it alone. So config/toolchain.json names every supported minor, from the lower bound of that range, and
// each job platform of assets.yml builds the extension for each of them: it sets up each minor and builds right after it.
test('assets.yml builds the PHP extension for every PHP minor that the extension supports', () => {
  const minors = phpExtensionMinors();
  const range = String(member(member(readJson('packages/php-ext/composer.json'), 'require'), 'php'));
  const lower = /^>=\s*(\d+\.\d+)/.exec(range)?.[1];
  assert.ok(lower, `packages/php-ext/composer.json requires a PHP range with a lower bound, not ${range}`);
  assert.equal(minors[0], lower, 'the first minor of phpExtension.minors is the lower bound of the PHP range of packages/php-ext/composer.json');
  const text = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  const platform = /^ {2}platform:\n([\s\S]*?)(?=^ {2}\S)/m.exec(text)?.[1] ?? '';
  assert.ok(platform, 'assets.yml defines the job platform');
  // Each step of the job starts with a line `      - `; a setup-php step sets the PHP of the steps after it, by php-version or by
  // php-version-file, and each make release-php-ext PHP=php builds for the PHP that the last setup-php step set.
  const built: string[] = [];
  let current: string | undefined;
  for (const step of platform.split(/^(?= {6}- )/m)) {
    if (/uses: shivammathur\/setup-php@/.test(step)) {
      const file = /php-version-file: (\S+)/.exec(step)?.[1];
      current = file === undefined ? /php-version: '([^']+)'/.exec(step)?.[1] : readFileSync(path.join(ROOT, file), 'utf8').trim();
    } else if (/run: make release-php-ext PHP=php\s*$/m.test(step)) {
      assert.ok(current, 'a setup-php step comes before each build of the PHP extension');
      built.push(current);
    }
  }
  assert.deepEqual(built, minors, 'the job platform sets up each PHP minor of phpExtension.minors and builds the extension for it');
});
