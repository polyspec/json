// The rules of every workflow of .github/workflows, read with the yaml package. Every step that runs a command runs one make
// target, so the environment and the prechecks of the Makefile apply (offline checks, pinned tools). Every job of a matrix
// runs with fail-fast false, and every job that runs make ci-targets uploads its report after a failure too. Every target of
// CHECK_TARGETS, the full suite of make check, runs in exactly one job of ci.yml and push-gate.yml. No job or step has
// timeout-minutes. The last job of ci.yml is ci-passed, the check that the release workflow requires: it runs after every
// other job, needs every other job, runs on their runner and runs make ci-passed with the JSON of needs. The make targets of
// kit come from the installed package @polyspec/kit, so every job of the check workflows installs npm and the packages of
// package-lock.json before any other make step, and mise installs Go, Python and the other tools of mise.toml.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { parse, stringify } from 'yaml';
import { checkJson, readJsonFile } from '../../scripts/json.mts';
import { ROOT, trackedFiles } from '../../scripts/registry.mts';
import { known } from './checkout.mts';

const WORKFLOWS = path.join(ROOT, '.github/workflows');
const REPORT = 'var/report/ci-targets/';
const UPLOAD_REPORT = REPORT;
const KIT_TOOLS = path.dirname(fileURLToPath(import.meta.resolve('@polyspec/kit/run-tests')));
// The target of the jobs that is no part of the full suite: the gate that make check itself applies before it runs.
const GATE_TARGETS: string[] = [];
const ALWAYS = '${{ !cancelled() }}';
// The `on:` block of each workflow. In a tag filter * does not match /, so **/v* covers the tags of the Go modules.
const TRIGGERS: Record<string, unknown> = {
  'ci.yml': { pull_request: null, push: { branches: ['main'] }, workflow_dispatch: null },

};
// The workflows whose checks the release workflow requires on the tagged commit; they run on every push.
const CHECK_WORKFLOWS = ['ci.yml'];
// A step runs one make target: its arguments hold no shell syntax except a ${{ }} expression and, at the end, make variables
// that take an environment variable of the job by name (TAG="$TAG").
const MAKE_STEP = /^make [^|;&`$()]*(\$\{\{[^}]*\}\}[^|;&`$()]*)*( [A-Z][A-Z_]*="\$[A-Z][A-Z_]*")*$/;
const BOOTSTRAP_STEPS = ['make install-tools TOOLS=npm', 'make install-packages'];
const CI_PASSED = 'ci-passed';
const CI_PASSED_RUN = "make ci-passed RESULTS='${{ toJSON(needs) }}'";

type Step = { name?: string; uses?: string; run?: string; if?: string; with?: Record<string, unknown>; env?: Record<string, string> };
type Job = { defaults?: { run?: { 'working-directory'?: string } }; 'runs-on'?: string; if?: string; needs?: string[]; strategy?: { 'fail-fast'?: boolean }; env?: Record<string, string>; steps?: Step[] };
type Workflow = { on?: Record<string, unknown> & { push?: { branches?: string[]; tags?: string[] } }; jobs: Record<string, Job>; concurrency?: unknown; permissions?: unknown };

const read = (name: string) => readFileSync(path.join(WORKFLOWS, name), 'utf8');
const workflow = (text: string): Workflow => {
  const value: unknown = parse(text);
  return checkJson<Workflow>(value, 'workflow.schema.json', 'the workflow');
};
const runs = (job: Job) => (job.steps ?? []).flatMap(step => (step.run === undefined ? [] : [step.run]));
const PACKAGE_BOOTSTRAP = [
  'if [ "$(node -p \'require("./package.json").name\')" != \'@polyspec/kit\' ]; then',
  '  # npm 11 of the runner refuses to run in a folder whose devEngines names npm 12.2.0 (EBADDEVENGINES), so the npm of',
  '  # devEngines runs outside the checkout with --prefix (K938-1).',
  '  root="$PWD"',
  '  version="$(node -p \'require("./package.json").devEngines.packageManager.version\')"',
  '  (cd "${RUNNER_TEMP:?RUNNER_TEMP is not set}" && npm_config_cache="$root/var/bootstrap/npm-cache" npm exec --yes --package="npm@$version" -- npm --prefix "$root" ci --ignore-scripts --allow-remote=root)',
  'fi',
].join('\n') + '\n';

