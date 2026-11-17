// The implementations of the verifier are those of config/implementations.json, each built with its own commands in a run directory
// of its own, never in the checkout; the packages keep the polyspec names.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { checkJson, parseJson, readJsonFile } from '../../scripts/json.mts';
import { COMMANDS, REGISTRY, ROOT, commandsOf, extensionRegistry, pathOf, loadRegistry, prepare, probeCommands, runStreamed, runtimeVersions, withRun, type Commands } from '../../scripts/registry.mts';
import { parse } from 'smol-toml';
import { checkout, known } from './checkout.mts';

/** Writes the config/implementations.json of a synthetic checkout: one implementation for each name with its one root. */
const declare = (json: (file: string, data: unknown) => void, roots: Record<string, string>) =>
  json('config/implementations.json', { schema: 1, implementations: Object.entries(roots).map(([name, folder]) => ({ name, roots: [folder] })) });

test('the implementations are those of config/implementations.json', (context) => {
  const declared = readJsonFile<{ implementations: { name: string; roots: string[] }[] }>(path.join(ROOT, 'config/implementations.json'), 'implementations.schema.json').implementations;
  assert.deepEqual(REGISTRY.roots, Object.fromEntries(declared.map(entry => [entry.name, entry.roots[0]])));
  const { root, json } = checkout(context);
  declare(json, { js: 'packages/js', future: 'packages/future' });
  const js = known(COMMANDS.js, 'the commands of js');
  assert.throws(() => loadRegistry(root, { js }), /declares \["future","js"\], but the verifier has commands for \["js"\]/);
  declare(json, { js: '../outside' });
  assert.throws(() => loadRegistry(root, { js }), /not a child directory/);
});

test('a new language builds, answers and names its runtime with the commands of the registry', async (context) => {
  const { root, json } = checkout(context);
  declare(json, { future: 'future-language' });
  const commands: Record<string, Commands> = { future: {
    prepare: [{ cwd: '{future}', command: [process.execPath, '-e', "require('node:fs').writeFileSync('built', 'ok')"] }],
    command: [process.execPath, '-e', "console.log('probe')"],
    runtime: { version: [process.execPath, '-e', "console.log('runtime')"] },
  } };
  const registry = loadRegistry(root, commands);
  execFileSync('mkdir', [path.join(root, 'future-language')]);
  await withRun(async (run) => {
    await prepare(['future'], run, registry);
    assert.equal(readFileSync(path.join(root, 'future-language/built'), 'utf8'), 'ok');
    assert.deepEqual(runtimeVersions(['future'], run, registry), { future: { version: 'runtime' } });
    const [command, ...args] = known(probeCommands(['future'], run, registry).future, 'the probe command of future');
    assert.equal(execFileSync(command, args, { encoding: 'utf8' }).trim(), 'probe');
  }, root, registry);
});

