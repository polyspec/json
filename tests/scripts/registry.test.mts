// The implementations of the verifier are those of config/implementations.json, each built with its own commands in a run directory
// of its own, never in the checkout; the packages keep the polyspec names.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { checkJson, parseJson, readJsonFile } from '../../scripts/json.mts';
import { COMMANDS, REGISTRY, ROOT, commandsOf, copySources, pathOf, loadRegistry, prepare, probeCommands, runStreamed, runtimeVersions, withRun, type Commands } from '../../scripts/registry.mts';
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
  await withRun(['future'], async (run) => {
    await prepare(['future'], run, registry);
    assert.equal(readFileSync(path.join(root, 'future-language/built'), 'utf8'), 'ok');
    assert.deepEqual(runtimeVersions(['future'], run, registry), { future: { version: 'runtime' } });
    const [command, ...args] = known(probeCommands(['future'], run, registry).future, 'the probe command of future');
    assert.equal(execFileSync(command, args, { encoding: 'utf8' }).trim(), 'probe');
  }, root, registry);
});

test('a run builds the extension in a copy that ends with the run', async () => {
  const directory = await withRun(['php-extension'], async (run) => {
    assert.ok(pathOf(run.paths, 'php-extension').startsWith(run.root));
    assert.equal(run.paths.php, path.join(ROOT, pathOf(REGISTRY.roots, 'php')));
    assert.ok(existsSync(path.join(pathOf(run.paths, 'php-extension'), 'src/config.m4')));
    return run.root;
  });
  assert.equal(existsSync(directory), false);
});

test('the copy holds the tracked files and rejects a symbolic link', (context) => {
  const { root, write } = checkout(context);
  write('source.c', 'int x;\n');
  writeFileSync(path.join(root, 'untracked.o'), 'output');
  const target = path.join(root, 'copy');
  copySources(root, target);
  assert.ok(existsSync(path.join(target, 'source.c')));
  assert.equal(existsSync(path.join(target, 'untracked.o')), false);
  symlinkSync('source.c', path.join(root, 'link.c'));
  execFileSync('git', ['add', 'link.c'], { cwd: root });
  assert.throws(() => copySources(root, path.join(root, 'second')), /symbolic link/);
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

test('the packages follow the polyspec naming convention and each Cargo package has one manifest', () => {
  const [js, php, extension, rust, go] = (['js', 'php', 'php-extension', 'rust', 'go'] as const).map(name => pathOf(REGISTRY.roots, name));
  assert.ok(js !== undefined && php !== undefined && extension !== undefined && rust !== undefined && go !== undefined, 'the roots of the five packages');
  const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
  const name = (file: string) => readJsonFile<{ name: string }>(path.join(ROOT, file), 'package-name.schema.json').name;
  assert.deepEqual(['composer.json', `${php}/composer.json`, `${extension}/composer.json`].map(name), ['polyspec/ordered-json', 'polyspec/ordered-json', 'polyspec/ordered-json-php-ext']);
  assert.deepEqual(['package.json', `${js}/package.json`].map(name), ['@polyspec/ordered-json', '@polyspec/ordered-json']);
  const cargo = checkJson<{ package: { name: string }; lib: { name: string } }>(parse(read(`${rust}/Cargo.toml`)), 'cargo-manifest.schema.json', `${rust}/Cargo.toml`);
  assert.deepEqual([cargo.package.name, cargo.lib.name], ['polyspec-ordered-json', 'polyspec_ordered_json']);
  // The module path of the Go package is the repository path followed by its folder (S5 of kit); the legacy package keeps
  // the path of its releases, its folder before the transition (docs/spec/json-contract.md#transition).
  assert.equal(parseJson<{ Module: { Path: string } }>(execFileSync('go', ['mod', 'edit', '-json'], { cwd: path.join(ROOT, go), encoding: 'utf8' }), 'go-mod-edit.schema.json', 'go mod edit -json').Module.Path, `github.com/polyspec/ordered-json/${go.replace(/^legacy\//, '')}`);
  assert.ok(read(`${php}/src/OrderedJson.php`).includes('\nnamespace Polyspec\\OrderedJson;\n'));
  // A Git dependency on this repository reads every tracked Cargo.toml; two manifests of one package make Cargo skip one.
  const manifests = execFileSync('git', ['ls-files', '-z', '--', '*Cargo.toml'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean)
    .map(file => (parse(read(file)) as { package?: { name: string } }).package?.name).filter(Boolean);
  assert.equal(new Set(manifests).size, manifests.length);
  // No tracked file keeps an old name: the vendor ordered-json/, the global class OrderedJsonNativeParseError or the crate path ordered_json::.
  const old = spawnSync('git', ['grep', '-n', '-I', '-E', '-e', 'ordered-json/ordered-json', '-e', 'OrderedJsonNativeParseError', '-e', '(^|[^_])ordered_json::', '--', '.', ':!CHANGELOG*', ':!*/CHANGELOG*', ':!docs/plans/*', ':!tests/scripts/registry.test.mts'], { cwd: ROOT, encoding: 'utf8' });
  // git grep exits with 1 when nothing matches.
  assert.deepEqual([old.status, old.stdout, old.stderr], [1, '', '']);
});