/** Each broken rule of the job ci-passed of ci.yml. */
function ciPassedViolations(name: string, jobs: Record<string, Job>): string[] {
  const job = jobs[CI_PASSED];
  if (!job) return [`${name}: the job ${CI_PASSED} is missing; the release workflow requires it as the check of ${name}`];
  const found: string[] = [];
  const others = Object.keys(jobs).filter(other => other !== CI_PASSED);
  if (Object.keys(jobs).at(-1) !== CI_PASSED) found.push(`${name}: the job ${CI_PASSED} is not the last job; the jobs are ${Object.keys(jobs).join(', ')}`);
  if (job.if !== '${{ always() }}') found.push(`${name}: the job ${CI_PASSED} has if: ${JSON.stringify(job.if)}, not '\${{ always() }}'; it must run after a failed, skipped or cancelled job too`);
  if (!isDeepStrictEqual([...(job.needs ?? [])].sort(), [...others].sort())) found.push(`${name}: the job ${CI_PASSED} needs ${JSON.stringify(job.needs ?? [])}, not every other job ${JSON.stringify(others)}`);
  const runners = [...new Set(others.map(other => known(jobs[other], `the job ${other}`)['runs-on']))];
  if (!isDeepStrictEqual([job['runs-on']], runners)) found.push(`${name}: the job ${CI_PASSED} runs on ${JSON.stringify(job['runs-on'])}, not on the runner of the other jobs ${JSON.stringify(runners)}`);
  if (!isDeepStrictEqual(runs(job), [PACKAGE_BOOTSTRAP, ...BOOTSTRAP_STEPS, CI_PASSED_RUN]) || job.steps?.at(-1)?.run !== CI_PASSED_RUN) found.push(`${name}: the job ${CI_PASSED} runs ${JSON.stringify(runs(job))}, not ${JSON.stringify(BOOTSTRAP_STEPS)} and the last step ${CI_PASSED_RUN}`);
  return found;
}


