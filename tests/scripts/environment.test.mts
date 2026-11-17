// The environment of every run: the tools are the declared releases, a check reads no network, and make install is the only
// recipe that downloads. The releases are declared in the devEngines.packageManager of package.json, rust-toolchain.toml, .php-version
// and mise.toml, whose Node.js, Go and Python are the pins of @polyspec/kit and which the go line of the go.mod names;
// make install-tools installs the running tools with them, and every target that runs a tool depends on it.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'smol-toml';
import { checkJson, parseJson, readJsonFile } from '../../scripts/json.mts';
import { REGISTRY, ROOT, commandsOf } from '../../scripts/registry.mts';
import { known } from './checkout.mts';

// The targets whose recipe builds or runs an implementation.
const makefile = () => readFileSync(path.join(ROOT, 'Makefile'), 'utf8');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
/** The version that mise.toml declares for the tool `name`. */
function miseVersion(name: string): string {
  const { tools } = checkJson<{ tools: Record<string, unknown> }>(parse(read('mise.toml')), 'mise-config.schema.json', 'mise.toml');
  const version = tools[name];
  assert.ok(typeof version === 'string', `mise.toml declares the version of ${name}`);
  return version;
}
/** The directory of the implementation `name` in config/implementations.json. */
const rootOf = (name: string): string => known(REGISTRY.roots[name], `the root of ${name}`);

test('no runner command installs or selects another toolchain', () => {
  assert.equal(commandsOf('go').env?.GOTOOLCHAIN, 'local');
  assert.equal(commandsOf('rust').env?.RUSTUP_AUTO_INSTALL, '0');
});

test('the declarations name an exact release or a minor release', () => {
  assert.equal(existsSync(path.join(ROOT, '.node-version')), false, 'mise.toml pins Node.js; .node-version is gone');
  assert.equal(existsSync(path.join(ROOT, '.python-version')), false, 'mise.toml pins Python; .python-version is gone');
  assert.match(miseVersion('node'), /^\d+\.\d+\.\d+$/);
  assert.match(miseVersion('go'), /^\d+\.\d+\.\d+$/);
  assert.match(miseVersion('python'), /^\d+\.\d+\.\d+$/);
  assert.match(read('.php-version'), /^\d+\.\d+\n$/);
  assert.match(read('rust-toolchain.toml'), /^channel = "\d+\.\d+\.\d+"$/m);
  assert.match(readJsonFile<{ devEngines: { packageManager: { version: string } } }>(path.join(ROOT, 'package.json'), 'npm-manifest.schema.json').devEngines.packageManager.version, /^\d+\.\d+\.\d+$/);
  // Go is the pin of kit, which mise.toml and the go directive name exactly; the go command drops a toolchain line equal to it.
  const goMod = parseJson<{ Go: string; Toolchain?: unknown }>(execFileSync('go', ['mod', 'edit', '-json'], { cwd: path.join(ROOT, rootOf('go')), encoding: 'utf8' }), 'go-mod-edit.schema.json', 'go mod edit -json');
  assert.equal(goMod.Go, miseVersion('go'));
  assert.equal(goMod.Toolchain, undefined);
});

