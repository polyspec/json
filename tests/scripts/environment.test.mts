// The environment of every run: the tools are the declared releases, a check reads no network, and make install is the only
// recipe that downloads. The releases are declared in the devEngines.packageManager of package.json, rust-toolchain.toml, .php-version
// and mise.toml, whose Node.js, Go and Python are the pins of @polyspec/kit and which the go line of the go.mod names;
// make install-tools installs the running tools with them, and every target that runs a tool depends on it.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
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