/** Each broken rule of the workflow `text`, named with the file, the job and the step. */
export function violations(name: string, text: string): string[] {
  const found: string[] = [];
  if (/^\s*timeout-minutes:/m.test(text)) found.push(`${name}: timeout-minutes gives a long operation a deadline; the log shows its progress instead`);
  const parsed = workflow(text);
  // Runners are few, so a new push to a pull request cancels the run of its previous push; a run of a push to main is never cancelled.
  if (name === 'ci.yml' && !isDeepStrictEqual(parsed.concurrency, { group: '${{ github.workflow }}-${{ github.ref }}', 'cancel-in-progress': "${{ github.event_name == 'pull_request' }}" })) {
    found.push(`${name}: a workflow that runs make ci-targets lacks concurrency with group \${{ github.workflow }}-\${{ github.ref }} and cancel-in-progress: \${{ github.event_name == 'pull_request' }}`);
  }
  if (CHECK_WORKFLOWS.includes(name) && !Object.hasOwn(parsed.on ?? {}, 'push')) found.push(`${name}: the workflow runs on ${Object.keys(parsed.on ?? {}).join(', ')}, not on push; the release workflow requires its checks on the tagged commit of main`);
  if (name in TRIGGERS && !isDeepStrictEqual(parsed.on, TRIGGERS[name])) found.push(`${name}: the on: block is ${JSON.stringify(parsed.on)}, not ${JSON.stringify(TRIGGERS[name])}`);
  if (name === 'ci.yml') found.push(...ciPassedViolations(name, parsed.jobs));
  for (const [job, body] of Object.entries(parsed.jobs)) {
    const steps = body.steps ?? [];
    const makes = runs(body).filter(run => run.startsWith('make '));
    if (CHECK_WORKFLOWS.includes(name) && !isDeepStrictEqual(makes.slice(0, BOOTSTRAP_STEPS.length), BOOTSTRAP_STEPS)) {
      found.push(`${name}: job ${job} runs ${JSON.stringify(makes.slice(0, BOOTSTRAP_STEPS.length))} first, not ${JSON.stringify(BOOTSTRAP_STEPS)}; the make targets of kit exist only after @polyspec/kit is installed`);
    }
    if (CHECK_WORKFLOWS.includes(name) && runs(body)[0] !== PACKAGE_BOOTSTRAP) found.push(`${name}: job ${job} lacks the canonical locked-package bootstrap before make`);
    if (!steps.length) found.push(`${name}: job ${job} has no steps`);
    steps.forEach((step, index) => {
      const label = `${name}: job ${job} step ${index + 1} (${step.name ?? step.uses ?? step.run})`;
      if (step.run !== undefined && !MAKE_STEP.test(step.run) && !(step.name === 'bootstrap the installed kit package' && step.run === PACKAGE_BOOTSTRAP)) found.push(`${label} runs \`${step.run}\`; a step runs one make target, never a script or a tool directly`);
      // mise installs every tool of mise.lock at once (make install-tools): TOOLS names only npm, the bootstrap.
      const tools = /^make install-tools TOOLS=(.+)$/.exec(step.run ?? '');
      if (tools && !/^npm$|^"[a-zA-Z][a-zA-Z0-9-]*( [a-zA-Z][a-zA-Z0-9-]*)*"$/.test(known(tools[1], 'TOOLS selectors'))) found.push(`${label} runs make install-tools TOOLS=${tools[1]}; TOOLS uses quoted selector names at the locked versions`);
      if (/^actions\/setup-(python|go)@/.test(step.uses ?? '')) found.push(`${label} installs a toolchain of mise.toml; make install-tools installs it`);
      // .php-version is the one declaration of the PHP of the checkout, which the release workflow of kit sets up (kit K193).
      if (step.uses?.startsWith('shivammathur/setup-php@') && (step.with?.['php-version-file'] !== '.php-version' || step.with['php-version'] !== undefined)) found.push(`${label} does not read the PHP from php-version-file: .php-version alone`);
      // setup-node caches the dependencies of the packageManager by default with the npm of the machine; the npm of var/tools installs them.
      if (step.uses?.startsWith('actions/setup-node@') && step.with?.['package-manager-cache'] !== false) found.push(`${name}: job ${job} step ${index + 1} (setup-node) lacks package-manager-cache: false; the npm of var/tools installs the packages`);
    });
    if (body.strategy && body.strategy['fail-fast'] !== false) found.push(`${name}: job ${job} has a matrix without fail-fast: false; one failed job would cancel the others`);
    if (!makes.some(run => run.startsWith('make ci-targets '))) continue;
    const upload = steps.find(step => step.uses?.startsWith('actions/upload-artifact@'));
    if (!upload || upload.if !== ALWAYS || upload.with?.path !== UPLOAD_REPORT) found.push(`${name}: job ${job} runs make ci-targets without the report step: actions/upload-artifact of ${UPLOAD_REPORT} under if: ${ALWAYS}`);
    steps.slice(1).forEach((step, index) => {
      if (step.if !== ALWAYS) found.push(`${name}: job ${job} step ${index + 2} does not run after a failed step (if: ${ALWAYS})`);
    });
  }
  return found;
}

