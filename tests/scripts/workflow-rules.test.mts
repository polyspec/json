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

// ASSET-1/2: native platform coverage belongs to this repository's workflow, while binding owns the build recipes.
const NATIVE_PLATFORMS = [
  { platform: 'linux-x64-gnu', runner: 'ubuntu-26.04' },
  { platform: 'linux-arm64-gnu', runner: 'ubuntu-26.04-arm' },
  { platform: 'darwin-arm64', runner: 'macos-15' },
];

function assetJob(source: string, name: string): string {
  const block = new RegExp(`^ {2}${name}:\\n([\\s\\S]*?)(?=^ {2}\\S|$(?![\\s\\S]))`, 'm').exec(source)?.[1];
  assert.ok(block, `assets.yml defines the job ${name}`);
  return block;
}

/** Read the literal include records that these owned asset jobs declare; refuse any unexamined matrix syntax. */
function assetMatrix(job: string): { platform: string; runner: string; php?: string }[] {
  assert.match(job, /^ {4}runs-on: \$\{\{ matrix\.runner \}\}$/m, 'the matrix job runs on its native runner selector');
  const matrix = /^ {6}matrix:\n([\s\S]*?)(?=^ {4}\S)/m.exec(job)?.[1];
  assert.ok(matrix, 'the asset job declares a literal matrix');
  const rows: { platform: string; runner: string; php?: string }[] = [];
  const rest = matrix.replace(/^ {8}include:\s*$/m, '').replace(/^ {10}- platform: ([\w-]+)\n {12}runner: ([\w.-]+)(?:\n {12}php: '(\d+\.\d+)')?/gm, (_entry, platform: string, runner: string, php: string | undefined) => {
    rows.push({ platform, runner, ...(php === undefined ? {} : { php }) });
    return '';
  }).trim();
  assert.equal(rest, '', `the asset matrix has no unchecked entries: ${rest}`);
  assert.ok(rows.length > 0, 'the asset matrix is nonempty');
  return rows;
}

function assetSteps(job: string): string[] {
  return job.split(/^(?= {6}- )/m).filter(step => /^ {6}- /m.test(step));
}

function assetArtifact(job: string): string {
  const uploads = assetSteps(job).filter(step => /uses: actions\/upload-artifact@/.test(step));
  assert.equal(uploads.length, 1, 'each job uploads one artifact');
  const name = /^ {10}name: (.+)$/m.exec(uploads[0] ?? '')?.[1];
  assert.ok(name, 'the upload declares its artifact name');
  return name;
}

/** Every build target belongs to one job; another job cannot silently repeat an asset producer. */
function assertAssetOwnership(source: string): void {
  for (const target of ['release-go-static', 'release-wheel', 'release-npm-platform', 'release-php-ext', 'release-npm']) {
    assert.equal([...source.matchAll(new RegExp(`^ {8}run: make ${target}(?: |$)`, 'gm'))].length, 1, `${target} has exactly one owning job`);
  }
  assert.equal([...source.matchAll(/^ {6}- uses: shivammathur\/setup-php@/gm)].length, 1, 'only the PHP job selects PHP');
}

test('T3.24-1 ASSET-1: non-PHP assets build exactly once on every native platform', () => {
  const source = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  const job = assetJob(source, 'platform');
  assert.deepEqual(assetMatrix(job), NATIVE_PLATFORMS);
  assertAssetOwnership(source);
  assert.doesNotMatch(job, /uses: shivammathur\/setup-php@|run: make release-php-ext\b/, 'the non-PHP job selects and builds no PHP runtime');
  for (const target of ['release-go-static', 'release-wheel', 'release-npm-platform']) {
    assert.equal(assetSteps(job).filter(step => new RegExp(`run: make ${target}\\s*$`, 'm').test(step)).length, 1, `${target} runs once per platform`);
  }
  assert.equal(assetArtifact(job), 'assets-${{ matrix.platform }}');
});

test('T3.24-1 ASSET-1: PHP jobs cover every native platform and supported minor exactly once', () => {
  const minors = phpExtensionMinors();
  const range = String(member(member(readJson('packages/php-ext/composer.json'), 'require'), 'php'));
  const lower = /^>=\s*(\d+\.\d+)/.exec(range)?.[1];
  assert.ok(lower, `packages/php-ext/composer.json requires a PHP range with a lower bound, not ${range}`);
  assert.equal(minors[0], lower, 'the first minor of phpExtension.minors is the lower bound of the PHP range of packages/php-ext/composer.json');
  const source = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  const rows = assetMatrix(assetJob(source, 'php'));
  const expected = NATIVE_PLATFORMS.flatMap(platform => minors.map(php => ({ ...platform, php })));
  const keys = (values: typeof rows) => values.map(row => `${row.platform}:${row.runner}:${row.php ?? ''}`).sort();
  assert.deepEqual(keys(rows), keys(expected), 'the matrix has no missing, repeated or foreign platform/minor pair');
});