const BARE_TOOL_COMMAND = /(^|[;&|(])\s*(npm|npx|go|cargo|rustc)(\s|$)/;

test('no recipe runs a pinned tool by name', () => {
  // GNU Make 3.81 looks a simple recipe command up on its own PATH, not on the exported one, so npm, go and cargo start from a
  // script or a shim path, and node, the release of mise.toml, starts by $(NODE) of the Makefile, its path in var/tools (kit K171).
  const lines = makefile().split('\n').filter(line => line.startsWith('\t')).map(line => line.trim().replace(/^[@-]*(\$\(ONLINE\) )?/, ''));
  assert.ok(lines.length);
  for (const command of lines) {
    assert.doesNotMatch(command, BARE_TOOL_COMMAND, command);
    assert.doesNotMatch(command, /(^|\$\$\()node\s/, command);
  }
});

/** The recipe lines of `target` in the Makefile. */
const recipeOf = (target: string) => makefile().split('\n').filter((line, index, all) => line.startsWith('\t') && all.slice(0, index).reverse().find(l => !l.startsWith('\t'))?.startsWith(`${target}:`));

// T3.25-3: the development manifest composer.json holds PHPUnit, so json-lock-update resolves composer.lock too, with Composer.
test('T3.36: json-lock-update writes the locks online and moves only polyspec-binding-core', () => {
  const recipe = recipeOf('json-lock-update');
  assert.equal(recipe.length, 4, recipe.join('\n'));
  assert.match(recipe[1] ?? '', /\$\(ONLINE\) .*npm --prefix "\$\$root" install --package-lock-only --ignore-scripts --no-audit --no-fund$/);
  assert.equal(recipe[2], '\t$(ONLINE) $(COMPOSER) update --no-install --no-interaction --no-progress');
  assert.equal(recipe[3], '\t$(MAKE) --no-print-directory json-cargo-lock-update');
  const cargo = recipeOf('json-cargo-lock-update');
  assert.ok(cargo.some(line => line.includes('$(ONLINE) $(CARGO) update -p polyspec-binding-core --precise $(BINDING_VERSION)')), cargo.join('\n'));
});

// T3.41: when only the npm pin changes, Cargo.lock already holds the binding release of the manifests, and cargo update
// --precise of a git source then reads the version as a git revision (revspec '0.0.13' not found), so json-lock-update
// failed after it had written package-lock.json. The cargo step leaves a lock that holds the release as it is, with no
// network and no git lookup.
test('T3.41: json-cargo-lock-update leaves a lock that already holds the binding release', () => {
  const before = read('Cargo.lock');
  const run = spawnSync('make', ['--no-print-directory', 'json-cargo-lock-update', 'ONLINE=env CARGO_NET_OFFLINE=true'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(read('Cargo.lock'), before);
});

// The build script of ext-php-rs runs again only when the env PHP, PHP_CONFIG or PATH changes, and var/tools/bin/php keeps its
// path when make install-tools wraps another PHP: an extension of another module API stayed in target, which PHP refused to
// load (T3.45). Every cargo run that builds the extension passes the php-config beside the binary of $(PHP), so a change of
// the PHP changes PHP_CONFIG.
test('T3.45: every cargo run that builds the PHP extension passes the php-config of the PHP of the checkout', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 't345-'));
  const php = path.join(dir, 'php');
  writeFileSync(php, `#!/bin/sh\necho ${dir}/bin/php\n`, { mode: 0o755 });
  const run = spawnSync('make', ['-n', '--no-print-directory', 'lint-bindings', 'test-binding-crates', 'test-binding-php', `PHP=${php}`], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const builds = run.stdout.split('\n').filter(line => /\/cargo (clippy|test|build) --locked .*-p polyspec-json-php-ext/.test(line));
  assert.equal(builds.length, 3, run.stdout);
  for (const line of builds) assert.ok(line.includes(`PHP_CONFIG=${dir}/bin/php-config `), line);
});

// The shared verifier prepares each implementation in turn in one checkout: the prepare of python ran make bindings, whose
// generation of the node target writes packages/ts/generated again and so deleted the Node addon that the prepare of js had
// put there (CI run 43897375991). A package target generates only its own target (T3.49).
test('T3.49: a package target of a binding generates only its own target', () => {
  for (const [target, generated] of [['binding-python-package', ['python']], ['binding-node-addon', ['node']], ['binding-node-package', ['node', 'wasm']]] as const) {
    const run = spawnSync('make', ['-n', '--no-print-directory', target], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const targets = [...run.stdout.matchAll(/ generate --root \S+ --target (\w+)/g)].map(match => match[1] ?? "").sort((a, b) => a.localeCompare(b));
    assert.deepEqual(targets, [...generated], target);
  }
});

// The prepare of python of the shared verifier builds the wheel with maturin, which the job verify did not install (CI run
// 43897375991: var/tools/mise/shims/maturin: not found). Every CI group that builds the wheel installs maturin through the
// TOOLS selector of kit 0.0.117 (K1278) (T3.49).
test('T3.49: the CI groups that build the Python wheel install maturin', () => {
  for (const group of ['ci-verify', 'ci-bindings']) {
    const run = spawnSync('make', ['-n', '--no-print-directory', group], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
    const tools = /install-tools TOOLS="([^"]*)"/.exec(run.stdout)?.[1]?.split(' ') ?? [];
    assert.ok(tools.includes('maturin'), `${group}: ${tools.join(' ')}`);
  }
});

test('T2.83-3-1: native runner tool selectors are arguments and bare executable commands still fail', () => {
  assert.doesNotMatch('$(NODE) $(KIT)/run-tests.$(KIT_EXT) go --cwd packages/go -- .', BARE_TOOL_COMMAND);
  for (const command of ['go test .', 'npm ci', 'cargo test --locked', 'echo start; go test .', 'echo start | rustc --version', '$(go version)']) {
    assert.match(command, BARE_TOOL_COMMAND, command);
  }
});

test('every cargo command uses the lock file', () => {
  for (const { command } of known(commandsOf('rust').prepare, 'the prepare steps of rust')) {
    if (command[0] === 'cargo' && command[1] !== 'fmt') assert.ok(command.includes('--locked'), command.join(' '));
  }
  assert.match(read('benchmarks/run.mts'), /\['cargo', 'run', '--locked',/);
});

test('requires-python of the Python package is the minor release of the python of mise.toml', () => {
  // CI runs the package only under the python of mise.toml, so requires-python states its minor release and nothing older.
  const pyproject = checkJson<{ project: { 'requires-python'?: string } }>(parse(read(path.join(rootOf('python'), 'pyproject.toml'))), 'pyproject.schema.json', 'pyproject.toml');
  const minor = miseVersion('python').split('.').slice(0, 2).join('.');
  assert.equal(pyproject.project['requires-python'], `>=${minor}`);
});

// T3.54: the generated Go tests of binding 0.0.17 build under polyspec_<library>_<feature>, but BINDING_GO_ENV named
// polyspec_<feature>, so go test compiled none of the panic, fault and codec tests and passed without them. The generated
// files are ignored by Git and no job of this test writes them (HR-85), so the test derives the tags from the inputs of
// the generator: the library of packages/rust/interface.json and the features of the tracked Cargo.toml of the Go binding,
// with _ for - (binding GN-5).
test('T3.54: the tags of make test-binding-go are the build tags of the generated Go tests', () => {
  const contract: unknown = JSON.parse(readFileSync(path.join(ROOT, 'packages/rust/interface.json'), 'utf8'));
  const library = typeof contract === 'object' && contract !== null && 'library' in contract ? String(contract.library) : '';
  assert.ok(library, 'packages/rust/interface.json names no library');
  const declared = parse(readFileSync(path.join(ROOT, 'packages/go/internal/ffi/Cargo.toml'), 'utf8')).features;
  const features = typeof declared === 'object' && declared !== null ? Object.keys(declared) : [];
  assert.ok(features.length > 0, 'the Go binding declares no test feature');
  const wanted = features.map(feature => `polyspec_${library}_${feature}`.replaceAll('-', '_'));
  const run = spawnSync('make', ['-n', '--no-print-directory', 'test-binding-go'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  assert.equal(run.status, 0, run.stderr);
  const given = new Set((/-tags=(\S+)/.exec(run.stdout)?.[1] ?? '').split(','));
  for (const tag of wanted) assert.ok(given.has(tag), `make test-binding-go does not give the tag ${tag} (it gives ${[...given].join(',')})`);
});

// T3.53: maturin build makes a debug wheel unless it is given --release, so the parse budget compared an unoptimized
// Python binding with the release library of PHP (ratio 7.38 at low load). The budget builds a release wheel into a venv
// of its own, and the tests keep the debug wheel of binding-python-package.
test('T3.53: the parse budget measures a release wheel of the Python binding', () => {
  const budget = recipeOf('python-parse-budget').join('\n');
  assert.match(budget, /binding-python-release-package/);
  assert.doesNotMatch(budget, /binding-python-package/);
  const wheel = recipeOf('binding-python-release-package').join('\n');
  assert.match(wheel, /\$\(MATURIN\) build --release --locked /);
  assert.match(wheel, /venv-release/);
  assert.doesNotMatch(recipeOf('binding-python-package').join('\n'), /--release/, 'the tests keep the debug wheel');
  assert.match(readFileSync(path.join(ROOT, 'benchmarks/python-parse/run.py'), 'utf8'), /var\/bindings\/venv-release\/bin\/python/);
});