/** The targets of every `make ci-targets TARGETS="..."` step of a workflow. */
const ciTargets = (text: string): string[] => Object.values(workflow(text).jobs).flatMap(job => runs(job).flatMap(run => (run.startsWith('make ci-targets ') ? known(/TARGETS="([^"]*)"/.exec(run)?.[1], `the TARGETS of ${run}`).split(' ') : [])));
// gates.yml and release.yml are vendored from @polyspec/kit, which tests them: no test of this repository reads them (ruling 3).
const KIT_WORKFLOWS = ['gates.yml', 'release.yml'];
const names = () => readdirSync(WORKFLOWS).filter(name => name.endsWith('.yml') && !KIT_WORKFLOWS.includes(name)).sort();
const anyIncludes = (issues: string[], part: string) => issues.some(issue => issue.includes(part));
const changed = (text: string, from: string | RegExp, to: string) => {
  const result = text.replace(from, to);
  assert.notEqual(result, text, `the mutation ${String(from)} changes nothing`);
  return result;
};

// Cross-language verification owns all implementations and starts independently of native jobs.
const LANGUAGE_TARGETS: Record<string, string[]> = {
  js: ['test-js'],
  rust: ['test-rust', 'lint-rust'],
  go: ['test-go', 'lint-go'],
  php: ['test-php', 'lint-php'],
  'php-ext': ['lint-php-ext', 'test-php-ext', 'pie-check'],
  python: ['test-python', 'lint-python'],
};
function parallelViolations(parsed: Workflow): string[] {
  const found: string[] = [];
  const expected = { parity: ['test-markers-check', 'verify-all', 'parity-check'], ...LANGUAGE_TARGETS };
  for (const [name, targets] of Object.entries(expected)) {
    const job = parsed.jobs[name];
    if (job === undefined) { found.push(`missing independent job ${name}`); continue; }
    if ((job.needs?.length ?? 0) > 0) found.push(`${name} waits for another job`);
    if (job.steps?.some(step => step.uses?.startsWith('actions/download-artifact@'))) found.push(`${name} consumes another job's output`);
    const commands = runs(job);
    if (!commands.includes(`make ci-targets TARGETS="${targets.join(' ')}"`)) found.push(`${name} does not own its checks`);
    if (name === 'php') {
      const parser = commands.indexOf('make kit-install-symbols EXTRACTORS="php"');
      const tools = commands.findIndex(command => command.startsWith('make install-tools TOOLS="php '));
      const checks = commands.findIndex(command => command.startsWith('make ci-targets '));
      if (parser <= tools || parser >= checks) found.push('php lacks its autoload parser before lint');
    }
    if (commands.includes('make install-tools')) found.push(`${name} installs unselected tools`);
    if (commands.includes('make install')) found.push(`${name} installs every language through the aggregate installer`);
    if (name !== 'js' && !commands.some(command => command === 'make install-tools' || command.startsWith('make install-tools TOOLS="'))) found.push(`${name} lacks its tool preparation`);
    if (!['parity', 'php-ext'].includes(name) && !commands.includes(`make build-${name}`)) found.push(`${name} lacks its native build`);
  }
  return found;
}

test('T2.83: language checks and cross-language verification start independently', () => {
  const parsed = workflow(read('ci.yml'));
  assert.deepEqual(parallelViolations(parsed), []);
  assert.deepEqual(ciPassedViolations('ci.yml', parsed.jobs), []);
  const reports = Object.values(parsed.jobs).flatMap(job => (job.steps ?? []).filter(step => step.uses?.startsWith('actions/upload-artifact@')).map(step => step.with?.name));
  assert.equal(reports.length, new Set(reports).size, 'parallel jobs upload distinct reports');
});

test('T2.83: serializing parity or a native job and moving shared verification are rejected', () => {
  for (const [name, dependency] of [['parity', 'rust'], ['rust', 'parity']]) {
    const parsed = workflow(read('ci.yml'));
    known(parsed.jobs[known(name, 'job name')], 'the independent job').needs = [known(dependency, 'dependency')];
    assert.ok(parallelViolations(parsed).includes(`${name} waits for another job`));
  }
  const parsed = workflow(read('ci.yml'));
  const parity = known(parsed.jobs.parity, 'the parity job');
  const step = known(parity.steps?.find(step => step.run?.startsWith('make ci-targets ')), 'the parity checks');
  step.run = 'make ci-targets TARGETS="parity-check"';
  assert.ok(parallelViolations(parsed).includes('parity does not own its checks'));
});

test('T2.83-2: PHP lint owns its parser setup and cannot defer it until after checks', () => {
  for (const after of [false, true]) {
    const parsed = workflow(read('ci.yml'));
    const php = known(parsed.jobs.php, 'the php job');
    const steps = known(php.steps, 'the php steps');
    const parser = known(steps.find(step => step.run === 'make kit-install-symbols EXTRACTORS="php"'), 'the PHP parser preparation');
    php.steps = steps.filter(step => step !== parser);
    if (after) php.steps.push(parser);
    assert.ok(parallelViolations(parsed).includes('php lacks its autoload parser before lint'), String(after));
  }
});

test('T2.83-3-2: Go CI uses the unmodified Kit target without an application runner or package selector', () => {
  const makefile = readFileSync(path.join(ROOT, 'Makefile'), 'utf8');
  assert.doesNotMatch(makefile, /^test-go:/m, 'the application cannot replace the Kit recipe');
  assert.match(makefile, /^ordered-json-go-test: test-go$/m, 'the legacy alias delegates to Kit');
  assert.doesNotMatch(makefile, /run-tests\.\$\(KIT_EXT\) go/, 'no application-local Go runner');
  const job = known(workflow(read('ci.yml')).jobs.go, 'the Go job');
  assert.ok(runs(job).includes('make ci-targets TARGETS="test-go lint-go"'));
  assert.equal(job.env?.CASES, undefined, 'the native suite is not narrowed');
  for (const step of job.steps ?? []) assert.equal(step.env?.CASES, undefined, 'no step narrows the native suite');
});

test('every workflow follows the rules', () => {
  assert.deepEqual(names(), ['ci.yml']);
  for (const name of names()) assert.deepEqual(violations(name, read(name)), [], name);
});

test('every target of the full suite runs in exactly one job', () => {
  const suite = known(/^CHECK_TARGETS := (.*)$/m.exec(readFileSync(path.join(ROOT, 'Makefile'), 'utf8'))?.[1], 'CHECK_TARGETS of the Makefile').split(' ');
  const run = CHECK_WORKFLOWS.flatMap(name => ciTargets(read(name)));
  assert.deepEqual([...new Set(suite)], suite, 'CHECK_TARGETS lists a target twice');
  for (const target of suite) assert.equal(run.filter(item => item === target).length, 1, `${target} runs in one job`);
  assert.deepEqual(run.filter(target => !suite.includes(target)), GATE_TARGETS, 'a job runs a target that is not in CHECK_TARGETS');
  assert.equal(run.length, new Set(run).size);
});

test('the PHP and the Python of the checkout are linted in the full suite', () => {
  // make lint-php of kit runs phpcs and PHPStan on the tracked PHP, and make lint-python runs ruff and vulture on the tracked
  // Python and each Python package (a pyproject.toml); the full suite and so CI run each while the checkout has its language.
  const files = trackedFiles(ROOT);
  const lints: [string, (file: string) => boolean][] = [
    ['lint-php', file => file.endsWith('.php')],
    ['lint-python', file => path.posix.basename(file) === 'pyproject.toml'],
  ];
  const suite = known(/^CHECK_TARGETS := (.*)$/m.exec(readFileSync(path.join(ROOT, 'Makefile'), 'utf8'))?.[1], 'CHECK_TARGETS of the Makefile').split(' ');
  for (const [target, owns] of lints) {
    assert.ok(files.some(owns), `the checkout has the language of ${target}`);
    assert.ok(suite.includes(target), `CHECK_TARGETS lacks ${target}`);
  }
});

test('each report is the directory that make ci-targets writes', () => {
  // Read the sibling kit.mk that the Makefile includes, also when npm installs a packed kit without sources.
  assert.ok(readFileSync(path.join(KIT_TOOLS, 'kit.mk'), 'utf8').includes(`CI_REPORT ?= ${REPORT.replace(/\/$/, '')}\n`));
});

test('a job without the report step fails', () => {
  const text = read('ci.yml');
  const message = `ci.yml: job docs runs make ci-targets without the report step: actions/upload-artifact of ${UPLOAD_REPORT} under if: ${ALWAYS}`;
  assert.ok(violations('ci.yml', changed(text, /\n {6}# actions\/upload-artifact[^\n]*\n {6}- name: report\n(?: {8}.*\n)+/, '\n')).includes(message));
  assert.ok(violations('ci.yml', changed(text, '      - name: report\n        if: ${{ !cancelled() }}\n', '      - name: report\n')).includes(message));
  assert.ok(violations('ci.yml', changed(text, `          path: ${UPLOAD_REPORT}\n`, '          path: var/other/\n')).includes(message));
});

test('selected tools keep locked selectors and reject floating versions', () => {
  const text = read('ci.yml');
  assert.deepEqual(violations('ci.yml', changed(text, 'run: make install-tools TOOLS="php composer"\n', 'run: make install-tools TOOLS="uv python"\n')), []);
  assert.ok(anyIncludes(violations('ci.yml', changed(text, 'run: make install-tools TOOLS="php composer"\n', 'run: make install-tools TOOLS="go@latest"\n')), 'TOOLS uses quoted selector names'));
  const setup = changed(text, '      - name: make install-tools TOOLS=npm\n', '      - uses: actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1\n      - name: make install-tools TOOLS=npm\n');
  assert.ok(anyIncludes(violations('ci.yml', setup), 'installs a toolchain of mise.toml'));
});

test('a step that runs a script or a tool directly fails', () => {
  const text = read('ci.yml');
  for (const command of ['node node_modules/@polyspec/kit/dist/push-gate.mjs commit "${{ github.sha }}"', 'cargo test', 'make check && cargo test', '|', 'make release-proof TAG="$(cat tag)"', 'make release-proof TAG="$TAG" && cargo test']) {
    const broken = changed(text, /run: make ci-targets .*/, `run: ${JSON.stringify(command)}`);
    assert.ok(anyIncludes(violations('ci.yml', broken), 'a step runs one make target, never a script or a tool directly'), command);
  }
});

test('a job with a timeout fails', () => {
  assert.ok(anyIncludes(violations('ci.yml', changed(read('ci.yml'), '    runs-on: ubuntu-24.04\n', '    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n')), 'timeout-minutes'));
});

test('setup-node disables its cache', () => {
  // The lock resolves @polyspec/kit, which the npm of var/tools installs, so the cache of setup-node stays off.
  assert.ok('node_modules/@polyspec/kit' in readJsonFile<{ packages: object }>(path.join(ROOT, 'package-lock.json'), 'npm-lock.schema.json').packages);
  assert.deepEqual(['npm-shrinkwrap.json', 'yarn.lock'].filter(name => existsSync(path.join(ROOT, name))), []);
  assert.ok(anyIncludes(violations('ci.yml', changed(read('ci.yml'), '          package-manager-cache: false\n', '')), '(setup-node) lacks package-manager-cache: false'));
});

test('a job that does not install the kit package first fails', () => {
  for (const name of CHECK_WORKFLOWS) {
    assert.ok(anyIncludes(violations(name, changed(read(name), 'run: make install-packages\n', 'run: make verify-all\n')), 'the make targets of kit exist only after @polyspec/kit is installed'), name);
  }
});

test('a new push cancels the previous run of ci only', () => {
  const text = read('ci.yml');
  assert.ok(anyIncludes(violations('ci.yml', changed(text, /\nconcurrency:\n(?: {2}.*\n)+/, '\n')), 'lacks concurrency'));
  assert.ok(anyIncludes(violations('ci.yml', changed(text, "cancel-in-progress: ${{ github.event_name == 'pull_request' }}", 'cancel-in-progress: true')), 'lacks concurrency'));
});

test('every check workflow runs on push and declares exactly its triggers', () => {
  for (const name of CHECK_WORKFLOWS) assert.ok(anyIncludes(violations(name, changed(read(name), '\n  push:\n', '\n  merge_group:\n')), 'not on push'), name);
  const text = read('ci.yml');
  assert.ok(anyIncludes(violations('ci.yml', changed(text, '  workflow_dispatch:\n', '')), 'the on: block is'));
  assert.ok(anyIncludes(violations('ci.yml', changed(text, '  workflow_dispatch:\n', '  workflow_dispatch:\n  merge_group:\n')), 'the on: block is'));
});

test('ci-passed is the last job and needs every other job', () => {
  const text = read('ci.yml');
  const head = known(text.split('\n  ci-passed:\n')[0], 'the jobs before ci-passed');
  const tail = text.slice(head.length + '\n  ci-passed:\n'.length);
  const broken: Record<string, [string, string]> = {
    missing: [`${head}\n`, 'the job ci-passed is missing'],
    'not last': [`${head.replace('\njobs:\n', `\njobs:\n  ci-passed:\n${tail.trimEnd()}\n`)}\n`, 'the job ci-passed is not the last job'],
    'not always': [changed(text, '    if: ${{ always() }}\n', '    if: ${{ success() }}\n'), 'the job ci-passed has if: "${{ success() }}"'],
    'needs no job': [changed(text, '    needs: [docs, parity, js, rust, go, php, php-ext, python]\n', '    needs: []\n'), 'the job ci-passed needs [], not every other job'],
    'another runner': [changed(text, '    needs: [docs, parity, js, rust, go, php, php-ext, python]\n    runs-on: ubuntu-24.04\n', '    needs: [docs, parity, js, rust, go, php, php-ext, python]\n    runs-on: ubuntu-26.04\n'), 'the job ci-passed runs on "ubuntu-26.04", not on the runner of the other jobs'],
    'another step': [changed(text, CI_PASSED_RUN, 'make ci-passed'), `the job ci-passed runs ${JSON.stringify([PACKAGE_BOOTSTRAP, ...BOOTSTRAP_STEPS, 'make ci-passed'])}, not`],
  };
  for (const [kind, [mutated, message]] of Object.entries(broken)) assert.ok(anyIncludes(violations('ci.yml', mutated), message), `${kind}: ${violations('ci.yml', mutated).join('\n')}`);
});

test('a tag push starts none of the workflows whose checks the release requires', () => {
  // make release-verify requires the checks of config/release.json on the tagged commit; a workflow that a tag push started
  // again would run them anew on the same commit, queued, so the release would race against them.
  const { checks } = readJsonFile<{ checks: string[] }>(path.join(ROOT, 'config/release.json'), 'release-config.schema.json');
  for (const check of checks) {
    const owners = names().filter(name => check in workflow(read(name)).jobs);
    assert.equal(owners.length, 1, `the check ${check} is a job of ${owners.join(', ')}`);
    const owner = known(owners[0], `the workflow of the check ${check}`);
    const push = known(workflow(read(owner)).on?.push, `the push trigger of ${owner}`);
    assert.ok(isDeepStrictEqual(push.branches, ['**']) || isDeepStrictEqual(push.branches, ['main']), owner);
    assert.equal(push.tags, undefined);
  }
  assert.deepEqual(names().filter(name => workflow(read(name)).on?.push?.tags !== undefined), []);
});

test('a step that does not run after a failure fails', () => {
  const broken = changed(read('ci.yml'), '      - name: make ci-targets\n        if: ${{ !cancelled() }}\n', '      - name: make ci-targets\n');
  assert.ok(anyIncludes(violations('ci.yml', broken), 'does not run after a failed step'));
});

test('every workflow runs on a fixed image with each action pinned to one commit', () => {
  const pins = new Map<string, Set<string>>();
  for (const name of names()) {
    const text = read(name);
    assert.deepEqual([...new Set([...text.matchAll(/runs-on: (\S+)/g)].map(match => match[1]))], ['ubuntu-24.04'], name);
    for (const [, action] of text.matchAll(/uses: (\S+)/g)) {
      const pin = /^([\w.-]+\/[\w.-]+)@([0-9a-f]{40})$/.exec(known(action, `a uses of ${name}`));
      assert.ok(pin, `${name}: ${action} is pinned to a commit`);
      const [, repository, commit] = pin;
      assert.ok(repository !== undefined && commit !== undefined, `${name}: ${action} names a repository and a commit`);
      pins.set(repository, (pins.get(repository) ?? new Set<string>()).add(commit));
    }
  }
  assert.ok(pins.size);
  for (const [action, commits] of pins) assert.equal(commits.size, 1, `${action} keeps one commit`);
});

test('.php-version declares the PHP minor release, and a setup-php step that names its PHP fails', () => {
  assert.match(readFileSync(path.join(ROOT, '.php-version'), 'utf8'), /^\d+\.\d+\n$/);
  for (const name of ['ci.yml']) {
    assert.ok(anyIncludes(violations(name, changed(read(name), 'php-version-file: .php-version', "php-version: '8.4'")), 'does not read the PHP from php-version-file: .php-version alone'), name);
  }
});


test('each check job bootstraps its locked kit package without sibling checkouts', () => {
  for (const name of CHECK_WORKFLOWS) {
    for (const [jobName, job] of Object.entries(workflow(read(name)).jobs)) {
      const steps = job.steps ?? [];
      const bootstrap = steps.findIndex(step => step.run === PACKAGE_BOOTSTRAP);
      const firstMake = steps.findIndex(step => step.run?.startsWith('make '));
      assert.ok(bootstrap >= 0 && firstMake > bootstrap, `${name}: ${jobName} installs the locked package before make`);
      assert.ok(!steps.some(step => step.with?.repository === 'polyspec/kit'), `${name}: ${jobName} needs no sibling checkout`);
      assert.ok(!runs(job).some(command => /make -C \.\.\/kit|make npm-install|make link$/.test(command)), `${name}: ${jobName} uses release installation`);
    }
  }
});

test('the CI Go toolchain can build the installed Go symbol extractor', () => {
  const declared = known(/^go = "([0-9.]+)"$/m.exec(readFileSync(path.join(ROOT, 'mise.toml'), 'utf8'))?.[1], 'the Go toolchain');
  const required = known(/^go ([0-9.]+)$/m.exec(readFileSync(path.join(KIT_TOOLS, 'symbols/go/go.mod'), 'utf8'))?.[1], 'the extractor Go requirement');
  assert.ok(declared.localeCompare(required, 'en', { numeric: true }) >= 0, `Go ${declared} cannot build the extractor requiring ${required}`);
});


test('CI prepares hook state and installs Rust tools before checks', () => {
  const jobs = workflow(read('ci.yml')).jobs;
  const docs = runs(known(jobs.docs, 'the docs job'));
  const docsCheck = docs.findIndex(command => command.startsWith('make ci-targets '));
  for (const setup of ['make hooks']) {
    const index = docs.indexOf(setup);
    assert.ok(index > docs.indexOf('make install-tools') && index < docsCheck, `${setup} runs after tool installation and before docs checks`);
  }
  const suite = runs(known(jobs.rust, 'the rust job'));
  assert.ok(suite.indexOf('make ordered-json-install-rust-packages') < suite.findIndex(command => command.startsWith('make ci-targets ')), 'Rust dependencies are installed before offline linting');
  assert.match(readFileSync(path.join(ROOT, 'Makefile'), 'utf8'), /fetch --locked --manifest-path node_modules\/@polyspec\/kit\/scripts\/kit\/catch-check-rust\/Cargo.toml/, 'installation fetches the published Rust checker dependencies');
});


test('a missing or altered locked-package bootstrap fails', () => {
  for (const altered of [false, true]) {
    const parsed = workflow(read('ci.yml'));
    const job = known(parsed.jobs.docs, 'the docs job');
    const steps = known(job.steps, 'the docs steps');
    if (altered) {
      const step = known(steps.find(step => step.name === 'bootstrap the installed kit package'), 'the bootstrap step');
      step.run = 'npm ci';
    } else job.steps = steps.filter(step => step.name !== 'bootstrap the installed kit package');
    assert.ok(anyIncludes(violations('ci.yml', stringify(parsed)), 'lacks the canonical locked-package bootstrap'), String(altered));
  }
});
