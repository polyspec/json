// The implementations of config/implementations.json with the commands of the shared verifier, and the run directory in
// which a verification builds them. config/implementations.json is the one source of the
// implementations and of the directory of each (its one root); the verifier is a comparator of that declaration. It builds
// each implementation, runs its probe on the shared cases and reads its runtime versions with the commands below. A command
// names the directory of an implementation as {<name>} and the cache of the run as {cache}.
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { readJsonFile } from './json.mts';
import type { Tree } from './reference.mts';

export const ROOT = path.resolve(import.meta.dirname, '..');
const DECLARATION = 'config/implementations.json';

/** A command line: the program and its arguments. */
export type Argv = [string, ...string[]];
type Step = { cwd: string; command: Argv; ifExists?: string };
export type Commands = {
  /** The probe: one document path in on each line, one JSON reply out. */
  command: Argv;
  prepare?: Step[];
  runtime: Record<string, Argv>;
  env?: Record<string, string>;
  /** The repository is copied into the run before its build, so a build never cleans files of the checkout. */
  buildInCopy?: boolean;
  dependencies?: string[];
  artifacts?: string[];
};

// The library that make build-php-ext (kit, S10) publishes, relative to the repository.
const EXTENSION_BUILD = 'var/php-ext/polyspec_ordered_json.so';
const PHP_EXTENSION = 'extension={extension}';

/** The PHP extension that make build-php-ext published: the library that the probe of the verifier and the benchmark load. */
export const builtExtension = (): string => path.join(ROOT, EXTENSION_BUILD);
export const COMMANDS: Record<string, Commands> = {
  js: { command: ['node', '{js}/tests/probe.mjs'], runtime: { node: ['node', '--version'] } },
  rust: {
    env: { CARGO_TARGET_DIR: '{cache}/rust-target', RUSTUP_AUTO_INSTALL: '0' },
    prepare: [
      { cwd: '{rust}', command: ['cargo', 'fmt', '--check'] },
      { cwd: '{rust}', command: ['cargo', 'build', '--locked', '--quiet', '--example', 'probe'] },
    ],
    command: ['{cache}/rust-target/debug/examples/probe'],
    runtime: { rustc: ['rustc', '--version'] },
  },
  go: {
    env: { GOTOOLCHAIN: 'local' },
    prepare: [{ cwd: '{go}', command: ['go', 'build', '-o', '{cache}/go-probe', './internal/probe'] }],
    command: ['{cache}/go-probe'],
    runtime: { go: ['go', 'version'] },
  },
  php: { command: ['php', '-n', '-d', 'auto_prepend_file={php}/vendor/autoload.php', '{php}/tests/probe.php'], runtime: { php: ['php', '-n', '-r', 'echo PHP_VERSION;'] } },
  'php-extension': {
    dependencies: ['php'],
    buildInCopy: true,
    // The build of kit publishes the library; the copy of the package serves the PIE check, which builds in it.
    prepare: [{ cwd: '{repository}', command: ['make', 'build-php-ext'] }],
    command: ['php', '-n', '-d', PHP_EXTENSION, '{php}/tests/probe.php'],
    runtime: {
      php: ['php', '-n', '-r', 'echo PHP_VERSION;'],
      // The extension reports the version of its package: the version of composer.json is the one source (config.m4 defines it).
      extension_version: ['php', '-n', '-d', PHP_EXTENSION, '-r',
        "$package = json_decode(file_get_contents('{php-extension}/composer.json'), true, 8, JSON_THROW_ON_ERROR)['version']; $native = phpversion('polyspec_ordered_json'); if ($native !== $package) { fwrite(STDERR, \"phpversion('polyspec_ordered_json') \" . var_export($native, true) . \" differs from the version \" . $package . \" of composer.json\\n\"); exit(1); } echo $native;"],
    },
    artifacts: ['{php-extension}/src/modules/polyspec_ordered_json.so'],
  },
  python: {
    // The virtual environment of make json-install-python, into which the package is installed.
    command: ['{python}/.venv/bin/python', '{python}/tests/probe.py'],
    runtime: { python: ['{python}/.venv/bin/python', '-c', 'import platform; print(platform.python_version())'] },
  },
};

export type Registry = { roots: Record<string, string>; commands: Record<string, Commands> };
/** An official example of examples/official.json. */
export type OfficialCase = { id: string; source: string; tree: Tree; compact: string };

/** The commands of the implementation `name`; an implementation without commands is an error. */
export function commandsOf(name: string, registry = REGISTRY): Commands {
  const entry = registry.commands[name];
  if (entry === undefined) throw new Error(`the verifier has no commands of the implementation ${name}`);
  return entry;
}

