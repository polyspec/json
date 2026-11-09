// Builds the PHP extension with PIE and verifies that module with the shared cases (make pie-check), then writes the PIE
// record var/records/pie-verification.json. PIE builds a copy of the extension sources in the run directory, so the build
// never cleans or replaces files of the checkout. The PHAR and the suite are the ones that mise.toml declares and mise installs,
// compared with their pins before any work.
//
//   node scripts/check-pie.mts [--pie <pie.phar>] [--suite <JSONTestSuite folder>]
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { PIE_RECORD, externalPins, inputIssues, installedPie, manifestDifferences, packageRevisions, sha256, sourceManifest, supplementaryManifest, writeRecord } from './records.mts';
import { ROOT, artifactPaths, pathOf, probeCommands, runStreamed, runtimeVersions, withRun, type Run } from './registry.mts';
import { SUITE_FIX, verifyProbes } from './verify.mts';

const PACKAGE = 'polyspec/ordered-json-php-ext:*@dev';

/** Runs PIE with `args` in the extension of the run; a nonzero exit or a line that reports a build or tool error fails. */
export async function pieCommand(run: Run, pie: string, args: string[], commands: { arguments: string[]; exit_code: number }[], warnings: string[]): Promise<string> {
  const { code, lines } = await runStreamed(`pie ${args[0]}`, ['php', pie, ...args, '--no-interaction', '--no-ansi'], pathOf(run.paths, 'php-extension'), { ...process.env, PIE_WORKING_DIRECTORY: path.join(run.root, 'pie') });
  if (code !== 0) throw new Error(`pie ${args.join(' ')} failed with exit ${code}`);
  const errors = lines.filter(line => /Permission denied|error:|build tools are missing/i.test(line));
  if (errors.length) throw new Error(`pie ${args[0]} reported a build or tool error in ${errors.length} lines:\n${errors.join('\n')}`);
  warnings.push(...lines.filter(line => /warning:/i.test(line)).map(line => line.replaceAll(`${run.root}/`, '')));
  commands.push({ arguments: args, exit_code: code });
  return lines.join('\n').trim();
}

async function buildAndVerify(run: Run, pie: string, suite: string | undefined) {
  const sources = sourceManifest();
  const packages = packageRevisions();
  const supplementary = suite === undefined ? null : supplementaryManifest(suite);
  const pieHash = sha256(readFileSync(pie));
  const commands: { arguments: string[]; exit_code: number }[] = [];
  const warnings: string[] = [];
  const version = await pieCommand(run, pie, ['--version'], commands, warnings);
  await pieCommand(run, pie, ['repository:add', 'path', '.'], commands, warnings);
  await pieCommand(run, pie, ['info', PACKAGE], commands, warnings);
  await pieCommand(run, pie, ['build', PACKAGE, '-j', '2', '-vv'], commands, warnings);
  const [module, ...more] = artifactPaths('php-extension', run);
  if (module === undefined || more.length) throw new Error('the extension declares exactly one build artifact');
  // A linked module carries a fresh UUID and signature, so its hash names this run only: it guards the module during the run
  // and is not recorded.
  const moduleHash = sha256(readFileSync(module));
  const { results, counts } = await verifyProbes(probeCommands(['php-extension'], { ...run, extension: module }), suite);
  const versions = runtimeVersions(['php-extension'], { ...run, extension: module });
  const current = sourceManifest();
  if (current.sha256 !== sources.sha256) throw new Error(`the sources changed during the PIE verification:\n${manifestDifferences(sources, current).join('\n')}`);
  if (JSON.stringify(packages) !== JSON.stringify(packageRevisions()) || (suite !== undefined && JSON.stringify(supplementary) !== JSON.stringify(supplementaryManifest(suite)))
    || pieHash !== sha256(readFileSync(pie)) || moduleHash !== sha256(readFileSync(module))) {
    throw new Error('the inputs or the module of the PIE verification changed during the run');
  }
  return {
    schema_version: 1, scope: 'pie-build', status: 'passed', checked_at: new Date().toISOString(),
    platform: { system: process.platform, machine: process.arch, node: process.version },
    sources, packages, pie: { version, phar_sha256: pieHash }, package: PACKAGE,
    commands: commands.map(command => ({ ...command, arguments: command.arguments.map(argument => argument.replaceAll(`${ROOT}/`, '')) })),
    build_warnings: warnings,
    artifact: { path: path.relative(run.root, module) },
    cases: { ...counts, total: counts.official + counts.fixtures + counts.arguments + counts.supplementary },
    implementations: { 'php-extension': { ...results['php-extension'], runtime: versions['php-extension'] } },
    supplementary,
  };
}

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { pie: { type: 'string' }, suite: { type: 'string' } } });
  const phar = values.pie ?? installedPie();
  // A check runs offline, so a missing download names make install-tools, which makes it.
  if (!existsSync(phar)) {
    console.error(`the PIE PHAR ${phar} does not exist; run make install-tools, which installs the http:pie of mise.toml`);
    return 1;
  }
  if (values.suite !== undefined && !existsSync(path.join(values.suite, 'test_parsing'))) {
    console.error(`the supplementary suite ${values.suite} has no test_parsing/; ${SUITE_FIX}`);
    return 1;
  }
  const pie = path.resolve(phar);
  const suite = values.suite === undefined ? undefined : path.resolve(values.suite);
  const issues = inputIssues(externalPins(), { pie: sha256(readFileSync(pie)), ...(suite === undefined ? {} : { supplementary: supplementaryManifest(suite) }) });
  if (issues.length) {
    for (const issue of issues) console.error(`external input differs from its pin: ${issue}`);
    return 1;
  }
  const record = await withRun(['php-extension'], run => buildAndVerify(run, pie, suite));
  writeRecord(path.join(ROOT, PIE_RECORD), record);
  console.log(`Saved ${PIE_RECORD}`);
  return 0;
}

if (import.meta.main) process.exitCode = await main();