test('a build step streams its lines and ends with its grandchildren', async (context) => {
  const { root } = checkout(context);
  const marker = path.join(root, 'grandchild');
  // The grandchild outlives its parent and would write the marker after two seconds.
  const grandchild = "setTimeout(() => require('node:fs').writeFileSync(process.env.MARKER, 'alive'), 2000)";
  const source = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'ignore' }).unref(); console.log('one'); console.log('two')`;
  const { code, lines } = await runStreamed('step', [process.execPath, '-e', source], root, { ...process.env, MARKER: marker });
  assert.deepEqual([code, lines], [0, ['one', 'two']]);
  await new Promise(resolve => setTimeout(resolve, 2500));
  assert.equal(existsSync(marker), false);
});

test('the Rust build runs in the target directory of the run', () => {
  assert.equal(commandsOf('rust').env?.CARGO_TARGET_DIR, '{cache}/rust-target');
  assert.deepEqual(commandsOf('rust').command, ['{cache}/rust-target/debug/examples/probe']);
});

// T3.25: the probe of the root go is that of the binding module, packages/go/tests/probe, which links the static library
// that make binding-go-library builds into target/debug; go build finds it through CGO_LDFLAGS and reads no go.work.
test('the Go probe is built in the binding module after its static library', () => {
  const { prepare = [], env, command } = commandsOf('go');
  assert.deepEqual(prepare.map(step => [step.cwd, ...step.command]), [
    ['{repository}', 'make', 'binding-go-library'],
    ['{go}', 'go', 'build', '-o', '{cache}/go-probe', './tests/probe'],
  ]);
  assert.deepEqual(env, { GOTOOLCHAIN: 'local', GOWORK: 'off', CGO_LDFLAGS: '-L{repository}/target/debug' });
  assert.deepEqual(command, ['{cache}/go-probe']);
  assert.equal(pathOf(REGISTRY.roots, 'go'), 'packages/go');
});

test('the packages follow the polyspec naming convention and each Cargo package has one manifest', () => {
  const [js, php, rust, go] = (['js', 'php', 'rust', 'go'] as const).map(name => pathOf(REGISTRY.roots, name));
  assert.ok(js !== undefined && php !== undefined && rust !== undefined && go !== undefined, 'the roots of the four packages');
  const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
  const name = (file: string) => readJsonFile<{ name: string }>(path.join(ROOT, file), 'package-name.schema.json').name;
  // The root php is the binding extension polyspec/json (T3.25-3, change-names); the root composer.json is that of the development checkout.
  assert.deepEqual(['composer.json', `${php}/composer.json`].map(name), ['polyspec/json-development', 'polyspec/json']);
  // The root js is the binding @polyspec/json (T3.25-1, change-names); the root package.json is that of the development checkout.
  assert.deepEqual(['package.json', `${js}/package.json`].map(name), ['@polyspec/ordered-json', '@polyspec/json']);
  const cargo = checkJson<{ package: { name: string }; lib: { name: string } }>(parse(read(`${rust}/Cargo.toml`)), 'cargo-manifest.schema.json', `${rust}/Cargo.toml`);
  assert.deepEqual([cargo.package.name, cargo.lib.name], ['polyspec-json', 'polyspec_json']);
  // The root go is the binding module of packages/go (T3.25, change-names): its module path is the repository path followed
  // by its folder (S5 of kit).
  assert.equal(parseJson<{ Module: { Path: string } }>(execFileSync('go', ['mod', 'edit', '-json'], { cwd: path.join(ROOT, go), encoding: 'utf8' }), 'go-mod-edit.schema.json', 'go mod edit -json').Module.Path, `github.com/polyspec/json/${go}`);
  // A Git dependency on this repository reads every tracked Cargo.toml; two manifests of one package make Cargo skip one.
  const manifests = execFileSync('git', ['ls-files', '-z', '--', '*Cargo.toml'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean)
    .map(file => (parse(read(file)) as { package?: { name: string } }).package?.name).filter(Boolean);
  assert.equal(new Set(manifests).size, manifests.length);
  // No tracked file keeps an old name: the vendor ordered-json/, the global class OrderedJsonNativeParseError or the crate path ordered_json::.
  const old = spawnSync('git', ['grep', '-n', '-I', '-E', '-e', 'ordered-json/ordered-json', '-e', 'OrderedJsonNativeParseError', '-e', '(^|[^_])ordered_json::', '--', '.', ':!CHANGELOG*', ':!*/CHANGELOG*', ':!docs/plans/*', ':!tests/scripts/registry.test.mts'], { cwd: ROOT, encoding: 'utf8' });
  // git grep exits with 1 when nothing matches.
  assert.deepEqual([old.status, old.stdout, old.stderr], [1, '', '']);
});

/** The member `key` of the JSON object `value`, or undefined. */
const member = (value: unknown, key: string): unknown => (typeof value === 'object' && value !== null ? Object.entries(value).find(([name]) => name === key)?.[1] : undefined);
/** The JSON value of the tracked file `file` of the checkout. */
const tracked = (file: string): unknown => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));

// docs/spec/json-contract.md#transition: the legacy packages keep their last release, and the root package.json and
// composer.json, which name them, are the manifests of the development checkout. No release publishes them: the root
// package.json is private, and config/release.json releases neither root manifest, so a version bump leaves them alone.
test('no release publishes the legacy packages through the root manifests', () => {
  const manifest = tracked('package.json');
  assert.equal(member(manifest, 'private'), true, 'the root package.json is private');
  const release = tracked('config/release.json');
  for (const file of ['package.json', 'composer.json']) {
    assert.equal(member(member(release, 'manifests'), file), undefined, `config/release.json releases ${file}`);
    assert.equal(typeof member(member(release, 'notReleased'), file), 'string', `config/release.json names ${file} among the manifests that no release publishes`);
  }
});

// The PHP extension of packages/php-ext is the Composer package that packages.php of packages/rust/interface.json names, of the
// type php-ext, which PIE installs. PIE reads the package from the Composer repository packages.json of the release, which kit
// writes only for a Composer package of config/release.json, beside its zip <vendor>-<product>-<runtime>-<version>.zip, so the
// release declares the package with its manifest in the mode archive.
test('the release declares the PHP extension as the Composer package that PIE installs', () => {
  const contract = tracked('packages/rust/interface.json');
  const library = member(contract, 'library');
  const name = member(member(member(contract, 'packages'), 'php'), 'package');
  assert.deepEqual([typeof library, typeof name], ['string', 'string'], 'packages/rust/interface.json names the library and its PHP package');
  const manifest = tracked('packages/php-ext/composer.json');
  assert.deepEqual(
    [member(manifest, 'name'), member(manifest, 'type'), member(member(manifest, 'php-ext'), 'extension-name'), member(member(manifest, 'require'), 'php')],
    [name, 'php-ext', `polyspec_${String(library)}`, '>=8.4'],
    'packages/php-ext/composer.json is the php-ext package that PIE installs',
  );
  const release = tracked('config/release.json');
  assert.deepEqual(member(release, 'packages'), [{ kind: 'composer', directory: 'packages/php-ext', name, product: library, runtime: 'php-ext' }], 'config/release.json declares the Composer package of packages/php-ext');
  assert.equal(member(member(release, 'manifests'), 'packages/php-ext/composer.json'), 'archive', 'config/release.json releases packages/php-ext/composer.json as the manifest of its archive');
});

// T3.25-5: the release check loads the extension that PIE downloaded, so its registry builds nothing for PHP and names
// that file; the other implementations keep their commands.
test('T3.25-5: the registry of a given PHP extension loads that file and builds nothing for PHP', () => {
  const registry = extensionRegistry('/release/polyspec_json.so');
  const php = commandsOf('php', registry);
  assert.equal(php.prepare, undefined);
  assert.deepEqual(php.command.slice(0, 4), ['php', '-n', '-d', 'extension=/release/polyspec_json.so']);
  assert.deepEqual(php.command.at(-1), commandsOf('php').command.at(-1));
  assert.deepEqual(commandsOf('rust', registry), commandsOf('rust'));
  assert.deepEqual(registry.roots, REGISTRY.roots);
});