function assertPhpBuild(job: string): void {
  const steps = assetSteps(job);
  const setup = steps.filter(step => /uses: shivammathur\/setup-php@/.test(step));
  const builds = steps.filter(step => /run: make release-php-ext\b/.test(step));
  assert.equal(setup.length, 1);
  assert.equal(builds.length, 1);
  assert.match(setup[0] ?? '', /^ {10}php-version: '\$\{\{ matrix\.php \}\}'$/m);
  assert.ok(steps.indexOf(setup[0] ?? '') < steps.indexOf(builds[0] ?? ''), 'runtime setup precedes the build');
  assert.match(builds[0] ?? '', /^ {8}run: make release-php-ext PHP=php EXPECTED_PHP_MINOR=\$\{\{ matrix\.php \}\}\s*$/m);
  assert.match(builds[0] ?? '', /if: \$\{\{ !cancelled\(\) \}\}/);
}

test('T3.24-1 ASSET-2: each PHP job selects one minor and invokes one generated guarded build', () => {
  assertPhpBuild(assetJob(readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8'), 'php'));
});

test('T3.24-1 ASSET-1/2: reject unexamined matrices and misplaced runtime selection', () => {
  const job = assetJob(readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8'), 'php');
  for (const addition of ['        extra: [one, two]\n', '        exclude: []\n', '        include: []\n']) {
    assert.throws(() => assetMatrix(job.replace('        include:\n', `${addition}        include:\n`)), /unchecked entries/);
  }
  const source = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  for (const target of ['release-php-ext', 'release-wheel']) {
    assert.throws(() => assertAssetOwnership(`${source}\n  extra:\n    steps:\n      - name: Repeat build\n        run: make ${target}\n`), /owning job/);
  }
  for (const name of ['platform', 'php']) {
    assert.throws(() => assetMatrix(assetJob(source, name).replace('runs-on: ${{ matrix.runner }}', 'runs-on: ubuntu-26.04')), /native runner selector/);
  }
  for (const addition of ['        extra: [one]\n', '        exclude: []\n']) {
    assert.throws(() => assetMatrix(assetJob(source, 'platform').replace('        include:\n', `${addition}        include:\n`)), /unchecked entries/);
  }
  const steps = assetSteps(job);
  const setup = steps.find(step => /uses: shivammathur\/setup-php@/.test(step));
  const build = steps.find(step => /run: make release-php-ext\b/.test(step));
  assert.ok(setup && build);
  assert.throws(() => assertPhpBuild(job.replace(setup, '').replace(build, build + setup)), /setup precedes/);
  const version = "          php-version: '${{ matrix.php }}'\n";
  assert.throws(() => assertPhpBuild(job.replace(version, '').replace(build, build + version)));
});

test('T3.24-1 ASSET-2: every asset job has a distinct artifact for each matrix result', () => {
  const source = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  const names: string[] = [];
  for (const name of ['platform', 'php', 'npm']) {
    const job = assetJob(source, name);
    const artifact = assetArtifact(job);
    if (name === 'php') assert.equal(artifact, 'assets-php-${{ matrix.platform }}-${{ matrix.php }}');
    const rows = name === 'npm' ? [{}] : assetMatrix(job);
    for (const row of rows) names.push(artifact.replace('${{ matrix.platform }}', 'platform' in row ? String(row.platform) : '').replace('${{ matrix.php }}', 'php' in row ? String(row.php) : ''));
  }
  assert.equal(new Set(names).size, names.length, 'no job or matrix result overwrites another artifact');
  const release = readFileSync(path.join(ROOT, '.github/workflows/release.yml'), 'utf8');
  assert.match(release, /pattern: assets-\*/);
  assert.match(release, /merge-multiple: true/);
});

// docs/spec/json-contract.md#transition: the binding packages of packages/ are the released packages, so the CI runs the
// generated tests of every target of the contract, which hold the cases of contracts/core.json (binding G-5), on the standard
// runner of its language, before a release publishes them. Each target of BINDING_TARGETS has its target test-binding-<target>,
// which a job of the pipeline runs, and the full suite holds it.
test('the pipeline runs the generated tests of every binding target', () => {
  const text = database();
  const targets = variable(text, 'BINDING_TARGETS');
  assert.deepEqual([...targets].sort(), ['go', 'node', 'php', 'python', 'wasm'], 'BINDING_TARGETS names the five targets of the contract');
  const run = jobTargets().flatMap(target => prerequisites(text, target));
  const suite = variable(text, 'CHECK_TARGETS');
  for (const target of ['lint-bindings', 'check-declarations', ...targets.map(name => `test-binding-${name}`)]) {
    assert.ok(run.includes(target), `a job of the pipeline runs ${target}`);
    assert.ok(suite.includes(target), `CHECK_TARGETS names ${target}`);
  }
});