/** The directory of the implementation `name` in `paths`; a missing one is an error. */
export function pathOf(paths: Record<string, string>, name: string): string {
  const directory = paths[name];
  if (directory === undefined) throw new Error(`the run has no directory of the implementation ${name}`);
  return directory;
}

/** The errno code of an error of node, such as ENOENT; undefined for any other value. */
export function errorCode(error: unknown): string | undefined {
  return error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}

/**
 * The implementations of config/implementations.json of `root`, each with its one root and its commands. Every implementation has
 * commands and every command set belongs to an implementation, so neither names a language that the other lacks.
 */
export function loadRegistry(root = ROOT, commands = COMMANDS): Registry {
  const { implementations: declared } = readJsonFile<{ implementations: { name: string; roots: string[] }[] }>(path.join(root, DECLARATION), 'implementations.schema.json');
  if (declared.length === 0) throw new Error(`${DECLARATION} declares no implementation`);
  const roots: Record<string, string> = {};
  for (const { name, roots: folders } of declared) {
    const [folder, ...others] = folders;
    if (folder === undefined || others.length) throw new Error(`${DECLARATION}: the verifier needs one root of ${name}, not ${JSON.stringify(folders)}`);
    if (path.isAbsolute(folder) || folder.split('/').includes('..') || folder === '.') throw new Error(`${DECLARATION}: the root of ${name} is ${folder}, not a child directory of the repository`);
    roots[name] = folder;
  }
  const names = Object.keys(roots).sort();
  if (JSON.stringify(names) !== JSON.stringify(Object.keys(commands).sort())) {
    throw new Error(`${DECLARATION} declares ${JSON.stringify(names)}, but the verifier has commands for ${JSON.stringify(Object.keys(commands).sort())}`);
  }
  for (const [name, entry] of Object.entries(commands)) {
    const unknown = (entry.dependencies ?? []).filter(dependency => !(dependency in roots));
    if (unknown.length) throw new Error(`${name} depends on the unknown implementations ${unknown.join(', ')}`);
  }
  return { roots, commands };
}

export const REGISTRY = loadRegistry();
export const IMPLEMENTATIONS = Object.keys(REGISTRY.roots);

/** The absolute directory of each implementation of `registry` in the checkout `root`. */
export const repositoryPaths = (root = ROOT, registry = REGISTRY): Record<string, string> =>
  Object.fromEntries(Object.entries(registry.roots).map(([name, folder]) => [name, path.join(root, folder)]));

/**
 * The paths, relative to `root`, of the files that Git tracks there, in name order. An untracked file is not part of the
 * tree that a record names, so no record or shared case reads one. A tracked file deleted in the checkout is left out.
 */
