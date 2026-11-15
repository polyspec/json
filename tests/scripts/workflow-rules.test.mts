// The CI of json is one pipeline (PRINCIPLES S12): ci.yml calls ci-pipeline.yml of this repository as its job kit, whose
// job <job> runs make ci-<job>, and its recipe runs the target of the job through ci-targets: kit-gates-static, kit-gates-verify,
// kit-gates-bindings and kit-gates-runtime-<runtime> for each runtime of its matrix. This test keeps the full suite whole: every
// target of CHECK_TARGETS, the full suite of make check, is a prerequisite of exactly one target that a job of the pipeline
// runs, and those targets hold no other target.
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

/**
 * The targets that the jobs of the pipeline run through make ci-targets, in the make database `text`: the job <job> runs
 * make ci-<job>, whose recipe runs the checks CI_<JOB>_CHECKS, with RUNTIME taken from the literal list of matrix.runtime.
 */
function jobTargets(text: string): string[] {
  const source = readFileSync(path.join(ROOT, '.github/workflows/ci-pipeline.yml'), 'utf8');
  const runtimes = (/^\s+runtime: \[([^\]]*)\]\s*$/m.exec(source)?.[1] ?? '').split(',').map(value => value.trim()).filter(Boolean);
  assert.ok(runtimes.length > 0, 'the runtime job of the pipeline lists its runtimes');
  const jobs = [...source.matchAll(/^ {6}- run: make ci-([\w-]+)(.*)$/gm)].filter(match => match[1] !== 'plan' && match[1] !== 'required');
  assert.ok(jobs.length > 0, 'the jobs of the pipeline run make ci-<job>');
  const targets = member(readJson('config/ci.json'), 'targets');
  const names = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
  return jobs.flatMap(([, job = '', rest = '']) => {
    // ci-setup --job of kit runs kit-gates-static or kit-gates-runtime-<runtime> with the targets of config/ci.json (kit K1250).
    const lines = recipe(text, `ci-${job}`);
    if (lines.some(line => line.includes('ci-setup.mjs --job shared'))) return ['kit-gates-static', ...names(member(targets, 'shared'))];
    if (lines.some(line => line.includes('ci-setup.mjs --job runtime $(RUNTIME)')))
      return runtimes.flatMap(runtime => [`kit-gates-runtime-${runtime}`, ...names(member(member(targets, 'runtimes'), runtime))]);
    const name = `CI_${job.toUpperCase().replace(/-/g, '_')}_CHECKS`;
    assert.ok(recipe(text, `ci-${job}`).some(line => line.includes(`$(${name})`)), `the recipe ci-${job} runs the checks $(${name})`);
    const checks = variable(text, name);
    const perRuntime = rest.includes('RUNTIME=${{ matrix.runtime }}');
    return perRuntime ? runtimes.flatMap(runtime => checks.map(check => check.replace('$(RUNTIME)', runtime))) : checks;
  });
}

test('every target of the full suite runs in exactly one job of the pipeline', () => {
  const text = database();
  const suite = variable(text, 'CHECK_TARGETS');
  assert.ok(suite.length > 0, 'the Makefile declares CHECK_TARGETS');
  const run = jobTargets(text).flatMap(target => prerequisites(text, target));
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

// T3.27: each asset job runs make ci-assets-<job>, whose recipe runs the builds of the job through ci-targets.
const ASSET_JOBS = ['platform', 'php', 'npm'];

/** The builds that the recipe ci-assets-<job> runs through ci-targets, in the make database `text`, the release check aside. */
function assetBuilds(text: string, job: string): string[] {
  const lines = recipe(text, `ci-assets-${job}`).filter(line => line.includes(' ci-targets '));
  assert.equal(lines.length, 1, `the recipe ci-assets-${job} runs its builds through one ci-targets`);
  const targets = / TARGETS="([^"]*)"/.exec(lines[0] ?? '')?.[1];
  assert.ok(targets !== undefined, `the recipe ci-assets-${job} names its builds in TARGETS`);
  return targets.split(/\s+/).filter(target => target !== '' && target !== '$(CI_RELEASE_CHECK)');
}

/** Every build target belongs to one job; another job cannot silently repeat an asset producer. */
function assertAssetOwnership(source: string, builds: Map<string, string[]>): void {
  for (const target of ['release-go-static', 'release-wheel', 'release-npm-platform', 'release-php-ext', 'release-npm']) {
    assert.equal([...builds.values()].flat().filter(build => build === target).length, 1, `${target} has exactly one owning job`);
  }
  assert.equal([...source.matchAll(/^ {6}- uses: shivammathur\/setup-php@/gm)].length, 1, 'only the PHP job selects PHP');
}

/** The builds of every asset job. */
function allAssetBuilds(text: string): Map<string, string[]> {
  return new Map(ASSET_JOBS.map(job => [job, assetBuilds(text, job)]));
}

test('T3.24-1 ASSET-1: non-PHP assets build exactly once on every native platform', () => {
  const source = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  const job = assetJob(source, 'assets-platform');
  assert.deepEqual(assetMatrix(job), NATIVE_PLATFORMS);
  const text = database();
  assertAssetOwnership(source, allAssetBuilds(text));
  assert.doesNotMatch(job, /uses: shivammathur\/setup-php@/, 'the non-PHP job selects no PHP runtime');
  assert.deepEqual(assetBuilds(text, 'platform'), ['release-go-static', 'release-wheel', 'release-npm-platform'], 'each non-PHP asset builds once per platform');
  assert.match(job, /^ {6}- run: make ci-assets-platform RELEASE=\$\{\{ inputs\.release \}\}$/m);
  assert.equal(assetArtifact(job), 'assets-${{ matrix.platform }}');
});

test('T3.24-1 ASSET-1: PHP jobs cover every native platform and supported minor exactly once', () => {
  const minors = phpExtensionMinors();
  const range = String(member(member(readJson('packages/php-ext/composer.json'), 'require'), 'php'));
  const lower = /^>=\s*(\d+\.\d+)/.exec(range)?.[1];
  assert.ok(lower, `packages/php-ext/composer.json requires a PHP range with a lower bound, not ${range}`);
  assert.equal(minors[0], lower, 'the first minor of phpExtension.minors is the lower bound of the PHP range of packages/php-ext/composer.json');
  const source = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  const rows = assetMatrix(assetJob(source, 'assets-php'));
  const expected = NATIVE_PLATFORMS.flatMap(platform => minors.map(php => ({ ...platform, php })));
  const keys = (values: typeof rows) => values.map(row => `${row.platform}:${row.runner}:${row.php ?? ''}`).sort();
  assert.deepEqual(keys(rows), keys(expected), 'the matrix has no missing, repeated or foreign platform/minor pair');
});

/** The PHP job `job` selects the PHP minor of its matrix before its run step, and the recipe `lines` builds for that minor. */
function assertPhpBuild(job: string, lines: string[]): void {
  const steps = assetSteps(job);
  const setup = steps.filter(step => /uses: shivammathur\/setup-php@/.test(step));
  const runs = steps.filter(step => /^ {6}- run: /m.test(step));
  assert.equal(setup.length, 1);
  assert.equal(runs.length, 1);
  assert.match(setup[0] ?? '', /^ {10}php-version: '\$\{\{ matrix\.php \}\}'$/m);
  assert.ok(steps.indexOf(setup[0] ?? '') < steps.indexOf(runs[0] ?? ''), 'runtime setup precedes the build');
  assert.match(runs[0] ?? '', /^ {6}- run: make ci-assets-php PHP_MINOR=\$\{\{ matrix\.php \}\} RELEASE=\$\{\{ inputs\.release \}\}$/m);
  const build = lines.filter(line => / TARGETS="[^"]*\brelease-php-ext\b/.test(line));
  assert.equal(build.length, 1, 'the recipe ci-assets-php builds the extension once');
  assert.match(build[0] ?? '', / PHP=php EXPECTED_PHP_MINOR=\$\(PHP_MINOR\)(\s|$)/, 'the build checks the PHP minor of the job');
}