export function trackedFiles(root: string): string[] {
  const listing = execFileSync('git', ['ls-files', '--cached', '-z'], { cwd: root, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  return listing.split('\0').filter(name => name && existsSync(path.join(root, name))).sort();
}

/** The tracked files with `suffix` directly in `directory` (relative to `root`), as absolute paths in name order. */
function filesIn(root: string, directory: string, suffix: string): string[] {
  const prefix = `${directory.replace(/\/$/, '')}/`;
  return trackedFiles(root).filter(name => name.startsWith(prefix) && name.endsWith(suffix) && !name.slice(prefix.length).includes('/')).map(name => path.join(root, name));
}

/** The shared fixtures of one category, valid or invalid, in name order. */
/** The shared examples with their golden results, and the folder of the shared fixtures without golden results. */
export const OFFICIAL = 'examples/official.json';
export const FIXTURES = 'contracts/fixtures';

/** The official examples of `root`. */
export const officialCases = (root = ROOT): OfficialCase[] =>
  readJsonFile<{ cases: OfficialCase[] }>(path.join(root, OFFICIAL), 'official-examples.schema.json').cases;

export const fixturePaths = (root: string, category: 'valid' | 'invalid'): string[] => filesIn(root, `${FIXTURES}/${category}`, '.json');

/** The argument cases of the shared verifier, which docs/spec/json-contract.md#argument-kinds describes. */
export const ARGUMENTS = `${FIXTURES}/arguments.json`;
/** The functions that an argument case applies to its argument. */
export type Call = 'number' | 'max_depth' | 'string_value' | 'object_key';
export type ArgumentCase = { name: string; call: Call; argument: unknown; kind: string | null };
export type ArgumentCases = { absent: Partial<Record<Call, string[]>>; cases: ArgumentCase[] };

/** The argument cases of `root`. */
export const argumentCases = (root = ROOT): ArgumentCases =>
  readJsonFile<ArgumentCases>(path.join(root, ARGUMENTS), 'argument-cases.schema.json');

/** Replaces each {name} of `value` with its variable; a variable that none names fails. */
function expand(value: string, variables: Record<string, string>): string {
  const expanded = value.replace(/\{([a-z][a-z0-9-]*)\}/g, (whole, name: string) => {
    const replacement = variables[name];
    if (replacement === undefined) throw new Error(`unknown command variable ${whole} in ${value}`);
    return replacement;
  });
  return expanded;
}

/** The command line `argv` with each {name} replaced with its variable. */
const expandArgv = ([program, ...args]: Argv, variables: Record<string, string>): Argv =>
  [expand(program, variables), ...args.map(argument => expand(argument, variables))];

/**
 * One verification run: its temporary root, the directories that its commands use, the cache of its built probes and the
 * PHP extension its probe loads (make build-php-ext publishes var/php-ext/polyspec_ordered_json.so; the PIE check names the
 * module that PIE built).
 */
export type Run = { root: string; paths: Record<string, string>; cache: string; extension?: string };

/**
 * Runs `body` in a run directory of its own, removed when the run ends. A repository whose implementation declares
 * buildInCopy is copied there first (the tracked files; a symbolic link fails, since the copy must hold the bytes of the
 * checkout) and its commands use the copy.
 */
export async function withRun<T>(selected: string[], body: (run: Run) => Promise<T>, root = ROOT, registry = REGISTRY): Promise<T> {
  const directory = mkdtempSync(path.join(tmpdir(), 'json-run-'));
  console.log(`run directory: ${directory}`);
  try {
    const paths = repositoryPaths(root, registry);
    for (const name of selected) {
      if (!commandsOf(name, registry).buildInCopy) continue;
      const copy = path.join(directory, pathOf(registry.roots, name));
      copySources(pathOf(paths, name), copy);
      paths[name] = copy;
    }
    const cache = path.join(directory, 'cache');
    mkdirSync(cache);
    return await body({ root: directory, paths, cache });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Copies the tracked files of `source` to `target`; a symbolic link fails. */
export function copySources(source: string, target: string): void {
  const names = trackedFiles(source);
  for (const name of names) {
    const from = path.join(source, name);
    if (lstatSync(from).isSymbolicLink()) throw new Error(`a build source is a symbolic link: ${from}`);
    mkdirSync(path.dirname(path.join(target, name)), { recursive: true });
    copyFileSync(from, path.join(target, name));
  }
  console.log(`copied ${names.length} source files from ${source} to ${target}`);
}

/** The variables of the commands of a run: the directory of each implementation, the cache, the repository and the extension. */
const variablesOf = (run: Pick<Run, 'paths' | 'cache' | 'extension'>): Record<string, string> =>
  ({ ...run.paths, cache: run.cache, repository: ROOT, extension: run.extension ?? builtExtension() });

/** The environment of the commands of `name`: the caller's, with the variables that the implementation declares. */
function environmentOf(name: string, run: Pick<Run, 'paths' | 'cache' | 'extension'>, registry = REGISTRY): NodeJS.ProcessEnv {
  const declared = commandsOf(name, registry).env ?? {};
  return { ...process.env, ...Object.fromEntries(Object.entries(declared).map(([key, value]) => [key, expand(value, variablesOf(run))])) };
}

/** Ends the process group of a detached child; a group that has ended already is no error. */
export function endGroup(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, 'SIGKILL');
  } catch (error) {
    // ESRCH: the group has ended; EPERM (macOS): its remaining members are exited processes not yet reaped.
    const code = errorCode(error);
    if (code !== 'ESRCH' && code !== 'EPERM') throw error;
  }
}

/**
 * Runs a build command in a process group of its own and prints a start line, each output line as it arrives (standard
 * output and standard error) and the exit status with the elapsed time. A build has no time limit; the caller judges its
 * exit status and its lines. The group, grandchildren included, ends with the command.
 */
export async function runStreamed(label: string, command: Argv, cwd: string, env: NodeJS.ProcessEnv = process.env): Promise<{ code: number; lines: string[] }> {
  console.log(`${label}: start`);
  const started = performance.now();
  const [program, ...args] = command;
  const child = spawn(program, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const lines: string[] = [];
  const read = (stream: NodeJS.ReadableStream) => new Promise<void>((resolve) => {
    readline.createInterface({ input: stream, crlfDelay: Infinity }).on('line', (line) => {
      lines.push(line);
      console.log(`${label}: ${line}`);
    }).on('close', resolve);
  });
  const output = Promise.all([read(child.stdout), read(child.stderr)]);
  const exited = new Promise<number>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 128 : 1)));
  });
  try {
    const code = await exited;
    // A grandchild that keeps a stream open neither holds the reader nor outlives the command.
    endGroup(child.pid);
    await output;
    console.log(`${label}: exit ${code} after ${Math.round(performance.now() - started)} ms`);
    return { code, lines };
  } finally {
    endGroup(child.pid);
  }
}

/** Every failure of a step that ran each implementation to its end, and the implementations that failed. */
export class Failures extends Error {
  readonly failures: string[];
  readonly implementations: Set<string>;

  constructor(failures: string[], implementations: Set<string> = new Set()) {
    super(failures.join('\n'));
    this.failures = failures;
    this.implementations = implementations;
  }
}

/**
 * Runs the prepare steps of each selected implementation. A failed step ends the build of its implementation only; the
 * others build to their end, and Failures then names every failure. Returns the warning lines of the builds.
 */
export async function prepare(selected: string[], run: Pick<Run, 'paths' | 'cache' | 'extension'>, registry = REGISTRY): Promise<{ implementation: string; message: string }[]> {
  const variables = variablesOf(run);
  const warnings: { implementation: string; message: string }[] = [];
  const failures: string[] = [];
  const failed = new Set<string>();
  for (const name of selected) {
    for (const dependency of [name, ...(commandsOf(name, registry).dependencies ?? [])]) {
      if (!existsSync(pathOf(run.paths, dependency))) throw new Error(`the package directory of ${dependency} does not exist: ${run.paths[dependency]}`);
    }
  }
  for (const name of selected) {
    const steps = commandsOf(name, registry).prepare ?? [];
    for (const [index, step] of steps.entries()) {
      if (step.ifExists !== undefined && !existsSync(expand(step.ifExists, variables))) continue;
      const command = expandArgv(step.command, variables);
      const label = `${name} prepare ${index + 1}/${steps.length} (${path.basename(command[0])})`;
      const { code, lines } = await runStreamed(label, command, expand(step.cwd, variables), environmentOf(name, run, registry));
      const errors = lines.filter(line => /Permission denied|error:/i.test(line));
      if (code !== 0) failures.push(`${label}: exit ${code}: ${command.join(' ')}`);
      failures.push(...errors.map(line => `${label}: the build reported an error: ${line}`));
      if (code !== 0 || errors.length) {
        failed.add(name);
        break; // The later steps of this implementation need this one.
      }
      // A warning names the files of the run by their repository, so the record holds no local path.
      const local = Object.entries(run.paths).sort(([, a], [, b]) => b.length - a.length);
      for (const line of lines.filter(text => /warning:/i.test(text))) {
        warnings.push({ implementation: name, message: local.reduce((text, [repository, folder]) => text.replaceAll(`${folder}/`, `${repository}/`), line) });
      }
    }
  }
  if (failures.length) throw new Failures(failures, failed);
  return warnings;
}

/** The probe command of each selected implementation in the run. */
export const probeCommands = (selected: string[], run: Pick<Run, 'paths' | 'cache' | 'extension'>, registry = REGISTRY): Record<string, Argv> =>
  Object.fromEntries(selected.map(name => [name, expandArgv(commandsOf(name, registry).command, variablesOf(run))]));

/** The files that the build of `name` leaves behind, as its commands declare them. */
export const artifactPaths = (name: string, run: Pick<Run, 'paths' | 'cache' | 'extension'>, registry = REGISTRY): string[] =>
  (commandsOf(name, registry).artifacts ?? []).map(value => expand(value, variablesOf(run)));

/**
 * The runtime versions of every selected implementation, each command run in the directory of its implementation, whose pin
 * files select the toolchain; Failures names every command that failed or printed nothing, after all ran.
 */
export function runtimeVersions(selected: string[], run: Pick<Run, 'paths' | 'cache' | 'extension'>, registry = REGISTRY): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  const failures: string[] = [];
  const failed = new Set<string>();
  for (const name of selected) {
    result[name] = {};
    for (const [key, command] of Object.entries(commandsOf(name, registry).runtime)) {
      const resolved = expandArgv(command, variablesOf(run));
      let value: string;
      try {
        value = execFileSync(resolved[0], resolved.slice(1), { cwd: run.paths[name], encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: environmentOf(name, run, registry) }).trim();
      } catch (error) {
        // execFileSync throws an Error with the exit status and the standard error of the command.
        const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : undefined;
        const stderr = error instanceof Error && 'stderr' in error && typeof error.stderr === 'string' ? error.stderr.trim() : '';
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${name}/${key}: ${resolved.join(' ')} failed${status === undefined ? '' : ` with exit ${status}`}: ${stderr || message}`);
        failed.add(name);
        continue;
      }
      if (!value) {
        failures.push(`${name}/${key}: ${resolved.join(' ')} printed no version`);
        failed.add(name);
        continue;
      }
      result[name][key] = value;
    }
  }
  if (failures.length) throw new Failures(failures, failed);
  return result;
}