test('T3.24-1 ASSET-2: each PHP job selects one minor and invokes one generated guarded build', () => {
  assertPhpBuild(assetJob(readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8'), 'assets-php'), recipe(database(), 'ci-assets-php'));
});

test('T3.24-1 ASSET-1/2: reject unexamined matrices and misplaced runtime selection', () => {
  const job = assetJob(readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8'), 'assets-php');
  for (const addition of ['        extra: [one, two]\n', '        exclude: []\n', '        include: []\n']) {
    assert.throws(() => assetMatrix(job.replace('        include:\n', `${addition}        include:\n`)), /unchecked entries/);
  }
  const source = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  const text = database();
  for (const target of ['release-php-ext', 'release-wheel']) {
    const builds = allAssetBuilds(text);
    builds.set('npm', [...(builds.get('npm') ?? []), target]);
    assert.throws(() => assertAssetOwnership(source, builds), /owning job/);
  }
  for (const name of ['assets-platform', 'assets-php']) {
    assert.throws(() => assetMatrix(assetJob(source, name).replace('runs-on: ${{ matrix.runner }}', 'runs-on: ubuntu-26.04')), /native runner selector/);
  }
  for (const addition of ['        extra: [one]\n', '        exclude: []\n']) {
    assert.throws(() => assetMatrix(assetJob(source, 'assets-platform').replace('        include:\n', `${addition}        include:\n`)), /unchecked entries/);
  }
  const lines = recipe(text, 'ci-assets-php');
  const steps = assetSteps(job);
  const setup = steps.find(step => /uses: shivammathur\/setup-php@/.test(step));
  const build = steps.find(step => /run: make ci-assets-php\b/.test(step));
  assert.ok(setup && build);
  assert.throws(() => assertPhpBuild(job.replace(setup, '').replace(build, build + setup), lines), /setup precedes/);
  const version = "          php-version: '${{ matrix.php }}'\n";
  assert.throws(() => assertPhpBuild(job.replace(version, '').replace(build, build + version), lines));
  assert.throws(() => assertPhpBuild(job, lines.map(line => line.replace(' EXPECTED_PHP_MINOR=$(PHP_MINOR)', ''))), /PHP minor of the job/);
});

test('T3.24-1 ASSET-2: every asset job has a distinct artifact for each matrix result', () => {
  const source = readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8');
  const names: string[] = [];
  for (const name of ASSET_JOBS) {
    const job = assetJob(source, `assets-${name}`);
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

// T3.27: a job of a workflow that CI runs holds no content in YAML. Its one run step is make ci-<job> with make variables as its
// only arguments, so a local run of the job is the same call (make ci-runtime RUNTIME=php), and the recipe holds the order and
// the conditions of the job. A matrix value or an input of the called workflow is passed as NAME=${{ matrix.key }} or
// NAME=${{ inputs.key }}; the judgement job, which exists only in CI, passes RESULTS='${{ toJSON(needs) }}'. Every other step
// is a uses: step, which provisions the runner or carries a result, and only a uses: step has an if: condition.
const CI_WORKFLOWS = ['ci.yml', 'ci-pipeline.yml', 'assets.yml', 'release.yml'];
const JUDGEMENT_JOBS = ['required'];

/** One step of a job: whether it is a uses: or a run: step, its run line, and whether it has an if: condition. */
type Step = { uses: boolean; run: string | undefined; condition: boolean; text: string };

/** The workflow `file` of .github/workflows. */
function workflow(file: string): string {
  return readFileSync(path.join(ROOT, '.github/workflows', file), 'utf8');
}

/** The jobs of the workflow `text` with their steps; a job that calls a workflow (uses: at the job) has no steps. */
function workflowJobs(text: string): Map<string, Step[]> {
  const jobs = new Map<string, Step[]>();
  const body = /^jobs:\n([\s\S]*)$/m.exec(text)?.[1];
  assert.ok(body, 'the workflow declares jobs');
  for (const block of body.split(/^(?= {2}[\w-]+:\s*$)/m)) {
    const name = /^ {2}([\w-]+):\s*$/m.exec(block)?.[1];
    if (name === undefined) continue;
    const steps = /^ {4}steps:\n([\s\S]*?)(?=^ {4}\S|(?![\s\S]))/m.exec(block)?.[1] ?? '';
    jobs.set(name, steps.split(/^(?= {6}- )/m).filter(step => /^ {6}- /.test(step)).map(step => {
      const key = (field: string) => new RegExp(`^(?: {6}- | {8})${field}:(.*)$`, 'm').exec(step)?.[1]?.trim();
      return { uses: key('uses') !== undefined, run: key('run'), condition: key('if') !== undefined, text: step.trim() };
    }));
  }
  return jobs;
}

/** The findings of the job `job` of `file` with its steps `steps`, empty when the job follows T3.27. */
function jobFindings(file: string, job: string, steps: Step[]): string[] {
  const where = `${file} job ${job}`;
  const findings: string[] = [];
  const runs = steps.filter(step => step.run !== undefined);
  if (steps.length > 0 && runs.length !== 1) findings.push(`${where} has ${runs.length} run steps; expected one, make ci-${job}`);
  for (const step of steps) {
    if (step.run === undefined && !step.uses) findings.push(`${where} has a step that is neither uses: nor run: ${step.text}`);
    if (step.run !== undefined && step.condition) findings.push(`${where} has a condition on its run step; the recipe ci-${job} holds the conditions`);
  }
  const argument = String.raw`[A-Z][A-Z0-9_]*=(?:[\w./-]*|\$\{\{ (?:matrix|inputs)\.[\w-]+ \}\})`;
  const judgement = JUDGEMENT_JOBS.includes(job) ? String.raw`|RESULTS='\$\{\{ toJSON\(needs\) \}\}'` : '';
  const line = new RegExp(String.raw`^make ci-${job}(?: (?:${argument}${judgement}))*$`);
  for (const step of runs)
    if (!line.test(step.run ?? '')) findings.push(`${where} runs ${JSON.stringify(step.run)}; expected make ci-${job} with make variables only`);
  return findings;
}

test('T3.27: every job of a CI workflow has one run step, make ci-<job> with make variables only', () => {
  const findings = CI_WORKFLOWS.flatMap(file => [...workflowJobs(workflow(file))].flatMap(([job, steps]) => jobFindings(file, job, steps)));
  assert.deepEqual(findings, []);
});

test('T3.27: every run step of a CI workflow names a recipe of the Makefile', () => {
  const text = database();
  for (const file of CI_WORKFLOWS)
    for (const [job, steps] of workflowJobs(workflow(file)))
      if (steps.some(step => step.run !== undefined)) assert.ok(recipe(text, `ci-${job}`).length > 0, `the Makefile defines the recipe ci-${job} of ${file}`);
});

test('T3.27: the check names a run step with content, a condition or an expression', () => {
  const run = (line: string): Step => ({ uses: false, run: line, condition: false, text: `- run: ${line}` });
  const checkout: Step = { uses: true, run: undefined, condition: false, text: '- uses: actions/checkout' };
  const findings = (steps: Step[], job = 'verify') => jobFindings('ci-pipeline.yml', job, steps).join('\n');
  assert.equal(findings([checkout, run('make ci-verify')]), '');
  assert.equal(findings([checkout, run('make ci-runtime RUNTIME=${{ matrix.runtime }}')], 'runtime'), '');
  assert.equal(findings([checkout, run("make ci-required RESULTS='${{ toJSON(needs) }}'")], 'required'), '');
  assert.match(findings([checkout, run('make install-tools TOOLS=go'), run('make ci-verify')]), /2 run steps/);
  assert.match(findings([checkout]), /0 run steps/);
  assert.match(findings([checkout, { ...run('make ci-verify'), condition: true }]), /condition on its run step/);
  assert.match(findings([{ uses: false, run: undefined, condition: false, text: '- name: a step' }, run('make ci-verify')]), /neither uses: nor run:/);
  for (const line of ['make ci-verify TOOLS="${{ join(fromJSON(needs.plan.outputs.common_tools), \' \') }}"', 'make ci-verify && make docs-check', 'make kit-gates-verify', "make ci-verify RESULTS='${{ toJSON(needs) }}'", 'make ci-verify TARGETS=kit-gates-verify-${{ matrix.runtime }}', '|'])
    assert.match(findings([checkout, run(line)]), /make variables only/, line);
  const pipeline = workflowJobs(workflow('ci-pipeline.yml'));
  assert.ok(['plan', 'shared', 'verify', 'runtime', 'bindings', 'required'].every(job => (pipeline.get(job) ?? []).length > 0), 'the parser finds the steps of every job of ci-pipeline.yml');
});

// docs/spec/json-contract.md#transition: the binding packages of packages/ are the released packages, so the CI runs the
// generated tests of every target of the contract, which hold the cases of contracts/core.json (binding G-5), on the standard
// runner of its language, before a release publishes them. Each target of BINDING_TARGETS has its target test-binding-<target>,
// which a job of the pipeline runs, and the full suite holds it.
test('the pipeline runs the generated tests of every binding target', () => {
  const text = database();
  const targets = variable(text, 'BINDING_TARGETS');
  assert.deepEqual([...targets].sort(), ['go', 'node', 'php', 'python', 'wasm'], 'BINDING_TARGETS names the five targets of the contract');
  const run = jobTargets(text).flatMap(target => prerequisites(text, target));
  const suite = variable(text, 'CHECK_TARGETS');
  for (const target of ['lint-bindings', 'check-declarations', ...targets.map(name => `test-binding-${name}`)]) {
    assert.ok(run.includes(target), `a job of the pipeline runs ${target}`);
    assert.ok(suite.includes(target), `CHECK_TARGETS names ${target}`);
  }
});

// T3.29: the recipes call the installed tools by the interface that their pinned releases define. kit 0.0.113 runs a job of the
// pipeline with ci-setup --job shared, --job runtime <runtime> or --required and refuses every other mode, so a recipe that
// passes an older mode stops the job. binding 0.0.7 writes no install-llvm into packages/release.mk: the PHP job provisions
// the LLVM of config/toolchain.json with a uses: step before its run step on a runner whose image holds no such LLVM (macOS),
// and the recipe builds with the LLVM that step installed.
/** The modes that the installed ci-setup of kit accepts, read from its usage error. */
function kitSetupModes(): string[] {
  const source = readFileSync(path.join(ROOT, 'node_modules/@polyspec/kit/dist/ci-setup.mjs'), 'utf8');
  const usage = /unknown CI setup mode \$\{mode\}; use ([^`]*)`/.exec(source)?.[1];
  assert.ok(usage, 'the installed ci-setup of kit names its modes in its usage error');
  return [...new Set([...usage.matchAll(/--[\w-]+/g)].map(match => match[0]))];
}

test('T3.29: every recipe passes ci-setup of kit a mode that the installed kit accepts', () => {
  const modes = kitSetupModes();
  const makefile = readFileSync(path.join(ROOT, 'Makefile'), 'utf8');
  const used = [...makefile.matchAll(/ci-setup\.mjs (--[\w-]+)/g)].map(match => match[1] ?? '');
  assert.ok(used.length > 0, 'the Makefile calls ci-setup of kit');
  assert.deepEqual(used.filter(mode => !modes.includes(mode)), [], `ci-setup of kit accepts ${modes.join(', ')}`);
  for (const [job, call] of [['ci-shared', '--job shared'], ['ci-runtime', '--job runtime $(RUNTIME)'], ['ci-required', '--required']]) {
    assert.ok(recipe(database(), job ?? '').some(line => line.includes(`ci-setup.mjs ${call}`)), `the recipe ${job} runs ci-setup ${call}`);
  }
});

test('T3.29: no recipe makes install-llvm, and the PHP job provisions LLVM on macOS before its run step', () => {
  const text = database();
  for (const job of ['ci-bindings', 'ci-assets-php']) {
    assert.ok(!recipe(text, job).some(line => /\binstall-llvm\b/.test(line)), `the recipe ${job} makes no install-llvm, which binding 0.0.7 no longer writes`);
  }
  const steps = assetSteps(assetJob(readFileSync(path.join(ROOT, '.github/workflows/assets.yml'), 'utf8'), 'assets-php'));
  const llvm = steps.filter(step => /uses: KyleMayes\/install-llvm-action@[0-9a-f]{40}\b/.test(step));
  const run = steps.findIndex(step => /^ {6}- run: /m.test(step));
  assert.equal(llvm.length, 1, 'the PHP job provisions LLVM with one uses: step pinned by commit');
  assert.match(llvm[0] ?? '', /^ {8}if: runner\.os == 'macOS'$/m, 'the step runs on macOS, whose image holds no LLVM of config/toolchain.json');
  const major = String(member(member(readJson('config/toolchain.json'), 'llvm'), 'version'));
  assert.match(llvm[0] ?? '', new RegExp(`^ {10}version: '${major}\\.\\d+\\.\\d+'$`, 'm'), `the step installs LLVM ${major} of config/toolchain.json`);
  assert.ok(steps.indexOf(llvm[0] ?? '') < run, 'the LLVM is provisioned before the run step');
  assert.ok(recipe(text, 'ci-assets-php').some(line => line.includes('$(if $(LLVM_PATH),LLVM_ROOT=$(LLVM_PATH))')), 'the build reads the LLVM that the step installed');
  // install-llvm-action exports DYLD_LIBRARY_PATH and LD_LIBRARY_PATH, which make the PHP of setup-php load the system libsqlite3.
  for (const name of ['DYLD_LIBRARY_PATH', 'LD_LIBRARY_PATH']) {
    assert.match(readFileSync(path.join(ROOT, 'Makefile'), 'utf8'), new RegExp(`^ci-assets-php: ${name} :=$`, 'm'), `the recipe ci-assets-php runs with ${name} empty, which install-llvm-action exports`);
  }
});
