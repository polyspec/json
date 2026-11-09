<!-- doc-id: changelog -->
# Changelog

[한국어](CHANGELOG.ko.md)

<a id="unreleased"></a>
## Unreleased

- T2.149-1: the README of the Rust crate states that `Value` implements Serde `Serialize` and `Deserialize` for `serde_json`, instead of the functions `polyspec_ordered_json::serde::{to_string, from_str, from_slice}` that T2.42 removed (T2.149-1).
- T2.149: the Rust crate names every error by the public exhaustive enum `ErrorKind`, which `Error::kind()` returns: the parse rejections carry the names of the shared list, the strict parse `duplicate_object_key`, and the refused arguments `non_string_key` (OrderedMap::insert), `wrong_kind` (Value::string_value), `invalid_number_literal` (Value::number) and `depth_limit_out_of_range` (parse_with_max_depth); no error has an empty kind, and `string_value()` of another kind no longer reports `expected_object_key`. `Error::message` is the method `message()`, derived from the kind (T2.149).

## 0.0.23

- ordered-json 0.0.23 runs kit 0.0.102 (T2.147) (T2.148).
- ordered-json adopts kit 0.0.102, whose uv-install puts back the provider links when its install fails; no recipe line changes (T2.147).

## 0.0.22

- ordered-json 0.0.22 adopts kit 0.0.101: parity is deleted (T2.144), the tests that asserted recipe or workflow text are deleted (T2.143), and the release asset of kit 0.0.101 is pinned (T2.145) (T2.146).
- T2.145: ordered-json adopts kit 0.0.101, which only stops two kit refusals; no recipe line changes (T2.145).
- T2.143: the tests that asserted recipe or workflow text are deleted; they checked no behaviour (T2.143).
- T2.144: ordered-json adopts kit 0.0.100, which deletes parity: config/parity.json and the parity-check, parity-declarations-check, divergence-check and test-markers-check gates are gone; config/implementations.json declares the implementations of the shared verifier, each implementation runs its own tests in make test-<language>, and the verify job of the pipeline runs verify-all (kit K1129) (T2.144).
- T2.142: ordered-json adopts kit 0.0.99 with the behaviour of kit 0.0.98 kept: each recipe passes the values that kit 0.0.98 fixed as explicit arguments, and config/checklist.json, documents.json, duplication.json, generated.json, release.json, ci.json and parity.json declare what kit read by default (kit K1068–K1118) (T2.142).

## 0.0.21

- ordered-json 0.0.21 adopts kit 0.0.98: the Makefile holds its own recipes and calls the utilities of the installed kit, and the CI pipeline runs the target of each job by name (T2.140) (T2.141).
- T2.140: the Makefile includes no recipe of kit and holds every recipe it runs, calling the utilities of the installed kit; the allow-remote of npm, the settings of mise and uv and the lint configurations are files of the repository (.npmrc, mise.toml, .golangci.yml, phpcs.xml.dist, phpstan.dist.neon, ruff.toml, clippy.toml, .oxlintrc.json, knip.json, the [lints] of packages/rust/Cargo.toml); the workflows, PRINCIPLES and config/layout.kit.yml are files of the repository, and the Git hooks, the Claude Code hook settings, config/knip-entries.json and config/pyproject.schema.json are removed; the CI pipeline runs the target of each job by name (kit-gates-static, kit-gates-parity and kit-gates-runtime-<runtime> of a listed runtime matrix), whose prerequisites now hold the targets that config/ci.json declared, so rules-check reaches every check (kit K1057), make check runs ci-targets without FINAL_RUN (kit K1053) and PRINCIPLES is the text of kit 0.0.98 (kit K1055), for kit 0.0.98 (kit docs/spec/utilities-and-recipes.md) (T2.140).

## 0.0.20

- ordered-json 0.0.20 rewrites the three composer.lock files of 0.0.19 (T2.135), fetches its crates with cargo itself (T2.137) and adopts kit 0.0.92 (T2.138) (T2.139).
- T2.138: ordered-json adopts Kit 0.0.92, which has no Rust catch check whose crates the offline lint-rust cannot fetch (T2.138).
- T2.137: make install fetches the crates of every tracked Cargo.lock with cargo fetch --locked itself, since kit 0.0.91 has no cargo-downloads-fetch (T2.137).
- T2.136: ordered-json adopts Kit 0.0.91 (T2.136).
- T2.135: the three composer.lock files are rewritten with composer update --lock after the version of their composer.json changed in 0.0.19, so composer validate passes them (T2.135).

## 0.0.19

- ordered-json 0.0.19 adopts kit 0.0.89 and reaches kit only through its interface (T2.133); its release attaches polyspec-ordered-json-0.0.19.tgz, polyspec-ordered-json-php-0.0.19.zip, polyspec-ordered-json-php-ext-0.0.19.zip and the wheel (T2.134)

- T2.133: ordered-json adopts kit 0.0.89 and reaches kit only through its interface (S15): make check runs ci-targets of kit with FINAL_RUN=1, and the crate of the kit checker comes from cargo-downloads-fetch (T2.133).
- T2.132: docs/operations/distribution.md no longer names make release-config-check, which T2.97 removed (T2.132).

## 0.0.18

- ordered-json 0.0.18 adopts kit 0.0.88 (T2.130); its release attaches polyspec-ordered-json-0.0.18.tgz, polyspec-ordered-json-php-0.0.18.zip, polyspec-ordered-json-php-ext-0.0.18.zip and the wheel (T2.131)

- T2.130: ordered-json adopts kit 0.0.88: ci.yml is one pipeline whose job kit calls the ci-pipeline.yml of kit, which runs the gates of kit-gates once and the targets that config/ci.json declares (PRINCIPLES S12), and a test checks that every target of the full suite runs in it (T2.130).

## 0.0.17

- ordered-json 0.0.17 adopts kit 0.0.87 (T2.128); its release attaches polyspec-ordered-json-0.0.17.tgz, polyspec-ordered-json-php-0.0.17.zip, polyspec-ordered-json-php-ext-0.0.17.zip and the wheel (T2.129)

- T2.128: ordered-json adopts kit 0.0.87: every CI job bootstraps with the kit-bootstrap action that kit-sync copies (K992), and a make install that starts on the packed kit follows the linked kit after its link (K993) (T2.128)

## 0.0.16

- ordered-json 0.0.16 adopts kit 0.0.86 (T2.126); its release attaches polyspec-ordered-json-0.0.16.tgz, polyspec-ordered-json-php-0.0.16.zip, polyspec-ordered-json-php-ext-0.0.16.zip and the wheel (T2.127)

- T2.126: ordered-json adopts kit 0.0.86, whose release names a Composer zip by the P39 label of its package (polyspec-ordered-json-php-X.Y.Z.zip, polyspec-ordered-json-php-ext-X.Y.Z.zip) and starts by itself when the CI run of the version commit succeeds (T2.126)

## 0.0.15

- T2.120: ordered-json no longer calls kit-install-php-arginfo, which kit 0.0.85 does not define; the committed arginfo header is checked by kit (T2.120)

- T2.111: .links, the link declaration of kit (K869), is ignored by .gitignore, not only by the local exclude (T2.111)

- T2.112: the tests of the Python package share one helper module for the value tree and the rebuild, so duplication-check no longer excludes the test folders (P34) (T2.112)

- T2.113: AGENTS.md names the existing check of each rule that a machine can check (make lint-rust, make lint-go, make lint-php, make release-verify); a rule that only a judgement can state keeps Enforced by: none (T2.113)

- T2.114: AGENTS.md no longer names dependency-review, release-consumer-lock, release-consumer or config/dependency-policy.json, which kit deleted; the package managers own their locks (T2.114)

- T2.115: distribution and installation describe a consumer installing a release with its package manager, not the make targets release-consumer and release-consumer-lock, which the locked kit does not define (T2.115)

- T2.116: distribution describes the maintainer release steps of the locked kit: the make targets release-versions and release-proof, which it does not define, are removed (T2.116)

- T2.117: ordered-json adopts kit 0.0.85: package.json and its lock name the release asset polyspec-kit-0.0.85.tgz, npm 12.2.0 is pinned by devEngines and mise, the copies follow kit, config/release.json declares product and runtime per package, and its checks key, which kit 0.0.85 does not define, is removed (T2.117)

- T2.118: the nine bootstrap steps of ci.yml run the devEngines npm from RUNNER_TEMP with --prefix, as kit does (K938-1), so the runner npm 11.20.0 no longer refuses devEngines (T2.118)

- T2.122: each bootstrap step of ci.yml carries the canonical text of kit 0.0.85, first comment line included (T2.122)

- T2.123: the workflow rules test takes the canonical bootstrap from the repository's own text, not from kit's copy of release.yml, and drops the release.yml expectations that no repository workflow can reach (T2.123)

- T2.121: the workflow rules test takes the kit workflows from the copies of the installed kit package, so ci-pipeline.yml is kit's and not a repository workflow (T2.121)

- T2.124: the tag-push rule of the workflow rules test no longer reads the checks of config/release.json, which kit 0.0.85 does not define; no workflow runs on a tag (T2.124)

- T2.125: package.json declares npm only in devEngines.packageManager (K938); the packageManager field, its assertion and the documents that named it are removed (T2.125)

- T2.119: the Python install of ordered-json links the packages with install-link of kit, which runs with the node of var/tools, not the link target that needs a kit checkout (T2.119)

## 0.0.14
- T2.110: ordered-json 0.0.14 is released: the version of every manifest and lock of config/release.json is 0.0.14, and the changelogs name it (T2.110)
- T2.108: the prepare-commit-msg hook file is removed, which kit 0.0.77 no longer serves (K892) (T2.108)
## 0.0.13
- T2.109: the names of the checks that kit 0.0.77 removed are gone from Makefile, ci.yml, the tests and the docs; deps-rust fetches the crates of Cargo.lock (T2.109)
- T2.107: @polyspec/kit is pinned to the 0.0.77 asset and the lock is updated; the links, the owner checks and the hook removal follow kit 0.0.77 (T2.107)
- T2.106: @polyspec/kit is pinned to the 0.0.76 asset and the lock is updated (kit K896 and K897 among the release) (T2.106)
- T2.105: the docs job installs the PHP symbol extractor before the check targets, so divergence-check does not crash (T2.105)
- T2.104: the python JSONEncoder and JSONEncoder.default are named by the module polyspec.ordered_json, as T2.102 named the other python symbols (T2.104)
- T2.103: @polyspec/kit is pinned to the 0.0.75 asset and the lock is updated (kit K883 and K888 among the release) (T2.103)
- T2.102: the python parity symbols are named by their module polyspec.ordered_json, as the python extractor reads them (T2.102)
- T2.101: the PHP value test asserts the same thing in both runs and no longer branches on the extension (T2.101)
- T2.100: ordered-json 0.0.13 is released: the version of every manifest and lock of config/release.json is 0.0.13, and the changelogs name it (T2.100)
- T2.99: @polyspec/kit is pinned to the 0.0.74 asset and the lock is updated (kit K873 among the release) (T2.99)
- T2.98: the userland parse and stringify functions and MAX_DEPTH are guarded, so the loaded extension takes precedence and PHP starts with both the package and the extension (T2.98)
- T2.97: release-config-check is removed: it called the release versions that kit 0.0.73 deleted (K812), and the tag workflow of kit checks the version (T2.97)
- T2.95: @polyspec/kit is pinned to the 0.0.73 asset and the lock is updated (kit K826, K827, K830) (T2.95)
- T2.94: @polyspec/kit is pinned to the 0.0.72 asset and the lock is updated; CI runs no make link or link-state-check (T2.94)
- T2.93: @polyspec/kit is pinned to the 0.0.70 asset, the lock is updated, and the kit copies are refreshed with make kit-sync (T2.93)
- T2.92: kit K804, K805 and K798 are adopted: the pre-commit hook, the pre-push and pre-merge-commit hooks, commit-identity, commits-check, push-gate, the release consumers and proof and check-commit-records leave (T2.92)
- T2.91: the kit copies that rules-check flagged are refreshed with make kit-sync (T2.91)

- T2.89: the pythonBackend of the toolchain, which kit K788 deletes, is removed from config/toolchain.json (T2.89)
- T2.90: the main writer hook that kit K801 deleted is removed (T2.90)
- T2.88: the wheel polyspec consumer, whose kit gate K789 deleted, is removed from config/release.json (T2.88)
- T2.87: the gate of dependency-policy-check is gone with kit K784, and the references and the config files that only it read are removed (T2.87)
- T2.86: the shared workflows are the kit-sync copies (K671-2), and kit-check passes (T2.86)

<a id="v0012"></a>

## 0.0.12

- Adopt published Kit 0.0.63 with the shared Go no-test-package and clean-bootstrap fixes. Keep the unmodified native test-go suite, independent cross-language verification and canonical provider gates; prepare 0.0.12 with native consumer locks and dependency review (T2.85) (T2.85-1).

- Remove application-local Go package selection and restore the unmodified Kit test-go target. The next release requires the shared runner fix in Kit issue #5 and successful complete CI (T2.83-3-2).

<a id="v0011"></a>
## 0.0.11

- Check pinned executables at shell command positions while allowing native runner tool selector arguments; regression cases retain rejection of direct and chained bare executable calls (T2.83-3-1).

- Route cross-language test marker and release metadata checks to parity, where Python and Rust are explicitly prepared, instead of broadening the documentation job installation (T2.83-4).

- Run native Go unit tests in the library package and keep helper command builds. Verify that every tracked Go test belongs to the selected package so new tests cannot be omitted (T2.83-3).

- Prepare the locked PHP symbol parser explicitly before PHP autoload lint in the independent PHP job; retain native tests and lint strictness (T2.83-2).

- Prepare OrderedJSON 0.0.11 with Kit 0.0.61, independent language CI and native release consumer locks (T2.84).

- Adopt public Kit 0.0.61 with selected locked tool installation and update PHPUnit to 13.4.5 to remove the PHPT coverage temporary-directory advisory (T2.83-1).

- Run six native language check jobs in parallel and keep shared contract and parity verification in an independent job. Require every job in ci-passed and retain exact target coverage and distinct failure reports (T2.83).

<a id="v0010"></a>
## 0.0.10

- Declare the public Python JSONEncoder class and its default callback together in the existing host serialization API unit through kit 0.0.58 multi-symbol bindings. Every declared symbol is checked and every public symbol remains covered. (T2.82)

- Align the feature record with native Rust Value Serde integration and duplicate-key rejection in all six implementations. Keep the benchmark protocol as implemented while marking its verification pending reliable remeasurement under T2.48; timing data is unchanged (T1.60-2).

- Reconsider the conditionally withdrawn CI work in T2.80 under the current execution plan. Track integration of kit K614-1, K614-1-1 and K614-1-2 explicitly, retain artifact consumer proofs, and document the idle benchmark and final hosted evidence conditions (T2.80-1).

- Reconsider T2.66 for prerelease: retain the npm tarball consumer and retire the request to replace it with development sources. The artifact install is the consumer proof required by the distribution procedure and kit K438; a source link would not verify the distributed tarball. The consumer manifest and lock already name 0.0.10 (T2.66).

- Reconsider T2.65 for prerelease: retain the Composer archive consumer and retire the request to replace it with development sources. The artifact install is the consumer proof required by the distribution procedure and kit K438; a source install would not verify the distributed ZIP. The consumer manifest and lock already name 0.0.10 (T2.65).

- Reconcile the workflow report path record with the sibling kit.mk used by the Makefile and implemented in T1.60-1; all 20 owning workflow unit tests pass (T2.79).

- Prepare Git hook configuration and workspace links before docs gates, and fetch the sibling Rust checker crates before offline suite linting (T1.60-1-2). The new setup-order regression fails on the previous workflow and passes after the installation steps are added.

- Align the Go toolchain and module at 1.27.3 so CI can build the sibling Go symbol extractor, regenerate the four-platform toolchain lock, and build and link sibling kit with native npm installation before checks (T1.60-1-1). The owning workflow tests reject an older compiler; all 19 cases pass, and the Go symbol extractor installs successfully.

- The completed CI bootstrap repair passes all 18 owning workflow unit tests and TypeScript compilation (T1.60-1).

- Restore the sibling kit checkout and installation before every project make target in the repository-owned CI and push-gate jobs (T1.60-1). Run commands in the project folder, resolve setup and artifact paths from the workflow workspace, and include suppression-check in the declared CI checks. The workflow unit tests cover the checkout and bootstrap order.

- Prepare release 0.0.10 in every package manifest and regenerate the npm and Composer consumer locks (T1.60). Update the locked fast-uri to 3.1.9 and markdown-it to 14.3.3 to resolve three security advisories, remove the stale sprintf-js advisory exception, and align the Python build backend and its verified wheel digest at setuptools 84.2.1. The dependency review records no known advisories; the dependency policy and version checks pass, the Python wheel builds offline, and the JavaScript and Python public API unit tests pass.
- T2.79: the row is recorded as done; its change is on main (f343462) (T2.79)
- T2.76: the row is recorded as done; its deletion landed as a refactor on main (T2.76)
- T2.76: the row is recorded as done in the main checkout (T2.76)
- T2.76: the row is recorded as done; its change landed as the commit before this one (T2.76)
- T2.74: K614 layout: the kit-sync copies are removed, the bootstrap includes ../kit, the shared root files are links into ../kit (T2.74)
- T2.73: the row is recorded as done; its landed change is the commit before this one (T2.73)
- T2.73: the tracked hooks match kit: pre-commit without the gates of K603, prepare-commit-msg and reference-transaction are committed (T2.73)
- T2.72: make hooks writes .githooks/pre-merge-commit, which PRINCIPLES.md names, so rules-check passes (T2.72)
- T2.71: ParseError refuses a message that KINDS does not hold, with a LogicException, instead of an empty kind (T2.71)
- T2.70: the UTF-8 decode catch of packages/js/index.js binds the error and narrows it to the decoder TypeError, and rethrows any other error (K561) (T2.70)
- make kit-sync brings install-mise.mts (kit K532), and the owner rules route the sources of each language to its lint and duplication-check (kit K534) and name no removed file; red: make kit-check and make owner-validate failed, green after the change (T2.69).
- make kit-sync removes the lint configurations that kit reads from its package since K514, and CHECK_TARGETS runs suppression-check; Red: make kit-check reported 15 findings on the stale copies (T2.68).
- T2.64: package-lock.json links @polyspec/kit from the sibling checkout with make npm-install DIR=. instead of a GitHub release tarball, and ordered-json takes the copies of kit 0.0.54 that make kit-sync writes; red: make link-state-check exit 2 with the finding that the mise trusted-configs of the checkout is not trusted, green: after make install-tools, make npm-install DIR=. and make link-state-check exit 0. (T2.64)
- T1.59: the changelog names no comparison against an external implementation; that comparison is external benchmarking and is not kept in the repository (T1.59).
- T2.60: ordered-json takes the copies of kit at 8813c04a (K354 K394 K386 K348-1 K360-2 K349-2 K392-1 K393), written by make kit-sync and make hooks; red: make kit-check exit 2 with scripts/kit/kit-bootstrap.mk and scripts/kit/bootstrap/install-mise.mts differing from @polyspec/kit 0.0.54 and config/commit-identity.json missing, green: make kit-check and make link-check exit 0. (T2.60)

- T2.59: ordered-json takes the copies of kit at f9eb43dd: make kit-sync writes scripts/kit/kit-bootstrap.mk and config/layout.kit.yml, and make hooks writes .githooks/commit-msg; red: make kit-check exit 2 with two copies that differ from the installed kit, green: make kit-check exit 0. (T2.59)
- T2.58: the Korean twins of CHANGELOG.md and of the kit-standard checklist carry the source-sha256 of their English files again; red: make docs-check reported both stamps stale since 67cd062, green: it passes. (T2.58)
- T2.57: the Go package handles every error that its errcheck gate found (P8): `orderedjson.go` returns or panics on the error of `Compact` (`String` panics, `Array` and `Object` return it) and builds its literals with `mustBuild`, which panics only on an internal literal that does not parse; `api_test.go` checks each call through the test helper `must`; `internal/benchmark/main.go` reads the settings the way the Rust benchmark does (an unset variable takes its default, a value that is not a positive integer stops the run) and checks the errors of `strconv` and `json.Marshal`; `internal/probe/main.go` checks the errors of `StringUnits`. Red: `make lint-go` exit 2 with 33 errcheck findings (orderedjson.go 7, api_test.go 21, benchmark 3, probe 2); green: `make lint-go` exit 0 with 0 issues and deadcode passed, `make test-go CASES=Official` 18 passed, the api tests 29 passed. T2.56 is merged into this row. (T2.57)
- T2.55: the Rust benchmark example reads its settings with a stated rule: an unset variable takes its default, and a value that is not a positive integer stops the run instead of falling back to the default (P8, no swallowed parse error). Red: `make lint-rust` exit 2, 4 `Result::ok` findings in `examples/benchmark.rs`; green: `make lint-rust` exit 0, `make test-rust CASES=api` 1 passed. (T2.55)
- T2.54: PRINCIPLES.md, PRINCIPLES.ko.md, .golangci.yml, ruff.toml and scripts/kit/kit-bootstrap.mk are the kit copies of K334 and K349 of @polyspec/kit 0.0.54, not local edits. Red: `make kit-check` exit 2, 5 findings (the 5 copies differ from the installed kit); green: exit 0. (T2.54)
- T2.53: .gitignore covers packages/go/go.work and go.work.sum, which link writes into the consumer; red: git check-ignore reported neither file as ignored, green: it reports both. (T2.53)
- T2.52: config/owner-checks.json gives clippy.toml, the kit copy of Rust lint settings, the owner rule of the kit copies; red: owner-validate reported clippy.toml as a path that matches no owner, green: it reports every tracked path owned. (T2.52)
- The pinned external inputs are tools of mise (T2.7): `mise.toml` declares `http:pie` (the PHAR of release 1.4.10, with its sha256) and `http:jsontestsuite` (the archive of the pinned revision, with its sha256), `mise.lock` pins both for every platform and `make install-tools` installs them under `var/tools/mise/installs`; `scripts/external-inputs.mts`, its test, the target `ordered-json-install-external`, the variable `PIE` and the `.cache` copies are gone. `externalPins` of `scripts/records.mts` reads the release, the PHAR hash and the revision from `mise.toml`, and `external-inputs.json` keeps only the facts of the suite archive (318 cases and the digest of their inputs). Red: `make toolchain-lock` refused `http:pie` before K327 and `scripts/external-inputs.mts` was classed as replaced by this item; green: `make rebuild-check`, `toolchain-check`, `dependency-policy-check`, `divergence-check` and `lint-ts` exit 0, the installed suite has the pinned 318 cases and digest, `scripts/verify.mts --suite` passed 416 cases for js, `make pie-check` built the extension with the installed PIE and passed, the evidence and environment tests passed.
- No code or test of an implementation branches on another implementation (T2.51): the PHP library loads its sources unconditionally (`src/bootstrap.php` and its `extension_loaded` guard are gone), the probe of the verifier and the PHP benchmark use whatever the run loaded (`auto_prepend_file` of the Composer autoloader for the pure library, nothing for the extension) and assert no backend, `packages/php/phpunit.xml` drops its `bootstrap` so the extension run of kit (K329) loads none of the library's sources, the two exceptions of `config/duplication.json` and `config/parity.json` begin with a kind that kit defines (`test:`, `harness:`), and `divergence-check` joins `CHECK_TARGETS` and the first job of `ci.yml`. Red: `make divergence-check` exit 2, 4 divergences (the 2 reasons, `bootstrap.php:7`, `probe.php:15`) and `make test-php-ext` fatal `Cannot redeclare function parse()` once the guard went; green: `make divergence-check` exit 0, `make test-php-ext CASES=Test` 45 tests 202 assertions the same as `make test-php`, `scripts/verify.mts` passed for php and php-extension, `make typecheck` and `make lint-php` passed.
- The PRINCIPLES copies equal those of the installed kit (T2.50), written by `make kit-sync`. Red: `make kit-check` exit 2, 2 findings; green: exit 0.
- The Python tests are a package (T2.25): `packages/python/tests/__init__.py` lets `make test-python` select a case, and kit K324 runs it with the interpreter of the package environment, so the installed package is importable (S3). The build directory of the editable install is ignored. Red: `make test-python CASES=public_api` refused the directory, then failed with `ModuleNotFoundError: polyspec`; green: `make test-python CASES=depth_limit` 1 passed and `CASES=public_api` 1 passed.
- The PRINCIPLES copies equal those of the installed kit (T2.49), written by `make kit-sync`. Red: `make kit-check` exit 2, 2 findings; green: exit 0.
- The benchmark loads the extension that `make build-php-ext` publishes (`builtExtension` of the registry) and `benchmarks/results.json` is measured again from the clean checkout after the Go zero-copy parse, the PHP extension and the Rust and Go changes of this plan (T2.47). Red: `make benchmark` stopped with `the PHP extension of the benchmark was not built` because it read the PIE path; green: `make benchmark` exit 0, `source.dirty` false, comparison `not-comparable` (the environment differs from the committed baseline); `make typecheck` passed.
- The PRINCIPLES copies equal those of the installed kit (T2.46), written by `make kit-sync`. Red: `make kit-check` exit 2, 2 findings; green: exit 0.
- `CHECK_TARGETS` and the first job of `ci.yml` run `bypass-check` (T2.45), the gate of kit that fails while a test, script or Makefile impersonates CI, assumes a gate up to date or skips a hook. Red: `make kit-check` exit 2, `CHECK_TARGETS runs no bypass-check`; green: exit 0, workflow-rules test passed.
- The PRINCIPLES copies equal those of the installed kit (T2.44), written by `make kit-sync`. Red: `make kit-check` exit 2, 2 findings; green: exit 0.
- The php-lint copies equal those of the installed kit (T2.43), written by `make kit-sync`. Red: `make kit-check` exit 2, 2 findings (`config/php-lint/composer.json` and `composer.lock` differ); green: exit 0.
- Rust has only the Serde trait impls of `Value` (T2.42): the module `serde` with its own serializer, `to_string`, `from_str`, `from_slice` and `Error`, a copy of `serde_json` (S1), is removed with its tests, its two fixtures and the dependency `serde_ignored`; `serde_json` encodes and decodes any structure that holds values with their contract bytes, and `Deserialize` parses with the normal grammar as Go `UnmarshalJSON` does. Red: the spec (T2.40) and the Go side no longer have the typed codec while Rust still exported it (13 public symbols under `serde`, 456 lines); green: cargo test 24 + 2 + 17 + 3 passed, `scripts/verify.mts --only rust`, `make lint-rust`, `make parity-declarations-check` and `make dependency-policy-check` exit 0.
- Go `Value` implements `json.Unmarshaler` beside `json.Marshaler` (T2.41), and the typed `Marshal` of the package, a copy of `encoding/json` (S1), is removed with its 13 tests, its fuzz test and the interface `Marshaler`; `encoding/json` encodes and decodes any structure that holds values with their contract bytes. The API units `api-host-typed-*` and `api-host-error` are replaced by `api-host-deserialization`, and `api-host-serialization` declares `Value::compact` for Rust. Red: `make test-go CASES=HostDeserialization` failed (`UnmarshalJSON` is missing); green: go test of `Host`, `Parse` and `Stringify` 7 passed, `scripts/verify.mts --only go` passed, `make lint-go` passed, `make parity-declarations-check` exit 0.
- The spec names only the native JSON integration (T2.40): Go `Value` implements `json.Marshaler` and `json.Unmarshaler`, Rust `Value` implements Serde `Serialize` and `Deserialize`, and the typed `Marshal` of Go and the `serde` module of Rust, which duplicated `encoding/json` and `serde_json`, are out of the spec (S1); the code follows in T2.41 and T2.42. Red: the spec described both typed encoders; green: `make docs-check` passed.
- Rust `string_value()` returns the WTF-8 bytes of the string (T2.39), so an escaped unpaired surrogate is kept as in Go, PHP, JavaScript and Python instead of refused. Red: the tests that expect `b"a\xed\xa0\x80"` did not compile against `String`; green: cargo test api 24 and official 17 passed, `scripts/verify.mts --only rust` passed, `make lint-rust` passed.
- The spec holds RQ-009 in every implementation (T2.38): `docs/operations/api.md`(.ko) no longer lets Rust refuse `string_value()` for an unpaired surrogate; Go, PHP and Rust return its WTF-8 bytes (Rust as `Vec<u8>`). Red: the spec wrote an exception for Rust; green: `make docs-check` passed; the code follows in T2.39.
- Every unit of `config/parity.json` holds in every implementation and cites the requirement that a test names (T2.4): the profiles, `nativeOnly` and `exclusions` are gone (S6), the sub-items T2.4-1 to T2.4-4 closed the findings of the rules R1, R2, R13 and R15, and the extractors of the six implementations list no public symbol that no unit declares. Red: `make parity-declarations-check` exit 2, 98 schema findings and then 432 findings of R1, R2, R13 and R15; green: exit 0, `every declaration holds`.
- Every feature of every unit has a binding in every implementation (T2.4-2): the findings of rule R2 (172 missing bindings: php 35, python 31, js 31, rust 29, php-extension 25, go 21) are closed by the bindings of existing behaviour (T2.26, T2.27, T2.28), the PHP and extension tests that follow the library (T2.15-3, T2.22), the neutral host serialization units (T2.37) and the units for the requirements that only removed units cited (RQ-003, RQ-010, RQ-011). Red: `make parity-declarations-check` R2 172; green: `every declaration holds`.
- Every API unit declares a symbol of every implementation (T2.4-1): the findings of rule R1 (84 missing implementations: php-extension 41, php 15, python 14, js 14) are closed by the implementation of the extension (T2.15-3), the `Kind` enumeration (T2.35), the neutral object-entry, byte-entry, error and host-interface units (T2.34, T2.37) and the removal of the Go zero-copy parse (T2.33). Red: `make parity-declarations-check` R1 84; green: `every declaration holds`, and the extractors of all six implementations list no undeclared public symbol.
- The host JSON interface of every language is bound by neutral units (T2.37): `host_serialization_boundary` (a value through the host encoder: Rust `serde_json::to_string`, Go `json.Marshal`, and the refusal of JavaScript, PHP and Python) and the new `host_serialization_embeds_values` (a native structure that holds a value); the 20 units of the typed forms (`serde_*`, `marshal_*`) are replaced by them and their tests stay as package tests (`packages/go/marshal_test.go` and the fuzz test now lie in `api_test.go`). Python gets `ordered_json.JSONEncoder`, whose `default` refuses a `Value` and points to `stringify`; Go uses the `json.Marshaler` of the standard library instead of an own `Marshaler`; the Rust `serde::Error` hides its variants. Eleven API units pair the typed forms and the remaining accessors with the symbol of each language, and the units `arrays_and_objects_stay_distinct` (RQ-003), `number_tokens_are_kept_exactly` (RQ-010) and `serialization_is_idempotent` (RQ-011) test the requirements that only the removed units had cited. Red: `make parity-declarations-check` R2 99 (20 host units missing in 5 languages) and 38 undeclared public symbols read from the extractors; green: `every declaration holds`, no R1 and no R11 in any of the six implementations; all tests pass, `scripts/verify.mts` passes for the six, and the lints pass.
- The spec states RQ-020 as one rule (T2.36): every language integrates a value with its standard JSON serialization interface, which writes the contract bytes (Go `encoding/json`, Rust serde, also inside a native structure) or refuses and points to the library serializer (JavaScript, PHP, Python), and `docs/operations/api.md`(.ko) names the interface of each language and presents the typed `Marshal` of Go and `serde::to_string` of Rust as its extension to a whole native structure. Red: RQ-020 said that host encoders refuse and that the typed Go encoder matches the standard one, which Rust and the other languages could not bind; green: `make docs-check` 30 document pairs passed.
- The kind names are the enumeration `Kind` in every implementation (T2.35): a TypeScript enum in `packages/js/index.d.ts` with the frozen object `Kind` in `index.js`, the `StrEnum` `Kind` of Python (`Value.kind` returns its member, which equals the string), and the backed enum `Polyspec\\OrderedJson\\Kind` of PHP, registered by the extension from the stub too (marked final as Reflection reports a userland enum); `docs/operations/api.md`(.ko) states the enumeration and the seven `api-kind-*` units declare the symbol of each implementation. Red: `make parity-declarations-check` R1 28 (the kind units in js, php, php-extension, python); green: R1 0. PHPUnit with and without the extension 41 tests 188 assertions passed, unittest passed, the four `scripts/verify.mts` probes passed, `make lint-ts`, `lint-php`, `lint-python`, `lint-php-ext` and `typecheck` passed.
- The object entries, the byte entry and the error message are neutral API units (T2.34): `api-ordered-map*` declare `Value` members, get and object for JavaScript, PHP, Python and the php-extension next to the `OrderedMap` of Rust and Go, `api-parse-bytes` declares `parse` as the PHP byte entry, `api-parse-error-message` declares the `ParseError` class whose standard exception message it is, and `ordered_map_rejects_non_string_key` binds `testOrderedMapRejectsNonStringKey` for PHP and the extension (a PHP array key is a string or an integer, so no other key reaches an object). The Go text of `docs/operations/api.md`(.ko) no longer names `ParseBytesBorrowed`. Red: `make parity-declarations-check` R1 58, R2 101 and 2 R2 for the key unit; green: R1 28 (the Kind units), R2 99. PHPUnit `NonStringKey` passes with and without the extension.
- Go has no zero-copy parse (T2.33): `ParseBytesBorrowed`, its `flagBorrowed` handling, its test and the unit `borrowed_input_is_copied_on_access` are removed because they lie outside the contract (S6 allows no native-only symbol), and the Go benchmark parses with `ParseBytes`; the benchmark README and the API table no longer name it. Red: `make parity-declarations-check` R2 missing-binding for `borrowed_input_is_copied_on_access` in 5 implementations; green: those 5 are gone; go test 6 passed, `scripts/verify.mts --only go` passed, `make lint-go` passed. The committed Go benchmark result predates the change and is re-measured with the others.
- `CHECK_TARGETS` and the CI jobs run every gate of kit-gates (T2.21): after the parity declaration lost its profiles (T2.4) the 98 schema findings are gone. Green: `make kit-check` exit 0, `tests/scripts/workflow-rules.test.mts` 17 passed.
- `CHECK_TARGETS` and the first job of `ci.yml` run `link-state-check` (T2.32), the gate of kit K305 that fails while an installed 0.0.x polyspec package is a copy among links. Red: `make kit-check` exit 2, `CHECK_TARGETS runs no link-state-check`; green: exit 0, the workflow-rules test passed.
- The PRINCIPLES copies equal those of the installed kit after K304 to K307 (T2.31), written by `make kit-sync`. Red: `make kit-check` exit 2, 2 findings; green: exit 0.
- The extension is tested by the PHPUnit files of `packages/php` run with it loaded (T2.19): `packages/php-ext` keeps no copy of them, no `phpunit.xml`, no `autoload-dev` and no relative path into `packages/php` (they went with T2.15-3), and `config/parity.json` binds the php-extension implementation to `packages/php/tests`. Red: the extension had its own subclasses `OfficialTest` and `ValueApiTest` and `../php/` paths in its `composer.json`, and `make test-php-ext` could not build; green: `make test-php-ext CASES=Test` 40 tests 185 assertions passed.
- The PHP extension registers the classes and functions of the PHP library under the same names and signatures (T2.15): the spec, the private internals of the library and the C implementation are the sub-items T2.15-1 to T2.15-3. `make lint-php-ext` exit 0 and the Reflection comparison of `make test-php-ext` passed.
- The extension implements the PHP library in C (T2.15-3): `Polyspec\OrderedJson\Value` (a Zend object over a refcounted tape that its nodes share), `ParseError`, the functions `parse` and `stringify` and the constant `MAX_DEPTH` are registered under the names and signatures of `packages/php` from the stub and its arginfo header (the library returns `Value` instead of `self`, which the stub cannot spell). The descriptor functions `ordered_json_scan`, `ordered_json_hydrate` and `ordered_json_compact_node`, `NativeParseError`, the constant `ORDERED_JSON_VERSION`, the ten units that tested them, RQ-021 and the tests of `packages/php-ext` are gone: the extension is tested by the PHPUnit files of `packages/php` run with it loaded, and `config/parity.json` binds the php-extension implementation to those files and declares its symbols. `packages/php-ext` locks no package. Red: `make test-php-ext` listed `NativeParseError`, `ordered_json_compact_node`, `ordered_json_hydrate` and `ordered_json_scan` as registered with no library declaration; green: `make lint-php-ext` exit 0, the Reflection comparison passed, `make test-php-ext CASES=Test` 40 tests 185 assertions, the same as `make test-php`, `scripts/verify.mts --only php-extension` 17 official examples + 98 shared cases passed.
- The PHP tests no longer assert that the extension is not loaded (T2.22): `OfficialTest` and `ValueApiTest` of `packages/php/tests` are the test classes themselves (the abstract `*TestCase` classes and the subclasses that only asserted the backend are gone), so `make test-php` runs them on the pure PHP library and `make test-php-ext` runs the same files with the extension loaded (S10). Red: with the extension loaded every case failed with `these tests cover the pure PHP backend; run them without the polyspec_ordered_json extension`; green: `make test-php CASES=Test` 40 passed, 185 assertions (the extension run is part of T2.15-3).
- The PHP library keeps its internals private (T2.15-2): `Parser`, `Tape` and the ten helper functions are gone as public symbols; the scanner is a private static method of `Value` with its tape constants and the UTF-8 helpers are its private static methods, so the public symbols are `Value`, `ParseError`, `parse`, `stringify` and `MAX_DEPTH`. `src/bootstrap.php`, the Composer `files` entry, requires `src/OrderedJson.php` only without the extension, which registers the same constant and functions; the tests no longer call a library helper (`ProbeTree::units`). Red: the public symbols of `packages/php/src` read by the symbol extractor of kit were 56 (26 beyond the API); green: 30, exactly the API; PHPUnit `Value` 24 and `Official` 17 passed, `scripts/verify.mts --only php` passed, `make lint-php` passed.
- The spec states that the extension implements the PHP library (T2.15-1): RQ-021 about scan descriptors is removed from `docs/spec/json-contract.md`(.ko), `docs/operations/api.md`(.ko) lists the public symbols of the PHP library (`Value`, `ParseError`, `parse`, `stringify`, `MAX_DEPTH`), says the extension registers them under the same names and signatures (S10) and reports the version of its package, and `docs/operations/installation.md`(.ko) builds with `make build-php-ext` and no longer writes a version of any package. Red: the spec described `ordered_json_scan`, `ordered_json_hydrate` and `ordered_json_compact_node` and the table wrote 0.0.3 for packages at 0.0.9; green: `make docs-check` 30 document pairs passed.
- Every rule of `AGENTS.md` begins with `Own:` (T2.30): the 62 rules state the repository's own terms, and the rule that restated the principle on the standard tool of an outside ecosystem (P14) is removed with its Korean twin. Red: `make rules-check` exit 2, 91 findings (62 of them `begins with neither Own: nor Refines`); green: exit 0, `every rule names its check; 13 rules are enforced by no tool`.
- The PRINCIPLES copies equal those of the installed kit once more (T2.29), written by `make kit-sync` after K299 to K303 (the principles carry ids P1…, S1…). Red: `make kit-check` exit 2, 2 findings; green: exit 0.
- Rust, Go and PHP bind the UTF-8 and surrogate units (T2.28): `bytes_input_is_validated` for PHP (a string is the byte input), `text_input_rejects_lone_surrogates` for Rust, Go and PHP (the WTF-8 bytes of a literal unpaired surrogate are rejected as invalid UTF-8 before the grammar, at the surrogate), and `string_value_keeps_an_unpaired_surrogate` for Rust, Go and PHP. The string value of an escaped unpaired surrogate is kept in the library form instead of refused: WTF-8 in Go (`StringValue`) and PHP (`stringValue`, whose `tokenText` loses its flag), and Rust, whose String cannot hold it, still refuses with a pointer to `string_units`. `docs/operations/api.md`(.ko) states the rule. Red: Go `StringValue() = "", unpaired surrogate; use StringUnits` and PHP `UnexpectedValueException: Unpaired surrogate`; parity R2 172; green: go test 4 passed, PHPUnit 5 passed, cargo test 4 passed, `scripts/verify.mts --only go,php` passed, lint-go, lint-php and lint-rust passed, R2 158.
- The Go package rejects a repeated decoded object key on request (T2.27): `ParseRejectDuplicates(source)` reports `duplicate object key` (kind `duplicate_object_key`) at the first byte of the second key token at any depth, including escaped spellings of the same key; `Parse` keeps the shared behaviour. The Go binding is specified in `docs/operations/api.md`(.ko), the units `strict_parse_rejects_duplicate_keys` and `strict_parse_accepts_unique_keys` bind `TestStrictParse*`, and the API unit `api-parse-reject-duplicates` declares the symbol of every implementation. Red: `make test-go CASES=StrictParse` build error `undefined: ParseRejectDuplicates`, parity R2 172 (2 of go); green: 2 passed, `scripts/verify.mts --only go` passed, `make lint-go` passed, R2 168 (R1 85: the new unit lacks the php-extension symbol, item T2.15).
- The Rust API tests the contract behaviour that its types make intrinsic (T2.26): `values_come_only_from_the_library` (RQ-012: the parser and the factories are the only constructors and each validates) and `returned_collections_are_immutable` (RQ-013: members and items are shared references, a changed copy leaves the value as it was), both bound to `packages/rust/tests/api.rs`. Red: `make parity-declarations-check` R2 missing-binding 172 findings, 2 of rust for these units; green: R2 170. `cargo test --test api` 2 passed, `make lint-rust` passed.
- Each test names the requirements its parity unit cites (T2.4-4): a comment `Requirements: RQ-nnn` above the test of every binding (js, rust, go, python, php and the php-extension cases), and a class doc where a subclass runs inherited cases. Red: `make parity-declarations-check` R15 unnamed-requirement 178 findings; green: R15 0 (R1 84 and R2 172 remain, items T2.4-1 and T2.4-2). The formatting of the tests of T2.4-3 is fixed with it: `make lint-php`, `make lint-python` and `cargo fmt --check` pass.
- The extension reports the version of its package (T2.16): `config.m4` defines `PHP_POLYSPEC_ORDERED_JSON_VERSION` from `../composer.json`, which lies beside `src/` in the package, in the PIE build and in the build of kit (K295), `ordered_json.c` uses it, the constant `ORDERED_JSON_VERSION = 0.0.1` is gone, and the `extension_version` runtime check of the verifier compares `phpversion('polyspec_ordered_json')` with the version of `composer.json` instead of a constant of the same C file. Red: `runtimeVersions(['php-extension'])` failed with `phpversion('polyspec_ordered_json') '0.0.1' differs from the version 0.0.9 of composer.json`; green: `{ php: '8.4.26', extension_version: '0.0.9' }`, `scripts/verify.mts --only php-extension` passed, registry tests 7 passed, `make release-versions TAG=v0.0.9` passed.
- The PHP extension follows S10 (T2.8): the names `polyspec/ordered-json-php-ext` and `polyspec_ordered_json`, one stub with `@generate-function-entries`, the tracked arginfo header written by `make php-ext-arginfo` and included by `ordered_json.c` in place of the hand-written arginfo and function table, and `make build-php-ext` building `var/php-ext/polyspec_ordered_json.so`, which the verifier (`scripts/registry.mts`), the PIE check, `config/parity.json` and `make parity-check` load; the in-place `make php-extension` is gone. Red: `make lint-php-ext` exit 2 (arginfo header missing; `make php-ext-arginfo` failed in kit until K290); green: `make lint-php-ext` exit 0, `make build-php-ext` built the library, `scripts/verify.mts --only php-extension` 17 official examples + 98 shared cases passed, registry tests 7 passed.
- The dependency review record matches the manifests and locks, and every registry dependency is at its latest stable release (T2.20): PHPUnit 13.4.3, ruff 0.17.1 and setuptools 84.2.0 (pinned by `make dependency-review UPDATE=1` after kit K296). Red: `make dependency-policy-check` exit 2, 4 findings (locks after the review of 2026-10-15), then 1 (setuptools); green: exit 0.
- The PRINCIPLES copies equal those of the installed kit again (T2.24), written by `make kit-sync` after the landings of K282 to K297. Red: `make kit-check` exit 2, 2 findings (PRINCIPLES.md and PRINCIPLES.ko.md differ); green: exit 0.
- `config/rebuild.json` has no `paths`, and every tool that kit finds by layout has its class (T2.18): the 6 benchmark tools are `policy` with their reason, and kit (K294) no longer reports its vendored copies. Red: `make rebuild-check` exit 2 on `paths`, then 9 unclassified copies; green: exit 0, `every tool that config/rebuild.json selects has its class`.
- The hand-written parser of each language stays, with a rebuild record that names the failing contract cases of its ecosystem reader (T2.23): `docs/rebuild/json-js.md` (JSON.parse: 106 of 115 cases, RQ-001 integer-like key order), `json-go.md` (encoding/json Token: 102, RQ-009 and RQ-007), `json-python.md` (json.loads: 114, RQ-004 and RQ-006), `json-php.md` (json_decode: 99, RQ-010 and RQ-009), `json-rust.md` (serde_json: 105, RQ-010 and RQ-009), each classed `record` in `config/rebuild.json`. Red: no record named the cases; green: `make rebuild-check` exit 0, `make docs-check` 30 document pairs passed.
- Two feature units test the requirements that no unit cited (T2.4-3): `public_api_exports_the_entry_points` (RQ-023: parse, serialization, factory and accessor functions) and `parse_error_exposes_kind_offset_and_message` (RQ-024), each a test in js, rust, go, php, python and the php-extension binding (which runs the inherited PHP test case). Red: `make parity-declarations-check` R13 untraced-requirement 2 (RQ-023, RQ-024); green: R13 0. Tests: node:test 2 passed, cargo test 2 passed, go test 2 passed, PHPUnit 2 passed, unittest 2 passed; the extension run waits for T2.8.
- The PRINCIPLES copies equal those of the installed kit 0.0.54 (T2.17), written by `make kit-sync`. Red: `make kit-check` exit 2, 101 findings, 2 of them `PRINCIPLES.md` and `PRINCIPLES.ko.md` differ; green: 99 findings, none about PRINCIPLES (the rest are the parity and rebuild configuration, items T2.4 and T2.18).
- `config/duplication.json` excludes `packages/*/tests/**` (T2.14), with the reason of kit for its own tests: a test states its case in full. Red: `make duplication-check` exit 2, 3 clones, all in package tests; green: exit 0, `no piece of code exists twice`.
- The Composer platform of `config/dependency-policy.json` is PHP 8.4.1 (T2.13), the value of the three manifests and locks, which PHPUnit 13.4.2 needs (kit K259). Red: `make dependency-policy-check` exit 2, 10 findings, 6 of the rule `platform`; green: 4 findings, none of `platform`; the 4 left are the locks changed after the review of 2026-10-15, which `make dependency-review RECORD=1` records after kit K283.
- The Rust serializer states each piece of code once (T2.12): `Writer::float` checks and writes a float, `Writer::variant` opens the object of a tuple or struct variant, `Compound::raw_field` takes the raw JSON field, and the macros `compound_elements` and `compound_fields` generate the identical trait implementations of the compounds; the behavior is unchanged. Red: `make duplication-check` exit 2, 9 clones, 6 in `packages/rust/src/serde.rs`; green: 3 clones, none in `packages/rust`; `cargo test --locked --offline` 41 tests ok, `scripts/verify.mts --only rust` passed, `make lint-rust` passed.
- The Python parser builds the scalar value of a member or an item in one method (T2.11): `_nested_scalar` replaces the two inlined copies, and the locals that only they used are gone; the behavior is unchanged. Red: `make duplication-check` exit 2, 10 clones, 1 in `packages/python/src`; green: 9 clones, none in `packages/python/src`; unittest of `packages/python/tests` 39 tests OK, `scripts/verify.mts --only python` passed, `make lint-python` passed; `benchmarks/python-parse/run.py` ratio 2.57 to 2.90 (limit 3.0) after, 2.40 to 2.99 before.
- The PHP package encodes a code point as UTF-8 in one function (T2.10): `codePointToUtf8` serves `unitsToUtf8` and `tokenText`; the behavior is unchanged. Red: `make duplication-check` exit 2, 11 clones, 1 in `packages/php/src`; green: 10 clones, none in `packages/php/src`; PHPUnit of `packages/php` 35 tests OK, `scripts/verify.mts --only php` passed, `make lint-php` passed.
- The Go package states each piece of code once (T2.9): `marshalList` writes the elements of a slice and an array, and `writeShortEscape` writes the escapes of a JSON string for `writeString` and `StringFromUnits`; the behavior is unchanged. Red: `make duplication-check` exit 2, 13 clones, 2 in `packages/go`; green: 11 clones, none in `packages/go`; `go test ./...` ok, `scripts/verify.mts --only go` 17 official examples + 98 shared cases passed, `make lint-go` passed.
- The PHP extension takes the names of the S10 standard (T2.8): the PIE package is `polyspec/ordered-json-php-ext` (the release asset `polyspec-ordered-json-php-ext-php-X.Y.Z.zip`), the extension and its module are `polyspec_ordered_json`, `PHP_NEW_EXTENSION` and `--enable-polyspec-ordered-json` follow, the stub is `src/polyspec_ordered_json.stub.php`, and the library, the tests, the verifier and the parity declaration load `polyspec_ordered_json`. The arginfo header stays open: `make php-ext-arginfo` fails in kit. Red: `make lint-php-ext` exit 2, 4 findings; the shared probe refused the unrenamed `extension_loaded('ordered_json')` (`Unexpected PHP parser backend`, 1 of 115 cases); green: `scripts/verify.mts --only php-extension` 17 official examples + 98 shared cases passed, registry and evidence tests 17 passed, `make lint-php-ext` 1 finding left (the arginfo header).
- `config/rebuild.json` declares the class of each tool of `scripts/*.mts` (T2.6): ecosystem for mdast, PIE, ajv and momoa, policy for the verifier, its registry, its records and `present`, and replaced for `external-inputs.mts`, which item T2.7 moves to the http backend of mise. Red: `make rebuild-check` exit 2, `config/rebuild.json does not exist`; green: exit 0, `every tool that config/rebuild.json selects has its class`.
- The Korean twin of the kit-standard checklist carries the revision of its English source (T2.5): the translation was compared with the English rows, which match, and `make documents-stamp` wrote the source-sha256. Red: `make docs-check` exit 2, `1 findings in 25 document pairs` (revision); green: exit 0.
- The parity units cite the requirements RQ-001 to RQ-024 of the JSON contract (kit K273), the JavaScript probe runs from `packages/js/tests/probe.mjs` after the move of its folder, and the workflow tests leave the workflows that kit vendors out (T2.3).
- The packages keep no AGENTS, CHANGELOG or Makefile (T2.2): each package has a section in the root `AGENTS.md` and `CHANGELOG.md`, its check and test are targets of the root Makefile (`ordered-json-<package>-check` and `ordered-json-<package>-test`), and the layout exception of `config/layout.yml` is removed. The PHP platform of every Composer manifest is 8.4.1 and the Composer locks are locked again. The recipes that the Makefile lost in T2.1 are restored (`verify-*`, `verify-all`, `typecheck`, `evidence-check`, `release-config-check`, `pie-check`, `benchmark`, `benchmark-check`, `ordered-json-test-scripts` and `ordered-json-install-external`). The checklist has the parent row T1.29, and the comparison product is no longer named in the changelogs and the checklist.
- The repository follows the kit standard 0.0.54 (T2.1): the execution checklist moves to `docs/plans/execution/`, the documents and the test folder move to the folders of the layout (`docs/operations/documentation-plan.md`, `docs/operations/proposals.md`, `packages/js/tests`), `install` runs the bootstrap of kit as `install-kit` before `ordered-json-install`, the workflow `.github/workflows/gates.yml` is vendored from kit, and the comparison tools with another project are removed with their report.
- T1.58: AGENTS points to the local links of kit `docs/plans/local-links.md`: while polyspec versions are 0.0.x, development checkouts link installed polyspec packages to their source, and links are never committed.
- T1.57: the shared tools are `@polyspec/kit` 0.0.53.
- T1.56: the shared tools are `@polyspec/kit` 0.0.52: `.php-version` declares the PHP 8.5 that every workflow sets up, and the release workflow runs `make kit-check` before any release step (kit K193).
- T1.55: the shared tools are `@polyspec/kit` 0.0.50: knip reads the binaries that the scripts and tests run from `binaries` of `config/knip-entries.json` (kit K176), and `make dependency-policy-check` checks the root `composer.json` with its committed `composer.lock`, which locks no package, as it checks every Composer manifest of the checkout (kit K181).
- T1.54: the Composer locks of `packages/php` and `packages/php-ext` are current again: the version 0.0.9 of T1.50 changed the content hash of both manifests without a new lock. `config/dependency-policy.json` declares both Composer projects with PHP 8.5.0, so `make dependency-policy-check` fails on a lock that `composer validate --strict` finds stale and reviews their PHPUnit and their locks; both locks keep every package version.
- T1.53: `make lint-python`, the ruff and vulture of kit, runs in the full suite and in the docs job of CI; the comparison probe in `scripts/comparison` no longer changes `sys.path` (S3), and its environment installs the package with the uv of `mise.toml` and runs the probe with its Python (`--python`).
- T1.52: `make lint-php`, the phpcs and PHPStan of kit, runs in the full suite and in the suite job of CI; `make install-php` installs the root package into `vendor/`, whose autoloader PHPStan reads for the PHP of `benchmarks/`, and the PHP of the packages, the tests and the benchmarks follows PSR-12, the probe of the shared verifier reading its serializations from `Polyspec\OrderedJson\Tests\ProbeTree`.
- T1.51: the shared tools are `@polyspec/kit` 0.0.48: the checkout runs the Node.js 26.12.0 of `mise.toml` from `var/tools`, `.node-version` is gone and every `engines.node` is `>=26.12.0` (kit K171); the workflows pin each action by its SHA with its version (kit K169); the scripts and tests read JSON through schemas and check the values that they read instead of asserting them (kit K155–K158).

- Adopted published kit 0.0.56 and its canonical copies. CI bootstraps the locked installed package without a sibling checkout, and installation fetches Rust checker dependencies before offline linting; native development source links remain available. (T2.80-1)

- Updated the ruff tool pin to 0.17.2 after the prerelease dependency review reported the newer stable release, and regenerated the platform digests with the native toolchain lock command. (T2.81)

- The native ParseError constructor now rejects unknown messages with LogicException, matching PHP, including long messages and known messages with embedded NUL bytes. The constructor regression runs against both backends. (T2.71-1)

- Wrapped the constructor regression assertion to satisfy the PHP lint line-length rule. (T2.71-1-1)

- Adopted kit 0.0.57 so PHP extension parity uses an isolated Composer test autoloader without loading the PHP implementation twice; refreshed dependency review and native consumer locks for 0.0.10. (T2.80-2)

### npm (packages/js)

- Text input with an unpaired surrogate is rejected with `unescaped_lone_surrogate` at the offset of the surrogate, before the grammar is read; it named the unit after the surrogate, and a surrogate after the root was `trailing_input` (T1.39).

### python (packages/python)

- The parser reads a document in one pass of compiled `re` patterns, one match per member, item or root value,
  and decodes member names and `string_value()` with `bytes.decode` and `json.decoder.scanstring` (T1.41). On 50,000
  flat objects its CPU time fell from 4.44 to 2.34-2.94 times the pure PHP parser; results and error offsets are
  unchanged.

- `parse_bytes` validates UTF-8 with `bytes.decode('utf-8')` instead of a byte-by-byte check in Python (T1.35). The
  rejection is `invalid_utf8` at the
  `start` of the `UnicodeDecodeError`, the same offset as before, and the `ParseError` is raised from that error.

- The package implements the shared JSON contract (T1.27-2): `parse` and `parse_bytes` read text and UTF-8 bytes,
  `stringify` and `Value.compact()` serialize, `Value` exposes the accessors and factories, and `ParseError` reports
  the shared rejection kinds at UTF-8 byte offsets, with `max_depth` and `reject_duplicates` following the JavaScript
  binding. The package tests run the standard cases and its own cases, and the registry, the package test standard
  and the owner map of the repository cover the package.

## 0.0.9

- T2.63: Value::parse left reference cycles on every parse, because the scanner closures capture each other by reference, so a large import kept its memory until the cycle collector ran and reached memory_limit (limepie P-82). The scanner now drops its closure variables on return and on a parse error, so no cycle remains. Red: with the collector disabled, 50 parses left 400 cycles and the new tests fail; green: the tests of ValueApiTest pass, lint-php passes and make parity-declarations-check holds (T2.63). (T2.63).

- T2.61: The bindings reference moves from docs/spec to docs/operations, since it defines no requirement of its own: docs/spec/api.md and its Korean twin, and the links that name them, including the changelog's. Red: make parity-declarations-check exits 2 on 605b7a7 with the R19 of api.md; green: it holds, and make docs-check and make layout-check pass (T2.61). (T2.61).

- T2.62: The repository contract moves from docs/spec to docs/operations, since it defines no requirement and is a layout document: docs/spec/repositories.md and its Korean twin, and the links that name them (R19 of the parity declaration). Red: make text-absent on each linking file exits 1 while the stale path remains, and the parity red at 115eeea; green: text-absent passes on every linking file and make docs-check and make layout-check pass (T2.62). (T2.62).

- T1.49: the Composer manifest of `packages/php-ext` declares no `repositories` and no development requirement of `polyspec/ordered-json`; its tests load the PHP library from `../php/src` by `autoload-dev`, so the release zip of the extension carries a manifest that installs outside the repository.
- T1.48: the shared tools are `@polyspec/kit` 0.0.45, whose knip ignores the binaries of the pinned runtimes (kit K152).
- T1.46: `make lint-ts`, the oxlint and knip of kit, runs in the full suite and in the docs job of CI; `config/knip-entries.json` declares the JavaScript probe `packages/js/test/probe.mjs`, which the shared verifier runs, as an entry of knip (kit K145).
- T1.47: the shared tools are `@polyspec/kit` 0.0.44: `make install-tools` installs the Rust toolchain of `rust-toolchain.toml`, which the docs job of CI lacked, ruff keeps its cache in `var/ruff`, and `config/layout.yml` adds `composer.json` and `external-inputs.json` to the root files of kit instead of repeating its list (kit K145, K147, K150, K151).
- T1.45: the shared tools are `@polyspec/kit` 0.0.43: parity reads the trials of libtest-mimic and the data sets of a PHPUnit test method, `no-floating-promises` allows the registrations of node:test, API Extractor no longer reports `ae-missing-release-tag`, and knip takes its entries from the layout.
- T1.42: the repository tools are TypeScript (S9): the shared verifier (`scripts/verify.mts` with its registry, reference and records), the evidence, PIE, external-input and comparison checks and the benchmark runner run with Node.js, are checked by `make typecheck`, and their tests are node tests of `tests/scripts` (`make test-scripts`). The independent reference reads JSON with momoa. The package tests left the verifier for the native runners of kit parity, kit's `lint-rust` and `lint-go` replace `scripts/lint.py`, and the job `python` of CI is gone. The package folders are read from `config/parity.json` and the fixture folder from the registry; the only Python left of the tools is the probe of a Python library in `scripts/comparison`, an exception of S9 with its reason.
- T1.39: every unit runs in each implementation of its profile, with no exclusion. `ordered_map_rejects_non_string_key` runs in JavaScript too and shares the profile `no-php` with the byte input, since PHP arrays key by string or integer; `utf8_validation_holds_for_long_multibyte_text` (formerly `utf8_validation_survives_low_pcre_limits`) runs in every implementation, PHP under low PCRE limits; `text_input_rejects_lone_surrogates` and the new `string_value_keeps_an_unpaired_surrogate` form the profile `utf16-text` of JavaScript and Python. JavaScript text input with an unpaired surrogate is rejected before its grammar, at the offset of the surrogate instead of the unit after it, and a surrogate after the root is `unescaped_lone_surrogate` instead of `trailing_input`, as in Python.
- T1.43: `config/parity.json` binds every API unit to the public symbol of JavaScript that the TypeScript extractor of kit reads from `packages/js/index.d.ts`, as the tables of the API contract name them (the compact output and the UTF-16 construction and lookup are `stringify`, `Value.string` and `get`), and declares the JavaScript-only symbols `Kind`, `ParseOptions`, `rejectDuplicates`, `keys`, `toJSON` and `toString` as native-only with their reasons.
- T1.38: the package tests run with the native runners that kit parity runs, each test bound to its unit of `config/parity.json`: JavaScript with node:test (`packages/js/test/api.test.mjs`, `official.test.mjs`), Python with unittest in `packages/python/.venv`, which `make install-python` makes (`tests/test_api.py`, `test_official.py`), and PHP with PHPUnit 13.4.2, which `make install-php` installs into `packages/php` and `packages/php-ext` (`ValueApiTest` of both backends from `ValueApiTestCase`, `DescriptorTest`, `ValueClassTest`); `make php-extension` builds the extension in place for `make parity-check`. Every implementation runs the official examples natively, one case per example: JavaScript and Python by their package tests, Go by `TestOfficial`, Rust by the trials of libtest-mimic 0.8.2 in `tests/official.rs` (`official::<id>`), and PHP by the data sets of `testCase` of `OfficialTestCase`, which `OfficialTest` of each backend runs. The PHP classes `Value`, `ParseError`, `Tape` and `Parser` load by PSR-4 from a file each, the functions and `MAX_DEPTH` by `files` (S2), and the release smoke of the wheel requires its `py.typed` marker.
- T1.42: the folders follow S5 of kit's layout. The packages and the shared fixtures moved; a consumer takes the new paths when it moves past this release:
  - `packages/ordered-json-go` → `packages/go`: the Go module `github.com/polyspec/ordered-json/packages/ordered-json-go` is `github.com/polyspec/ordered-json/packages/go`, and its tags are `packages/go/vX.Y.Z` instead of `packages/ordered-json-go/vX.Y.Z`.
  - `packages/ordered-json-npm` → `packages/js`; the npm package `@polyspec/ordered-json` and its archive name are unchanged.
  - `packages/ordered-json-php` → `packages/php` and `packages/ordered-json-php-ext` → `packages/php-ext`; the Composer names and archive names are unchanged.
  - `packages/ordered-json-python` → `packages/python`: a Git source names `subdirectory=packages/python`.
  - `packages/ordered-json-rust` → `packages/rust`.
  - `fixtures/` → `contracts/fixtures/`.
- T1.44: the shared tools are `@polyspec/kit` 0.0.42. Go, Python with uv, Composer, alint, ruff, vulture, golangci-lint, deadcode, govulncheck and cargo-audit are tools of `mise.toml` at exact releases, Go and Python at the pins of kit, locked by their digests in `mise.lock` and installed by `make install-tools` into `var/tools/mise`; `config/toolchain.json` keeps the release of mise, and `.python-version` is removed. CI installs them with `make install-tools` instead of setup-python and the Composer of setup-php, and the workflow rule refuses `TOOLS` other than `npm` and a setup action of Go or Python. The sprintf-js advisory that kit brings is accepted as kit accepts it.
- T1.41: the Python parser reads a document in one pass of compiled `re` patterns, one match per member, item or root value, with the grammar defined once for the scan and for every error offset; `make python-parse-budget` compares its CPU time with the pure PHP parser on 50,000 flat objects, where the ratio fell from 4.44 to 2.34-2.94. Results and error offsets are unchanged on every vector.
- T1.37: `config/parity.json` is the one declaration of the implementations, their cases and their public API, read by the parity check of `@polyspec/kit` (`make parity-declarations-check`, `make parity-check`); `implementations.json` and `package-tests.json` are removed. The verifier reads the implementations from it and keeps their commands in `scripts/registry.py`, the case and symbol listings of the packages are removed, and the rejection kinds are listed in the JSON contract.
- T1.36: the shared tools are the package `@polyspec/kit` (a devDependency pinned by its release asset) instead of the vendored `scripts/kit/` and `tests/kit/`; a new checkout runs `make install-tools TOOLS=npm` and `make install-packages` first. `make kit-sync` writes the copies of the package, `config/layout.yml` maps the folders for `make layout-check`, and the toolchain floors are the pins of kit: Node.js 26.11.1, PHP 8.5, Go 1.27.2 and Rust 1.99.0.

- T1.35: `parse_bytes` of the Python package validates UTF-8 with `bytes.decode('utf-8')` instead of a byte-by-byte check in Python, and reports `invalid_utf8` at the `start` of the `UnicodeDecodeError`, the same offset as before; the `ParseError` is raised from that error.

- T1.34-1: the jobs `python` and `push-gate` install uv with the Python (`make install-tools TOOLS="uv python"`), and the workflow rule refuses a step that installs python without uv.

- T1.34: the vendored tools of kit are v0.0.28 (`make kit-sync KIT_TAG=v0.0.28`). `config/toolchain.json` declares `uv` 0.12.24, and `make install-tools` installs the Python of `pythonBuild` (3.14.8) with `uv python install` into `var/tools/uv-python`, keeping the symbolic links that uv creates; `pythonBuild` declares only the exact version. The Python package has the lock `packages/ordered-json-python/pylock.toml` (no dependency), and the release workflow proves a draft release before it makes it public (`make release-proof`, `make release-undraft`).

- T1.33: AGENTS states that an existing outside tool or library is used as it is and not rebuilt, with uv for Python interpreters, environments and locks and Composer for PHP dependencies as examples, and accepts the symbolic links that such a tool creates. It also states that the symbolic link and relative path rules of this repository, where they exist, govern what this repository creates, and that paths are resolved declaratively or by a stated discovery rule.

- T1.32-6-1: `docs/distribution.json` is removed. It restated the GitHub releases, the version tags and the source visibility, which no check compared with the repository, so it went stale after each release. A feature row marked `published` names its release tag and asset, and `make evidence-check` checks that form offline. `make release-proof TAG=<tag>` is the networked comparison of a release.

- T1.32-5: the distribution document and the root `README.md` no longer state that no release exists or that the first release is unpublished. They name where the releases are listed (`gh release list -R polyspec/ordered-json` and the Releases page) and what a `vX.Y.Z` release attaches.

- T1.32-4: the distribution documents, the installation document and `AGENTS.md` name the Python package as its wheel asset `polyspec_ordered_json-X.Y.Z-py3-none-any.whl` instead of a git tag. The Python package README installs that wheel asset. The release procedure states that the Go tag `packages/ordered-json-go/vX.Y.Z` is pushed before `vX.Y.Z` on the same commit.

- T1.32-3: the vendored tools of kit are v0.0.20 (`make kit-sync KIT_TAG=v0.0.20`); `make kit-test` passes on the vendored tests.

- T1.32-2: the Python package states `requires-python = ">=3.14"`, the minor release of `.python-version` that CI runs under the pinned interpreter. The job python of `ci.yml` has no 3.11 matrix entry and no `PYTHON` override, and `scripts/tests/test_python_requires.py` checks the declared range against `.python-version`.

## 0.0.8

- T1.32: the Python package is released as its wheel `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`, built with the pinned build backend `setuptools==84.0.0` (`buildBackend`) and installed from the release asset instead of the git tag. The README and the installation document show the `pip install` line of the wheel URL.

## 0.0.7

- T1.31: the push of a tag does not start `push-gate.yml` (`push: branches: ['**']`), so the release verifies the check `push-gate` of the commit without a second queued run; `test_a_tag_push_starts_none_of_the_workflows_whose_checks_the_release_requires` requires it.
- T1.29-1: the push gate, the full-run guard, the owner check and the CI report are the vendored tools of kit v0.0.4 (`scripts/kit/`, `tests/kit/`, `.kit/kit.lock.json`), configured in `config/checklist.json` and `config/owner-checks.json`. `push_gate.py`, `full_run.py`, `owner_check.py`, `ci_run.py` and their tests are removed. The jobs of `ci.yml` and `push-gate.yml` run `make ci-targets`, and `test_workflow_rules` requires every target of `CHECK_TARGETS` to run in exactly one job. A `partial` feature no longer stops a push or a full run.
- T1.29-2: the release steps are the kit tool `scripts/kit/release.mjs`, configured in `config/release.json`; `release.py`, `install_fixtures.py` and `test_release.py` are removed. The archives of the npm package of `packages/ordered-json-npm/` and of the Composer packages of `packages/ordered-json-php/` and `packages/ordered-json-php-ext/` are named `polyspec-ordered-json-npm-X.Y.Z.tgz`, `polyspec-ordered-json-php-X.Y.Z.zip` and `polyspec-ordered-json-extension-php-X.Y.Z.zip`. `make release-coverage` requires every package file to be classified, and `make release-config-check` runs the step `versions` for the version of `packages/ordered-json-npm/package.json`. The consumer projects of the archives are in `tests/release-consumer`; `make release-consumer-lock` writes their locks on the release commit. The Go module tag is `packages/ordered-json-go/vX.Y.Z`, and `make release-verify` requires it at the commit of `vX.Y.Z`.
- T1.29-3: the documents are checked by `scripts/kit/check-documents.mjs` (`make documents-check`, `config/documents.json`) and the commit messages by `scripts/kit/check-commits.mjs` (`make commits-check`, `config/commits.json`). The document manifests are removed; the `doc-id` marker of each package document starts with `npm-`, `php-`, `php-ext-`, `python-`, `rust-` or `go-`, because a marker names one document of the repository. `docs_check.py` is `scripts/check_evidence.py` (`make evidence-check`), which keeps the checks of the feature rows against their evidence, the distribution observations, the benchmark result, the verification records and the JSON reports, and `test_docs_check.py` is `test_check_evidence.py`. A checklist row writes the states in words.
- T1.29-4: the toolchains are declared in `config/toolchain.json`, `.node-version`, the `packageManager` of `package.json`, `rust-toolchain.toml`, `.php-version` and `.python-version`, and checked by `make toolchain-check` and `make cargo-downloads-check` (kit tools); `make install` installs npm and Go into `var/tools`, the Rust toolchain, the crates and the PIE PHAR and supplementary suite of `external-inputs.json`, and is the only target that downloads. `toolchains.py` and `test.py` are removed: the installs of the external inputs are `scripts/external_inputs.py`, the verifier unit test runner is `scripts/unit_tests.py` (`make test-scripts`) and the aggregate verification is `scripts/verification.py` (`make verify-all`). The flag `--build-extension` is removed. The workflows run `make install`, and the release workflow runs `make install-tools` with Node.js only.
- T1.29-5: the dependencies are gated by `make dependency-policy-check` (`scripts/kit/check-dependency-policy.mjs`) against `config/dependency-policy.json` and the review record `config/dependency-review.json` that `make dependency-review RECORD=1` writes. The root `package.json` has the lock `package-lock.json`. The scripts `test` of `package.json`, `packages/ordered-json-npm/package.json` and `packages/ordered-json-php/composer.json` run `make verify-js` and `make verify-php`. AGENTS states the dependency rule. `make dependency-policy-mutation-check` fails with a TypeError because the repository has no npm registry dependency and no Composer platform for its mutations to change.
- T1.29-6: the packages are in `packages/ordered-json-npm`, `packages/ordered-json-php`, `packages/ordered-json-php-ext`, `packages/ordered-json-python`, `packages/ordered-json-rust` and `packages/ordered-json-go`. The Go module path is `github.com/polyspec/ordered-json/packages/ordered-json-go` and its tag is `packages/ordered-json-go/vX.Y.Z`.
- T1.29-7: AGENTS states that the tools of `scripts/kit/` and `tests/kit/` change only in polyspec/kit, that this repository differs from another polyspec repository only in `config/*.json` and its own product code, the 0.x rule without pull request, merge queue or ruleset, and the archive names `<package>-<language>-<version>.<ext>`. The release 0.0.7 is prepared: the manifests are not bumped, no tag exists, and `make release-config-check`, `make release-coverage` and `make dependency-policy-check` pass for the layout of `packages/`.
- T1.29-8: `config/toolchain.json` declares Composer 2.10.3. The job `docs` of `ci.yml` sets up PHP and that Composer release for `make dependency-policy-check`, and `make kit-test` runs in the job `suite`.
- T1.29-9: the vendored tools of kit are v0.0.8.
- T1.29-10: `make dependency-policy-mutation-check` runs in CI and passes. `make install` installs the Rust toolchain before the tools, and the release workflow installs npm only.
- T1.30: the test `test_both_tag_shapes_start_the_release_and_the_release_steps_handle_both` requires the tag filters of the release workflow to match `vX.Y.Z` and `packages/ordered-json-go/vX.Y.Z`, and AGENTS states that the Go tag is pushed first or with `vX.Y.Z`.

## 0.0.6

- T1.27-25: the release archives are named `<package>-<language>-<version>.<ext>`: the npm archive `polyspec-ordered-json-npm-X.Y.Z.tgz`, the PHP archives `polyspec-ordered-json-php-X.Y.Z.zip` and `polyspec-ordered-json-extension-php-X.Y.Z.zip`.

## 0.0.5

- T1.27-18: the release version test checks the tag of the version that `js/package.json` declares, instead of the fixed tag v0.0.3, which the 0.0.4 bump had made stale.
- T1.27-19: the CI workflow runs on every push to main, so each main commit has the check ci-passed that the release workflow requires.
- T1.27-21: AGENTS.md states the 0.x rule: a change is committed to main after its owning unit test passes locally, and the CI push trigger gives the ci-passed check of each main commit.
- T1.27-22: AGENTS.md states the pin rule: a pin of another repository's package names only a tag that exists on GitHub.
- T1.27-23: the GitHub ruleset and the merge queue are removed; the workflows run on push and pull_request, and the release requires ci-passed on the tagged commit.
- T1.27-17: the consumer fixtures of the release asset install test name the 0.0.4 archives, written by `make install-fixtures`.
## 0.0.4

- On PR #1, `ci-passed` passes after the fixes of T1.27-10 to T1.27-13: the docs, python, push-gate and suite jobs pass on the same commit (T1.27-14).
- The `python` job of CI uploads `var/ci/python/`, the report that `make ci CI_JOB=python` writes, instead of `var/ci/python-<minor>/`, which no target writes; `scripts/tests/test_workflow_rules.py` requires each report path to be the directory of its make target (T1.27-13).
- The push-gate job passes on the committed tree: its exit status 2 came from `make docs-check` in the job, which read the stale translation revisions that T1.27-10 synced, so `scripts/push_gate.py` and `.github/workflows/push-gate.yml` are unchanged (T1.27-12).
- The test test_the_job_fails_on_a_commit_whose_documentation_check_fails passes on the committed tree: its failure came from the stale translation revisions that T1.27-10 fixed, so neither the test nor the code under test changed (T1.27-11).
- The translations of AGENTS, the execution checklist and the changelog state the revision of their English documents again, so the documentation check of the docs job passes: the commit of T1.27-9 changed the English documents without updating the revision (T1.27-10).
- The toolchain download tests run a fake `cargo` on `PATH` for a failed fetch, a successful fetch and a missing `cargo`, so their results do not depend on the `cargo` installed on the machine (T1.27-8).
- Set the `package-data` key of the Python package to `polyspec.ordered_json`, so the `py.typed` marker ships in the wheel, and added `python/tests/package_data.py` to the Python checks (T1.27-9).
- The Python documents state the current facts only (T1.27-7): the installation document and the README show the placeholder `vX.Y.Z` for the first tag that contains `python/`, and the checklist row T1.27-3 names the Python registry state `not-verified` that `docs/distribution.json` records.
- The `python` job of CI pins `actions/upload-artifact` to a commit that GitHub holds, and `scripts/tests/test_workflow_rules.py` requires every action of every workflow to keep one full commit id (T1.27-6).
- The README and the installation document name the Python package (T1.27-5): the README(.ko) lists it in its intro, its package table and its start section, which runs the example from `python/src`; the pip install line and the installation document show the placeholder `vX.Y.Z` for the first tag that contains `python/`, and no released tag contains it yet.
- CI runs the Python package on both supported minors (T1.27-4): the job `python` of `ci.yml` has the matrix
  3.11 and the minor release of `.python-version` and runs `make ci CI_JOB=python`, the package tests, the case
  listing and the symbol report with the interpreter of the job (`scripts/python_check.py`, which checks no
  tool pin because the floor minor is below it); `ci-passed` requires the job.
- A Python implementation package covers the JSON contract (T1.27-2): `python/` holds `polyspec-ordered-json` under
  the import name `polyspec.ordered_json`, and the registry, the package test standard and the owner map of the
  repository cover it; `verify.py --only python` passes the official examples, the 98 shared fixtures and the
  package tests, and the rejection positions and kinds agree with every other implementation.
- The documents and the release check name the Python binding (T1.27-3): the API contract gains the Python
  column of every operation table and states its binding extensions, the repository contract counts six
  implementation packages, the feature state and the installation and distribution documents name Python, and the
  release version check reads `python/pyproject.toml` with the other manifests; the package ships no archive, and
  pip installs it from the tag of the repository.
- The repository tools run on Python 3.14 (T1.27-1): `.python-version` names 3.14, the unit tests of the verifier
  pass on it, every workflow that installs Python reads the pin file instead of a release of its own, and the setup
  section of every package README names the pin file.
- A git that reports in the language of the user reads as no work tree (T1.28): `tracked_files` judged the absence
  of a work tree by the English text of git's error, so a localized git turned the records, documentation checks and
  shared cases of a source tree into errors. The `git rev-parse --is-inside-work-tree` call runs with `LC_ALL=C`,
  and AGENTS states the rule for every command whose output text a check judges.

<a id="0-0-3"></a>
## 0.0.3

- The release asset install test installs as a consumer does (T1.26): `scripts/tests/install` holds a `package.json`
  with its `package-lock.json` and a `composer.json` with its `composer.lock`, which record the archives that
  the test builds by name and version only (no `integrity`, an empty `shasum`), and `test_release` runs `npm ci` with an empty cache and the scope `@polyspec` pointed at an unreachable registry and
  `composer install` with an empty `COMPOSER_HOME` and `COMPOSER_CACHE_DIR`, without the offline settings.
  `make install-fixtures` writes the fixtures and their locks. A Composer zip has stored entries, a fixed entry time
  and `TZ=UTC`, so its bytes and its shasum are the same on every machine. AGENTS states that a check makes no
  registry query whose result depends on time and that a download pinned by a lock is installation.
- Release 0.0.3 (T1.25): `package.json`, `js/package.json`, `composer.json`, `php/composer.json`,
  `php-extension/composer.json`, `rust/Cargo.toml` and the package entry of `rust/Cargo.lock` declare 0.0.3, the
  changelogs hold the section `## 0.0.3` under an empty `## Unreleased`, the installation table names 0.0.3, and
  `make release-versions` passes for the tags `v0.0.3` and `go/v0.0.3`, as `test_release` requires.
- Every published `composer.json` declares `version`, because a Composer artifact repository reads the version of the
  manifest (T1.24). `make release-versions` requires X.Y.Z in `composer.json`, `php/composer.json` and
  `php-extension/composer.json`; `make release-assets` fails on a published manifest outside the standard form (no
  `version` in a `composer.json`, `repositories`, `@dev`, `overrides`, a `file:`, `link:`, `workspace:`, URL or git
  dependency, or a polyspec dependency other than one exact version) and on an archive whose manifest differs from its
  source; `make check` requires the standard form of the tree; `test_release` installs the archives in a temporary
  project with npm and with a Composer artifact repository of the zips. The installation guide describes the install
  from the release assets.
- A release body has at most 125000 characters, the limit of GitHub (T1.23). `make release-publish` uses the section
  `## X.Y.Z` of `CHANGELOG.md` as notes when it has at most 125000 characters, and otherwise the one line
  `The changes of X.Y.Z are listed in [CHANGELOG.md](<URL>).`, whose URL is `CHANGELOG.md` at the tag with the anchor
  of the section. `test_release` covers a section over the limit, with and without an `<a id>` anchor, and a section
  of exactly the limit.

### npm (packages/js)

- Release 0.0.3 of the repository; the package has no change since 0.0.2.


### rust (packages/rust)

- Release 0.0.3 of the repository; the package has no change since 0.0.2.


### go (packages/go)

- Release 0.0.3 of the repository; the package has no change since 0.0.2.


### php (packages/php)

- `composer.json` declares `version`, so a Composer artifact repository of the release zips reads the package
  (T1.24).


### php-ext (packages/php-ext)

- `composer.json` declares `version`, so a Composer artifact repository of the release zips reads the package
  (T1.24).


<a id="0-0-2"></a>
## 0.0.2

- Release 0.0.2 (T1.22): `package.json`, `js/package.json`, `rust/Cargo.toml` and the package entry of
  `rust/Cargo.lock` declare 0.0.2, the changelogs hold the section `## 0.0.2` under an empty `## Unreleased`, the
  installation table names 0.0.2, and `make release-versions` passes for the tags `v0.0.2` and `go/v0.0.2`, as `test_release` requires.
- The release of a tag covers the Go module tags at any depth, and its assets are npm tarballs and Composer zips only
  (T1.21-4). The trigger of `.github/workflows/release.yml` is `tags: ['v*', '**/v*']`: in a tag filter `*` does not
  match `/`, so `**/v*` covers `go/vX.Y.Z` and the tag of a Go module at any depth. The Cargo package of `rust/` is
  not released as an archive; it is consumed by git tag, because `cargo package` rewrites git dependencies into
  crates.io requirements that do not resolve. `scripts/release.py` lists it so in its manifests, and
  `test_release` fails on a Cargo archive.
- A tag of a commit of `main` releases it (T1.21-3). `.github/workflows/release.yml` runs on the push of a tag `v*` or
  `**/v*` with the permission `contents: write`; `make release-verify` requires the tagged commit on `origin/main` with
  the check runs `push-gate` and `ci-passed` concluded `success`, `make release-versions` the version of the tag in
  every manifest and the section `## X.Y.Z` in `CHANGELOG.md`, `make release-assets` builds the npm and Composer
  archives, and `make release-publish` creates the GitHub Release with the section as notes (`scripts/release.py`,
  `scripts/tests/test_release.py`). AGENTS states the release procedure.
- The ruleset `main` requires exactly the checks `push-gate` and `ci-passed` (T1.21-2). `ci-passed`, the last job of
  `ci.yml`, needs every other job, runs after each of them under `if: ${{ always() }}` and runs `make ci-passed`, which
  fails unless every needed job has the result `success`; a job added to `ci.yml` is required once it is in `needs`.
  `test_workflow_rules` fails when the job is missing, is not last, lacks `if: ${{ always() }}`, does not need every
  other job, runs on another runner or runs another step.
- The changelogs keep the section `## Unreleased` above the released versions (T1.21-1). The entries of the tag
  `v0.0.1` form the section `## 0.0.1`, the changelog of each package has the same two sections, and every change adds
  its entry under `## Unreleased`.
- Each workflow declares its triggers exactly (T1.20): `ci.yml` runs on `pull_request`, `merge_group` and
  `workflow_dispatch`, and `push-gate.yml` on `push` with `branches-ignore: ['gh-readonly-queue/**']`,
  `pull_request` and `merge_group`. `test_workflow_rules` fails when the `on:` block of a workflow differs.

### npm (packages/js)

- Release 0.0.2 of the repository; the package has no change since 0.0.1.


### rust (packages/rust)

- Release 0.0.2 of the repository; the package has no change since 0.0.1.


### go (packages/go)

- Release 0.0.2 of the repository; the package has no change since 0.0.1.


### php (packages/php)

- Release 0.0.2 of the repository; the package has no change since 0.0.1.


### php-ext (packages/php-ext)

- Release 0.0.2 of the repository; the package has no change since 0.0.1.


<a id="0-0-1"></a>
## 0.0.1

- The development procedure of each package names the required checks of the repository root (T1.19): development
  runs unit tests only, `make check` of a package runs the shared verifier for that package alone, and hosted CI runs
  the full suite after the push.
- The packages follow the polyspec naming convention (T1.18): Composer `polyspec/ordered-json` and
  `polyspec/ordered-json-extension`, the PHP namespace `Polyspec\OrderedJson` with the extension class
  `Polyspec\OrderedJson\NativeParseError`, npm `@polyspec/ordered-json`, and the Cargo package `polyspec-ordered-json`
  with the library `polyspec_ordered_json`. The Go module `github.com/polyspec/ordered-json/go` already followed it.
- Every change reaches `main` through a pull request and the merge queue (T1.17). The ruleset `main` requires a pull
  request that allows every merge method, the merge queue with the method `REBASE`, a linear history and the checks `push-gate`, `suite` and `docs`,
  without a bypass actor. `ci.yml` and `push-gate.yml` run on `merge_group`, and `ci.yml` not on a push to
  `main`.
- The job `push-gate`, which the ruleset `main` requires, runs `make docs-check` after the gate (T1.16), so a commit
  whose documents, feature tracker or checklist fail their own checks cannot reach `main`.
- A new push cancels the previous CI run of the same ref (T1.15). `ci.yml` declares `concurrency` with group
  `${{ github.workflow }}-${{ github.ref }}` and `cancel-in-progress: true`, because runners are few; `push-gate.yml`
  declares none. `test_workflow_rules` fails on a workflow that runs `make ci` without it.
- `make check` runs clippy and go vet (T1.11). AGENTS required `cargo clippy --all-targets -- -D warnings` and
  `go vet ./...`, but no command of the full suite ran them. `make check` runs `scripts/lint.py clippy` and
  `scripts/lint.py go-vet` as guard targets of their own after the verification, and `make clippy` and `make go-vet`
  run one. The changed and new cases of `test_full_run` and `test_lint` failed before the change and pass after it.
- The first failure lines of the CI summary name the checker errors (T1.14). The summary of
  `docs-check` showed only the line of make, and the summary of `check` showed passing case lines whose names contain
  `missing`. `scripts/ci_run.py` takes a line that names a file and skips passing case lines and the directory lines
  of make. The new case of `test_ci_run` failed before the change and passes after it.
- The CI summary test compares the summary with the log of the target (T1.13). In CI it failed,
  because it expected the wording of GNU Make 3.81 and the runner's GNU Make 4 names the Makefile line.
- Development runs unit tests only (T1.12). AGENTS and the validation procedure state that `make pie-check`,
  `make check`, `make owner-check`, adapter suites and supplementary suite runs are end-to-end checks that hosted CI
  runs after the push, that no rule requires a local run before a commit or a push, and that the pre-push hook stays a
  fast gate.
- setup-node runs without its npm cache (T1.10). In CI it failed with `Dependencies lock file is
  not found`, because it caches the dependencies of the `packageManager` of `package.json` by default and the
  repository has no lock file. The step sets `package-manager-cache: false`; `test_workflow_rules` fails without it.
- `make ci` and `make ci-summary` parse their job (T1.9). In CI both steps failed with
  `the following arguments are required: --job`, because the remainder argument of the targets also took `--job`, so
  no report was written. `scripts/ci_run.py` splits the targets off at `--` before it parses. The new case of
  `test_ci_run` failed with that error before the change and passes after it.
- A test checks the rules of every workflow (T1.8). `scripts/tests/test_workflow_rules.py` fails, naming the file,
  the job and the step, when a step runs anything but one make target, when a job that runs `make ci` lacks its
  summary or report step under `if: ${{ !cancelled() }}` or has a step that does not run after a failure, when a
  matrix lacks `fail-fast: false`, and on `timeout-minutes`. Applied to `push-gate.yml` before T1.4 it names the
  step that ran `python3 scripts/push_gate.py` directly; the current workflows pass.
- Hosted CI runs the full suite (T1.7). Hosted CI ran only the push gate, so the full suite of a commit ran only on
  a local machine. `.github/workflows/ci.yml` runs on every pushed commit of `main` and every pull request on
  `ubuntu-24.04`, where Python 3.9 exists, with the jobs `suite` (`make pie-check`, `make check`) and `docs` in a
  matrix with `fail-fast: false`. Every step runs a make target, also after a failure; `make ci`
  (`scripts/ci_run.py`) runs every target to its end with a log per target, `make ci-summary` writes the job summary
  with the status, the time and the first failure lines of each failed target and copies the records, and the
  report `var/ci/<job>/` is uploaded. The cases of `test_ci_run` failed before the runner existed and pass after it.
- The run of a commit is its evidence; no record is committed (T1.6). `docs/pie-verification.json` and
  `docs/verification.json` hashed every tracked file, so each commit made them stale, the guard of `make check`
  refused until a local `make pie-check` and `make check` regenerated and committed them, and a hosted CI that runs
  the full suite would fail after every commit. `make pie-check` and `make check` write
  `var/records/pie-verification.json` and `var/records/verification.json`, which Git ignores, and the committed
  records are removed. `scripts/docs_check.py --records` checks the records of the checkout, the guard reads no
  record, and a feature names the records section of the validation procedure as its evidence. The changed and new
  cases of `test_docs_check` and `test_full_run` failed before the change and pass after it.
- PHP is pinned by its minor release (T1.5). No tracked file named the PHP of the checks, so a run on another PHP
  verified the tree with a PHP that no pin named. `.php-version` names 8.5, `scripts/toolchains.py` compares the
  major.minor of `php -n -r 'echo PHP_VERSION;'` with it and prints the expected and the actual version, and the
  records name the running patch release. The changed cases of `test_toolchains` failed before the change and pass
  after it.
- The push gate of CI runs through its make target (T1.4). The step of `.github/workflows/push-gate.yml` ran
  `python3 scripts/push_gate.py commit` directly, so the environment and the prechecks of the Makefile did not apply.
  `make push-gate COMMIT=<commit>` runs the gate and fails without `COMMIT`, and the step runs it. The changed and new
  cases of `test_push_gate` failed before the change and pass after it.
- A missing download names `make tools` (T1.3). With the checks offline, a crate that `make tools` did not
  download failed with cargo's advice to retry without `--offline`, a missing PIE PHAR failed `make pie-check` with a
  `FileNotFoundError` traceback, and a missing supplementary suite failed with `--suite must contain test_parsing/`
  or `Supplementary suite is empty`. Every entry point runs `cargo fetch --locked --offline` for `rust/Cargo.lock`
  after the toolchain check and fails with the lock file, the first error line of cargo and `run make tools, which
  downloads them`; `scripts/check_pie.py` and `scripts/test.py` name the missing PHAR or suite and `make tools`
  before any step. The new cases of `test_toolchains` failed before the change and pass after it.
- The checks run offline and only `make tools` downloads (T1.2). cargo, go, npm and Composer ran online in every
  check, so `cargo build --locked` downloaded the crates of `rust/Cargo.lock` on demand, and the PIE PHAR and the
  supplementary suite were downloaded by hand. The Makefile exports `CARGO_NET_OFFLINE=true`, `GOPROXY=off`,
  `npm_config_offline=true` and `COMPOSER_DISABLE_NETWORK=1`, `scripts/toolchains.py` sets them for every entry
  point, and `make tools` runs with them removed: it installs the Rust toolchain, npm, the crates, the PIE PHAR
  into `.cache/pie/pie.phar` and the supplementary suite into `.cache/JSONTestSuite`, each checked against
  `external-inputs.json`. The new cases of `test_toolchains` failed before the change and pass after it.
- Tasks that are not product features are tracked in the execution checklist
  `docs/plans/execution-checklist.md` (T1.1). The guard of `make check`, the pre-push hook and the push gate read
  only the `partial` features of `docs/features.md`, so such work had no state that stopped a full run or a push.
  Each task has one of the states `[ ]`, `[~]`, `[o]` and `[!] cause: <cause>; retry: <condition>`;
  `scripts/docs_check.py` rejects another state, a row without a task ID, a repeated ID, a checklist without rows
  and a translation whose IDs or states differ, and `scripts/full_run.py` and `scripts/push_gate.py` refuse while a
  task is `[~]` or the checklist cannot be read. The new cases of `test_docs_check`, `test_full_run` and
  `test_push_gate` failed before the change and pass after it.
- Python is pinned by its minor release. `.python-version` named 3.9.6 and `scripts/toolchains.py`
  required that exact release, while CI runs 3.9.25, because `actions/python-versions` builds no
  3.9.6 for `ubuntu-24.04`; local runs and CI followed different rules. An interpreter whose patch
  release cannot be the same locally and on CI is pinned by its minor release: `.python-version`
  names 3.9, the check compares major.minor and prints the expected and the actual version, and the
  aggregate and PIE records name the running patch release in `platform.python`. No check compares
  the PHP patch release. The new cases of `scripts/tests/test_toolchains.py` failed before the
  change, because a 3.9.25 interpreter failed the check, and pass after it; a 3.10 interpreter fails.
- AGENTS.md has the section Idempotency: the same tree gives the same result at any time and on any
  machine, a defect found in one polyspec repository is a class corrected in every repository, and
  one rule per class names how this repository meets it: tools at their tracked versions without
  registry queries or installs on demand, tests that read only their own outputs and tracked files,
  atomic publication, accumulated failures, failures with expected and actual values and the tool's
  error, failing empty selections, process groups reaped and directories removed in `finally`, no
  assertion on human-readable tool output, an owner for every changed file, and leases or per-run
  directories for shared state.
- The build copy of the PHP extension holds only the files Git tracks. `scripts/registry.py`
  copied `git ls-files --cached --others --exclude-standard`, so an untracked file in
  `php-extension/` entered the build of `scripts/verify.py`, `make pie-check` and the benchmark while
  no record named it. The copy uses the tracked list of the source manifest; a tree without Git
  metadata is copied whole, and a tracked symbolic link is still refused. The changed case of
  `scripts/tests/test_run_isolation.py` failed before the change, because the untracked file was
  copied, and passes after it.
- Every tracked path maps to the checks that own it. The new `scripts/owner-checks.json` maps globs
  of paths to verifier unit test modules, implementations that `scripts/verify.py --only` checks, and
  the checks `docs` and `benchmark`; the new `scripts/owner_check.py`, run by `make owner-check`,
  validates the map and runs the owners of the uncommitted changes, of `PATHS` or of the paths changed
  since `BASE`, each to its end. The new pre-commit hook `.githooks/pre-commit` refuses a commit while
  a tracked path matches no rule, a glob matches no path or an owner does not exist, and
  `scripts/push_gate.py` requires it like the pre-push hook: `make hooks-check` fails when it is not
  executable, and CI fails when it is not tracked with mode 100755. Nothing named the tests that own a
  changed file, so the procedure to run only the owning tests depended on reading the sources. The
  cases of the new `scripts/tests/test_owner_check.py` and the new case of
  `scripts/tests/test_push_gate.py` failed before the change, because the map, the check and the hook
  did not exist, and pass after it.
- A build step, a package test command and an adapter end with their whole process group,
  grandchildren included. The group was killed only while the direct child still ran, and the reader
  waited for end of file, so a background process that a command started kept running after it, a
  build step waited for that process without limit, and a package test run failed at the case
  deadline. `scripts/registry.py` reads output with `next_chunk`, which kills the group once the
  command has exited, and `end_group` kills the group in every `finally`. The cases of
  `scripts/tests/test_build_runs.py` and `scripts/tests/test_comparison_runs.py` patched
  `BUILD_SECONDS`, `PIE_SECONDS` and a `timeout` argument that no code has, so the patches changed
  nothing; they now assert that the silent step ran for 2 s or more to its own exit. The cases of the
  new `scripts/tests/test_process_groups.py` failed before the change, because the build step waited
  until the test deadline, the package tests failed at their case deadline and the grandchild of a
  stopped adapter survived, and pass after it.
- Case listings are read in a declared machine format. The listing parser skipped lines by their
  human-readable text (`ok`, `?`, `running`, `test result:`, `FAIL`) for every language, so a line of
  a package's own list that started with `ok` was dropped, and any notice on standard error failed a
  listing that had succeeded. `test_cases` of `implementations.json` declares `format`: `lines` for
  the lists of JavaScript, PHP and the PHP extension, `cargo-terse` for
  `cargo test -- --list --format terse`, and `go-test-json` for `go test -list .* -json`, whose output
  events hold a test name or the summary line of their own package. A line that the format does not
  define fails the listing; a nonzero exit fails it with standard error, and standard error of a
  listing that exits with 0 is printed as tool notices. The `make -n` cases of
  `scripts/tests/test_full_run.py` and `scripts/tests/test_push_gate.py` also remove `GNUMAKEFLAGS`
  and `MAKEFILES` of the caller, which add flags and makefiles to every make. The cases of the new
  `scripts/tests/test_case_listings.py` and the new case of `scripts/tests/test_full_run.py` failed
  before the change, because no format was declared, an `ok` line passed, a notice failed a listing
  and a makefile from `MAKEFILES` printed into the dry run, and pass after it.
- The guard of `make check` and `make rerun-failed` holds `var/full-run.lock` exclusively from its
  first inspection to its end, and refuses, naming the holder, while another guard holds it. Two
  guards started at once both read no record of a running run and both ran the verification of
  one tree. Reading the Makefile no longer writes `core.hooksPath`: every `make` run, including
  `make -n`, set it while it read the Makefile. `make hooks` runs the new
  `scripts/push_gate.py hooks-install`, which writes the configuration only when the value differs
  and then checks the hook, and the guard still refuses a checkout without the hook. The new case of
  `scripts/tests/test_full_run.py` failed before the change, because both guards ran the target,
  and the changed case of `scripts/tests/test_push_gate.py` failed, because `make -n docs-check`
  wrote `core.hooksPath`; both pass after it.
- Failures name what differs. A PIE build or tool error said only "see the PIE output above"; it
  now lists the lines that matched. A stale aggregate or PIE record, and sources that changed during
  a run, said only that the sources differ; each now lists every changed, added and removed file.
  A failing runtime version command and a failing benchmark command lost the tool's standard error;
  both now include the exit status and that error. The `extension_version` runtime command of
  `implementations.json` exited with status 1 and no message when `phpversion('ordered_json')`
  differed from `ORDERED_JSON_VERSION`; it now prints both values. The rule that a refused push
  prints said that CI runs the full verification, which it does not; it now says that CI does not
  run the verification. The `test` scripts of `js/package.json` and `php/composer.json` ran
  `scripts/check.py`, which does not exist; they run `../scripts/verify.py --only js` and
  `--only php`. The cases of the new `scripts/tests/test_failure_messages.py` failed before the
  change, because each message lacked the named lines, files, values or error, and pass after it.
- `benchmarks/run.py` and the comparison script publish their results through `write_record`,
  which renames a complete file over the result. They wrote `benchmarks/results.json`, the review
  copy `.cache/benchmark.current.json` and the comparison report in place, so a
  process that stopped after opening the file left it truncated, and a reader could see part of it.
  `write_record` stages a file inside the repository in `var/`, which Git ignores and no manifest
  reads, instead of a hidden file next to the record in `docs/`. The two interruption cases of the
  new `scripts/tests/test_atomic_publish.py` failed before the change, because a stop right after
  the open left an empty file, and pass after it.
- `make pie-check` compares the hash of the PHAR and the JSONTestSuite checkout with the pins of
  `external-inputs.json` before PIE runs, and `make check` compares the suite before the unit tests.
  Only the documentation check at the end compared them, so a PHAR or a suite checkout other than
  the pinned one spent a whole build and run on a record that the check then rejected. Each field
  that differs fails the command with the expected and the actual value. The pin loader moved from
  `scripts/docs_check.py` to `scripts/verification_record.py`, next to the new `input_issues`. The
  cases of the new `scripts/tests/test_external_pins.py` failed before the change, because PIE ran
  with an unpinned PHAR and suite and the full run started its unit tests with an unpinned suite,
  and pass after it.
- `scripts/test.py --unit` fails with `selected 0 tests` and the name when a name selects no test,
  before any test runs, and the full run fails when it discovers no unit test. `--unit registry`
  loaded the module `scripts/registry.py`, which has no tests, ran 0 tests and exited with status 0,
  so a mistyped selection passed as a test run. The new case of `scripts/tests/test_unit_runner.py`
  failed before the change, because `--unit registry` exited with status 0, and passes after it.
- The push gate and the guard refuse a tracker that yields no feature row. Both read only lines that
  start with `| F-`, so a `docs/features.md` without the feature table, with an empty table or with
  a row whose ID is not `F-...` had no `partial` row, and `scripts/push_gate.py hook` returned no
  refusal. `scripts/docs_check.py` reads the feature table with the new `feature_table`, which
  raises on a missing table, a table without rows and a row that is not a feature, and
  `scripts/full_run.py` and `scripts/push_gate.py` read the rows with it; the push gate refuses the
  push and the guard refuses the run with the reason. The new cases of
  `scripts/tests/test_push_gate.py` and `scripts/tests/test_full_run.py` failed before the change,
  because the hook, the CI command and the guard passed such a tracker, and pass after it.
- Every run checks its tools against tracked pins before any work. Nothing pinned them: a run used
  whatever Node.js, Rust, Go, Python and npm the machine had, go could download the toolchain of
  `go.mod`, rustup could install a toolchain on the first cargo, cargo could rewrite `Cargo.lock`,
  and CI ran on `ubuntu-latest` with actions at moving tags. `.node-version` pins Node.js 26.8.1,
  `rust-toolchain.toml` Rust 1.98.1, the new `toolchain` line of `go/go.mod` Go 1.27.0,
  `.python-version` Python 3.9.6, and `packageManager` of `package.json` npm 12.2.0 with the SHA-512
  of its registry tarball. The new `scripts/toolchains.py` compares each tool with its pin;
  `scripts/test.py`, `scripts/verify.py`, `scripts/check_pie.py` and `benchmarks/run.py` call it
  before their first step and fail with the expected and the actual version, or the error of the
  command, of each tool that differs. `GOTOOLCHAIN=local` and `RUSTUP_AUTO_INSTALL=0` are set by the
  Makefile, the registry and the check, every cargo command uses `--locked`, and runtime versions are
  read in the repository directory, where rustup reads the pin. `make tools` installs the Rust
  toolchain and downloads the npm tarball, refuses it unless its hash matches, and unpacks it without
  links into `.cache/tools/npm`, which comes first on `PATH`; no npm of the machine is used or
  changed. No recipe runs a pinned tool by name, because GNU Make 3.81 looks a simple recipe command
  up on its own `PATH`, not the exported one. CI runs on `ubuntu-24.04` with `actions/checkout` and
  `actions/setup-python` pinned to commits and Python 3.9.25, the last 3.9 release that
  `actions/python-versions` builds for that image; it runs only `scripts/push_gate.py`. The cases of
  the new `scripts/tests/test_toolchains.py` failed before the change, because no pin or check
  existed, the cargo commands had no `--locked` and the workflow used `ubuntu-latest` and tags, and
  pass after it.
- A verification runs every step of every language to its end and reports every failure. The first
  failure ended the run: a failing prepare step raised, the package tests stopped at the first
  failing package, the shared cases stopped at the first mismatch, and `scripts/test.py` returned
  before the builds when a unit test failed, so a second failing language stayed unreported until
  the first was fixed and the whole run started again. `scripts/test.py` now runs the unit tests,
  the build of each language, the case and symbol listings, the package tests, every case of every
  adapter and the runtime versions to their end, lists every failure, and returns 1 without writing a
  record. A failed build skips only the later steps of its own language. `scripts/verify.py --only`
  lists every failure and exits with status 1. `scripts/tests/test_repositories.py` asserted that a
  failing package stopped the verification; it now asserts that the packages after it run and that
  both failing packages are reported. That case and the cases of the new
  `scripts/tests/test_failure_collection.py` failed before the change, because only the first of two
  failing languages was reported, and pass after it.
- Records, documentation checks and shared cases read only the files Git tracks. The source manifest
  of `scripts/verification_record.py` listed `git ls-files --cached --others --exclude-standard` and
  added every match of its source patterns, so an untracked file changed the manifest that a record
  names as the committed tree; `scripts/docs_check.py` walked the directories for Markdown documents
  and JSON reports and counted the fixtures on disk, and `scripts/verify.py` ran every fixture file
  on disk as a shared case. `scripts/registry.py` lists the tracked files with
  `git ls-files --cached`, and each of these reads uses that list; a tree without Git metadata, such
  as a source archive, still reads its files. The guard `scripts/full_run.py` also refuses a full run
  while a file that `.gitignore` does not ignore is untracked, naming each one, because a build reads
  it. The cases of the new `scripts/tests/test_tracked_inputs.py` and the new case of
  `scripts/tests/test_full_run.py` failed before the change, because an untracked file changed the
  manifest, the documents, the reports, the fixtures and the guard decision, and pass after it.
- Every cargo command of a verification run builds into `CARGO_TARGET_DIR` inside that run. The Rust
  probe was `rust/target/debug/examples/probe`, and cargo used the target directory that the
  environment named, so a probe, a test binary or an API listing built by another checkout or an
  earlier tree could answer for the current sources. `implementations.json` declares
  `"env": {"CARGO_TARGET_DIR": "{cache}/rust-target"}` for `rust`, `scripts/registry.py` passes it to
  every prepare step, listing, test and runtime command of the implementation, and the probe is
  `{cache}/rust-target/debug/examples/probe`. `benchmarks/run.py` runs `cargo run` of the Rust
  benchmark with `CARGO_TARGET_DIR` inside its run directory. The two new cases of
  `scripts/tests/test_run_isolation.py` failed before the change, because the commands kept an
  inherited `CARGO_TARGET_DIR=/shared/target`, and pass after it.
- A push happens only when no feature of `docs/features.md` is `partial`. The pre-push hook
  `.githooks/pre-push` runs `scripts/push_gate.py hook`, which refuses the push while a pushed commit
  or the working tree has a `partial` row, naming each ref, commit, ID and feature, and refuses when
  it cannot read `docs/features.md` of a pushed commit. Every `make` run sets `core.hooksPath` to
  `.githooks` while it reads the Makefile; `make hooks` sets and checks it, and `make hooks-check`
  fails when it is not set or the hook is not executable. The guard `scripts/full_run.py` refuses
  `make check` and `make rerun-failed` while the hook is not installed. The workflow
  `.github/workflows/push-gate.yml` runs `scripts/push_gate.py commit` in the job `push-gate` on every
  pushed branch and pull request, because a push from a checkout without the hook does not run it;
  it fails while a feature is `partial` and when `.githooks/pre-push` is not tracked with mode
  100755. AGENTS stated that the repository had no CI workflow and that nothing refused a push of
  work in progress. `scripts/tests/test_push_gate.py` and the two new cases of
  `scripts/tests/test_full_run.py` failed before the change, because the gate, the hook and the
  workflow did not exist and the guard took no hook state; all 20 cases of both files pass after it.
- `scripts/docs_check.py` fails, with the file, line and column, on an implementation state
  (`implemented`, `partial`, `planned`) written as a code span or a table cell anywhere in
  `docs/features.md` or its translation other than the Implementation cell of a feature row, and on
  a line other than the table in the section of the feature table. `docs/features.md` is the tracker
  that `scripts/full_run.py` reads, and its legend paragraph wrote each state as a code span inside
  that section, so a tool that reads the states saw states outside the feature rows. The legend
  moved to the new section Feature state of AGENTS.md, which defines the states. A state word in
  prose is ordinary English and is not checked. `scripts/tests/test_docs_check.py` failed in its two
  new cases before the change, because a code span, a table cell and a paragraph in the table
  section passed the check; both pass after it, and the check reported line 9 of `docs/features.md`
  and line 10 of the translation before the legend moved.
- `make check` starts the guard `scripts/full_run.py` before the verification. The development
  procedure runs `make check` once, after every active item is complete, and nothing enforced it:
  `make check` started the verification while work was in progress, with uncommitted changes and
  on a tree it had already verified. The guard prints its decision with the reason and refuses
  while a feature of `docs/features.md` is `partial`, listing each ID with its feature, while
  tracked changes are uncommitted, and when `var/full-run.json` records a full run of the current
  tree, naming that run. It runs the verification to its end and writes the record before and
  after it, so a stopped run stays `incomplete`. `make rerun-failed` runs the verification again
  only when the full run of the current tree failed or did not finish. `docs/features.md` defines
  `partial` as work in progress and `planned` as work not started.
  `scripts/tests/test_full_run.py` failed with `No module named 'full_run'` before the change,
  while `make -n check` printed `scripts/test.py` alone; its 10 cases pass with stub targets after
  it.
- Each verification run builds in its own temporary run directory and removes it at the end.
  `make check`, `scripts/verify.py`, the PIE check and the benchmark build the PHP extension
  from a copy of the `php-extension/` source files there, the Go probe is written there, PIE
  works there. The extension was
  built in `php-extension/src` with `make distclean`, `phpize` and `configure`, and the Go probe,
  the PIE work directory and the probe build directories used fixed paths under `.cache/`, so two runs of
  one checkout cleaned or replaced each other's build output while the other run used it. The
  registry key `build_in_copy` selects the copied build; the copy holds tracked and unignored
  files and rejects a symbolic link. The PIE record names the artifact relative to the run
  directory. The ignored output of the former in-place builds (the `phpize`, `configure` and
  `make` files and `modules/` in `php-extension/src`, `.cache/probes` and `.cache/pie-check`) was
  removed from the checkout, since no command reads it.
- Build steps stream their output. Each `prepare` step and each PIE command prints a start line,
  every output line as it arrives, and its exit status with the elapsed time. Both collected the
  output and printed it after the command ended, so the PIE build showed nothing for about 42 s.
- A build step or PIE command has no time limit; its exit status and its output decide the
  result. A deadline of 1500 s per `prepare` step and 4200 s per PIE command killed a healthy
  build that stayed silent past it and failed the run. Package test cases and adapter replies
  keep their 60 s deadlines.
- The verifier sends each adapter one shared case at a time and reads one reply with a deadline
  of 60 s, printing each case with its elapsed time; an adapter that does not reply is killed and
  the case is named. It sent every case at once with one 60 s limit for the whole adapter run,
  so a slow or silent adapter failed without naming a case, and nothing was printed until the
  adapter ended.
- Package tests stream their output. Each case has a deadline of 60 s after the previous result
  line; a runner that passes it is killed with its process group and the verifier reports the
  case it was running, with the elapsed time. The verifier collected all output and printed it
  only when a runner ended, so a hung case showed nothing and the run did not end. The
  JavaScript and PHP runners print `<id> ok|FAIL (<ms>)` for each case. Rust runs with
  `--test-threads=1` and without `--quiet`, so each test name is printed before it runs, and Go
  runs with `-v -p 1`, because `go test` holds the output of each package until it ends when it
  tests several packages in parallel.
- The development procedure runs only the tests that own a change while it is in progress
  (`scripts/verify.py --only`, `scripts/test.py --unit`) and runs `make check` once, after every
  active item is complete. It required `make check` for every change, which reruns every package
  and the shared cases after each correction. Work happens on `main` by default, and a branch or worktree that an agent or the
  situation needs is removed immediately after it is merged.
- The verifier unit tests print each test by name as it starts, then its status and elapsed
  time, and each test has its own deadline, 60 s unless the test declares another; a test past
  its deadline fails by name. The runner printed one dot per test, so a hung test printed nothing
  and the run did not end. `python3 scripts/test.py --unit TEST...` runs only the named
  tests.
- `make docs-check` checks documents only. It compared the verification records with the
  current sources, so after any source edit it failed with "Verification is stale" until the full
  suite ran. `make check` runs the checker with `--records` after it writes the record, so a stale
  verification or PIE record still fails there.
- Remove the root `Cargo.toml`. It defined the `ordered-json` package a second time beside
  `rust/Cargo.toml`, so every Cargo build that depends on this repository warned "skipping duplicate
  package"; Cargo finds `rust/Cargo.toml` in a Git dependency without it. A repository test
  requires one manifest for each Cargo package.
- Format the Rust sources with rustfmt and check the format before every Rust build of
  `make check`. `rust/src/lib.rs` and `rust/tests/api.rs` were not in rustfmt form, and no check
  caught it.
- Declare `ParseError.kind` in the JavaScript type declaration. The parser sets the rejection kind
  on every `ParseError`, but TypeScript callers could not read it without a cast.
- Add the JavaScript `rejectDuplicates` parse option, which rejects repeated decoded object keys
  at every depth with the same offset rule in UTF-16 units. The default parse is unchanged.
- Add a PHP parse that rejects repeated decoded object keys at every depth, with the same
  offset rule as the Rust strict byte parser. `Value::parse` retains its documented result.
- Pin the typed Rust binding dependencies to the verified versions. The binding writes raw JSON
  through the Serde JSON token protocol, so a dependency update requires its package tests.
- Accept `package-tests` as a feature verification state when the verification record contains
  the implementation's test result. The Rust minimum is 1.71 because the current test dependency
  requires it.
- Add typed Rust Serde encoding and decoding. Structure fields retain declaration order and
  wire and manifest fixtures fix output bytes; embedded `Value` fields retain object order and
  number tokens; malformed, repeated and unknown input fails.
- Add a Rust byte parser that rejects repeated decoded object keys at every depth. Callers that
  require every input member can select it while the normal parser retains its documented result.
- Disable Cargo registry publication for the Rust package. The package has no declared Rust
  license, and the source checkout is its confirmed distribution.
- Fixed Go `Marshal` for a nil `*Value` field: it now writes `null`, as it does for other nil pointers, instead of returning `expected orderedjson Value`. The nil check runs before the `MarshalJSON` boundary, so any nil pointer whose type implements `MarshalJSON` is `null`, and an interface is encoded as the value it holds.
- The benchmark runner now validates each fixture's declared object, array,
  scalar, node, and maximum-depth counts against the parsed input. Added
  regression tests for correct metadata, node counting, and depth mismatch
  rejection.
- Every benchmark harness warms up for a declared duration as well as a declared iteration count, and the runner no longer prints that it saved the committed result when it kept a failed measurement out of it. A warm-up counted only in iterations ended in microseconds on the small fixtures, so whichever fixtures a process measured first read 1.5 to 1.7 times slower, `serde_json` included; reversing the fixture order moved the slowdown with the position, not with the fixture. The recorded protocol now carries the warm-up duration, so results measured under the earlier protocol are not comparable and the baseline was measured again.
- The registry declares the repository URL once. The same value sat in `implementations.json` five times, once per package, and as a literal in both the registry loader and the documentation checker, so a source observation was compared against a constant rather than against a declaration. It is now compared against the one the registry makes.
- A feature names the record that backs the state it claims, and a benchmark result is evidence only when it was measured from a clean checkout, with the protocol and inputs `workload.json` declares. The earlier rule required every verified feature to link `verification.json`, which says nothing about benchmarks, so `F-BENCHMARK` cited a record holding no measurement at all. The committed result had been measured from a dirty tree sixty commits earlier, so the sources it described could not be established, and it was measured again. A result is a record rather than a source, so re-measuring no longer makes the aggregate verification record stale.
- A verification record keeps only values something can check. External inputs, the PIE tool and the supplementary suite, are pinned in `external-inputs.json` and compared with the record. The recorded extension artifact hash was removed: a linked module receives a fresh identifier and signature, so no rebuild reproduced it, the value could not be wrong, and `make pie-check` rewrote the committed record on every run. The record now names the artifact by the path the registry declares, a declaration nothing read until now. A test changes every recorded hash in turn and requires the check to fail, so a value nothing can falsify cannot return.
- A parse error carries a rejection kind from one shared list, and the shared check requires every implementation to name the same kind for the same document. Message wording stays in each language's own style: Go and Rust keep lowercase sentences, and JavaScript keeps its finer wording for number errors.
- Every package reports its public symbols, and the standard names the cases that cover each one. The comparison found four gaps: Go `ParseBytesBorrowed` had no test, Rust `OrderedMap::iter` and `stringify` were never called by a case, and the JavaScript type declaration described a `stringify` options argument the function does not take.
- The shared check compares where each implementation rejects an input, and every implementation now reports the first byte that makes the document invalid. The comparison found five documents whose positions differed: JavaScript, Go and both PHP backends pointed one byte past an unescaped control character, and pure PHP pointed at the start of an invalid Unicode escape instead of the offending byte.
- Added a package test standard and the check that enforces it. Each implementation reports the cases it runs, and `make check` fails when a required case is missing or a reported case is not declared, so cross-language coverage is decided by the tool rather than by review.
- An invalid UTF-8 error reports the first invalid byte in every implementation. JavaScript and Go reported offset 0 while Rust and both PHP backends reported the byte, and no shared case compared the position. Package tests now require the rule in every implementation.
- The JavaScript package declares its own tests for the value API, which no shared case can reach. Every implementation package now declares package tests.
- The Rust package declares its own tests for the value API, which no shared case can reach.
- Fixed the PHP unpaired-surrogate error, which raised a class-not-found error instead of `UnexpectedValueException` because the exception name was unqualified inside the namespace. The PHP package now declares its own tests, which found it.
- The PHP extension package declares its own tests for the descriptor API, which no shared case can reach.
- The API contract states the rule for an API that only one binding provides: it uses the shared parser and serializer, leaves results, errors, and offsets unchanged, appears in the binding extensions section, and is covered by its package's declared tests. Go `Marshal` is documented there.
- The implementation registry declares each package's own test command, `make check` runs the declared commands, and the verification record requires their results. Shared cases run through adapters and cannot reach a language-specific API, so a defect in one survived while every shared case passed.
- Corrected Go `Marshal` omission rules and error reporting: `omitempty` and `omitzero` are separate rules, non-finite floats name the field that holds them, and the unreachable `time.Time` branch is removed. A seeded randomized test compares 20,000 values with the host encoder's decoded structures.
- Fixed Go `Marshal`: anonymous struct fields contributed no fields, a repeated field name silently lost a field, and a cyclic value recursed until the process died. Promotion now matches Go field promotion, repeated names and values deeper than the parser's limit are errors.
- PHP object hydration creates one value per member instead of two; serialization reads key tokens from the descriptor. Parse followed by full traversal took 0.85-0.99 of the previous time with the extension and 0.90-1.00 in pure PHP, with identical results.
- Added the Go `Marshal` binding for typed struct, map, slice, scalar, time and byte values. It validates custom marshaler output through ordered-json and produces compact JSON without using the host JSON encoder.
- Kept PHP container serialization out of `compact()`, whose larger call frame had made extension stringify about 1ns slower after the accessor changes. Extension stringify now takes 0.92-0.95 of the time before those changes.
- The PHP extension creates child `Value` objects in C with `ordered_json_hydrate()` instead of a PHP loop. Parse followed by full traversal took 0.65-0.99 of the previous time with the extension; parse, stringify, and round trip stayed within 0.99-1.02, with identical results.
- Rust root arrays take the parser's pending item stack instead of copying every item, releasing spare capacity above one quarter of the length. Parsing root arrays of 90 and 110,000 numbers took 0.84-0.85 of the previous time, with identical results.
- Reduced PHP value access cost: accessors read the descriptor tape directly instead of chaining helper calls, child values are created without a promoted constructor, and escaped strings decode to UTF-8 without an intermediate UTF-16 unit array. Parse followed by full traversal took 0.43-0.89 of the previous time with the extension and 0.60-0.97 in pure PHP, with identical results.
- Stopped freezing JavaScript `Value` objects during parsing. Values still cannot be modified through the library API because their state is held in private fields; returned item and key arrays remain frozen. The API contract now states this guarantee.
- Removed the PHP `useNative` parse option, `parseNative()`, the unused PHP `stringify()` compact flag, the unused JavaScript `stringify()` options argument, and the native `ordered_json_compact()` function. PHP uses the extension when it is loaded and the pure implementation otherwise.
- Fixed pure PHP UTF-8 validation that rejected valid input under very low PCRE backtrack or recursion limits, and reduced pure PHP parser overhead by passing offsets through local variables.
- Documented running `make pie-check` before `make check` after source changes, because the documentation check rejects a stale PIE record.
- Reduced per-value parser and serializer work in every implementation without changing results, errors, or offsets. JavaScript checks values with a private-field brand instead of a `WeakSet` registry, slices unescaped strings from the source, and creates object key tokens on access. Go allocates values in chunks and decodes string units on access. Rust stores kind-specific payloads instead of an empty hash map, item vector, and unit vector per value. The PHP library and extension use an integer descriptor tape, and the extension validates UTF-8 while scanning strings instead of in a separate pass. Values without insignificant whitespace or duplicate keys serialize by copying their source token. Differential tests compared parse results, errors, offsets, accessors, factories, and serialization with the previous implementations. The PHP descriptor format is described in the [API contract](docs/operations/api.md#php).
- Fixed benchmark execution to use Rust release builds, fixed workload input digests, repeated samples, median/p95 statistics, environment fingerprints, and committed results.
- Preserved the committed benchmark baseline when a comparable run exceeds its tolerance and recorded failed measurements separately for review.
- Corrected the native macOS deployment target and bundle configuration to remove the obsolete `-single_module` and `-undefined suppress` linker warnings.
- Added PIE artifact verification using the same shared JSON cases and separate PHP and extension version records.
- Updated the Go module to `github.com/polyspec/ordered-json/go`.
- Added `make distclean` before repeated native setup because moved dependency files retained the previous build path.
- Added a registry of implementation build, adapter, and runtime commands.
- Separated PHP extension sources into `php-extension/src` and added PIE package metadata with a default-enabled standalone build.
- Removed host JSON parser and serializer dependencies from core value construction and string handling, and added shared repeated round-trip verification across all implementations.
- Added reproducible cross-language performance benchmarks against runtime-native JSON APIs.
- Added a fixed workload manifest and strict benchmark row, input-size, and output-size checks.
- Removed native PHP extension re-parsing during serialization and reduced repeated ordered-map lookups in the Go and Rust implementations.
- Optimized JavaScript serialization and Unicode escape parsing, lazily hydrated PHP descriptor children, removed avoidable Rust serializer cache allocations, and added the explicit zero-copy Go `ParseBytesBorrowed` API.
- Set the unreleased package and extension version to `0.0.1`; no release or automation is configured.

- Renamed language packages, namespaces, imports, native symbols, and build outputs to the ordered-json identifiers in the [API contract](docs/operations/api.md).
- Added English canonical documents and paired Korean translations for specifications, APIs, feature state, operations, examples, and development procedure.
- Added `make check` and `make docs-check`. Checks validate document registration, links, translation revisions, section/code parity, feature state, and current verification evidence. Verification records now include the actual source hashes, runtime versions, and common test results.
- Rebuild the PHP extension from clean phpize outputs because copied read-only build files prevented repeated setup. Build error diagnostics now stop verification even when the tool returns a zero exit status.
- Moved the requested comparison into `docs/reports/` and normalized compiler diagnostic paths to source-relative paths.
- Changed JSON objects to ordered associative maps. Duplicate keys now overwrite the value while retaining the first key position, so each decoded key has one value. Removed the duplicate lookup and member-list APIs. Default serialization now emits the associative object; source inspection remains available separately.
- Added JavaScript, Rust, Go, pure PHP, and PHP extension implementations with strict parsing, recursive document order, exact number tokens, and construction APIs.
- Centralized official inputs and expected results in [official.json](examples/official.json), with shared grammar fixtures and optional supplementary inputs.
- Verified every implementation with 433 shared cases. The PIE-built artifact also passed all 433 cases; 42 checker tests passed. That earlier run recorded two PHP build-tool linker deprecation warnings in its verification record.

The current verification record identifies the tested source and results for all five implementations and the documentation checker tests. Distribution observations are separate. This entry records development changes and does not declare a package release.

### npm (packages/js)

- The npm package is `@polyspec/ordered-json`, the polyspec convention; it was `ordered-json`.
- The package test runner writes each case id before the case runs and `ok` or `FAIL` with the elapsed milliseconds after it, with synchronous writes, so the verifier can name a case that does not end. Unreachable code after the run that listed the cases a second time is removed.
- Add the `rejectDuplicates` parse option for callers that require every decoded object key to occur once. It reports `Duplicate object key` with kind `duplicate_object_key` at the second key's UTF-16 offset, requires a boolean, and keeps the default parse unchanged. `ParseOptions` lists each field on its own line so the package reports both fields for the coverage check.
- `ParseError` carries a `kind` from the shared rejection list beside its own message.
- Removed the `StringifyOptions` declaration and the second `stringify` parameter from the type declaration; the function takes one argument. The package reports its public symbols for the shared coverage check.
- An unescaped control character is reported at its own offset instead of one past it, and the adapter reports the rejection position for the shared comparison.
- `parseBytes` reports the byte offset of the first invalid byte instead of 0, and the message names the unit because this error has no UTF-16 position.
- Added package tests for the value API and declared them in the implementation registry: construction guards, frozen item and key arrays, a fresh member map per access, wrong-kind access, key type checking, option validation, `parseBytes` input checks, UTF-16 parse offsets, code units for unpaired surrogates, and factory arguments. Shared cases reach this package through its adapter and do not cover that surface.
- Stopped calling `Object.freeze` on each parsed `Value`; private fields keep values unmodifiable through the API, and `items` and `keys` arrays remain frozen.
- Removed the unused `stringify()` options argument.
- Reduced parser and serializer overhead: values use a private-field brand check instead of a `WeakSet` registry, unescaped strings are sliced from the source, object key tokens are created on access, and values without insignificant whitespace or duplicate keys serialize as their source token. Results, errors, and offsets are unchanged.
- Added the package's own development procedure, changelog, Makefile and documentation manifest.
- Added English and Korean usage, development, and change records.

Common JSON behavior is unchanged. Verification records are generated by `make check`; aggregate evidence is described in the [verification records](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.md#records) of the repository root. Registry publication is not declared here.

### rust (packages/rust)

- The Cargo package is `polyspec-ordered-json` and the library `polyspec_ordered_json`, the polyspec convention;
  they were `ordered-json` and `ordered_json`.
- Pin the Serde binding dependencies to the verified versions because raw JSON values use the
  Serde JSON token protocol.
- Set Rust minimum to 1.71 to match the current JSON test dependency.
- Add Serde typed encoding and decoding. Struct fields retain declaration order; wire and
  manifest fixtures fix the bytes, embedded `Value` fields retain object order and number
  tokens, and invalid or unconsumed input fails.
- Add `parse_bytes_reject_duplicates` for callers that require every decoded object key to
  occur once. It returns the second key's byte offset and keeps the normal parser unchanged.
- `Error::kind` names the rejection with the shared identifier.
- Package tests call `OrderedMap::iter` and `stringify`, and the package reports its public symbols for the shared coverage check.
- An invalid escape is reported at the escape character instead of one byte past it, and the adapter reports the rejection position for the shared comparison.
- Added package tests for the value API and declared them in the implementation registry: the depth argument bound, `parse_bytes` UTF-8 offsets, `OrderedMap` key validation and repeated keys, member lookup by decoded name, unpaired surrogate units, constructor arguments, and wrong-kind access. Shared cases reach this package through its adapter and do not cover that surface.
- Root arrays take the pending item stack instead of copying every item; spare capacity above one quarter of the length is released.
- Reduced parser allocations: each value stores a kind-specific payload instead of an empty map, item vector, and unit vector; string units are decoded on first access; objects keep one entry list and build a hash index above eight members; values without insignificant whitespace or duplicate keys compact by copying their source token. Results, errors, and offsets are unchanged. The derived `Debug` output of `Value` and `OrderedMap` reflects the new internal fields.
- Added the package's own development procedure, changelog, Makefile and documentation manifest.
- Added English and Korean usage, development, and change records.

Common JSON behavior is unchanged. Verification records are generated by `make check`; aggregate evidence is described in the [verification records](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.md#records) of the repository root. Registry publication is not declared here.

### go (packages/go)

- `Marshal` writes `null` for a nil `*Value` and for any other nil pointer whose type implements `MarshalJSON`, and encodes an interface as the value it holds. It previously called `MarshalJSON` on the nil pointer and returned `expected orderedjson Value`.
- `ParseError.Kind` names the rejection with the shared identifier.
- Added a package test for `ParseBytesBorrowed`: text handed back survives a change to the caller's bytes. The package reports its public symbols for the shared coverage check.
- An unescaped control character is reported at its own offset instead of one past it, and the adapter reports the rejection position for the shared comparison.
- Parsing reports the byte offset of the first invalid UTF-8 sequence instead of 0.
- `Marshal` applies `omitempty` and `omitzero` as separate rules, matching the host encoder: a zero `time.Time` stays under `omitempty` and is dropped under `omitzero`. Non-finite floats report the field that holds them instead of failing later in the parser, and the unreachable `time.Time` branch is removed because `time.Time` carries its own `MarshalJSON`. A seeded randomized test compares decoded structures with the host encoder.
- `Marshal` now contributes the fields of anonymous struct fields instead of dropping them, reports a repeated field name as an error instead of emitting a duplicate key, and stops at the parser's nesting limit so a cyclic value returns an error instead of exhausting memory.
- Reduced parser allocations: values are allocated in chunks sized from document separators, string units are decoded on access, objects with up to eight members use linear key lookup, and values without insignificant whitespace or duplicate keys compact by copying their source token. Text returned by `Compact` and `StringValue` for `ParseBytesBorrowed` input is copied. Results, errors, and offsets are unchanged.
- Added the package's own development procedure, changelog, Makefile and documentation manifest.
- Added English and Korean usage, development, and change records.
- Updated the Go module and probe import to `github.com/polyspec/ordered-json/go`.

Common JSON behavior is unchanged. Verification records are generated by `make check`; aggregate evidence is described in the [verification records](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.md#records) of the repository root. Registry publication is not declared here.

### php (packages/php)

- The Composer package is `polyspec/ordered-json` and the namespace is `Polyspec\OrderedJson`, the polyspec convention; they were `ordered-json/ordered-json` and `OrderedJson`. The suggested extension is the PIE package `polyspec/ordered-json-extension`.
- The package test runner writes each case id before the case runs and `ok` or `FAIL` with the elapsed milliseconds after it, so the verifier can name a case that does not end. The `--cases` listing runs the checks without those lines and prints case ids only.
- Add `Value::parseRejectDuplicates` for callers that require every decoded object key to occur once. It reports `Duplicate object key` with kind `duplicate_object_key` at the second key's byte offset, parses with the PHP parser in both backends, and keeps `Value::parse` unchanged.
- `ParseError` carries a `kind` from the shared rejection list beside its own message.
- The package reports its public symbols for the shared coverage check; the UTF-8 offset helper is marked internal like the other helpers.
- An unescaped control character is reported at its own offset, an invalid Unicode escape at the first byte that is not a hex digit, and the adapter reports the rejection position for the shared comparison.
- An unpaired surrogate raises `UnexpectedValueException` again. Inside the namespace the unqualified name resolved to a missing `OrderedJson\UnexpectedValueException`, so `stringValue()` and UTF-8 conversion raised a class-not-found error instead.
- Added package tests for accessor errors, UTF-16 units, member lookup, factory arguments, parse error offsets, and UTF-8 validation under low PCRE limits, and declared them in the implementation registry. Shared cases reach this package through its adapter and do not cover that surface.
- Object hydration no longer creates a second value for each key token; serialization pairs members with key tokens read from the descriptor.
- Moved PHP container serialization out of `compact()` into a private method, so serializing with the extension uses a smaller call frame. Extension stringify took 0.92-0.95 of the time before the current accessor changes.
- Child values are created by `ordered_json_hydrate()` when the extension is loaded.
- Reduced value access cost by reading the descriptor tape directly in accessors, creating child values without a promoted constructor, and decoding escaped strings to UTF-8 without an intermediate UTF-16 unit array.
- Removed the `useNative` parse option, `parseNative()`, and the unused `stringify()` compact flag; `parse()` uses the extension when it is loaded.
- Fixed UTF-8 validation that rejected valid input under very low PCRE backtrack or recursion limits, and reduced parser overhead by passing offsets through local variables.
- Changed the internal descriptor to the integer tape shared with the extension. The parser scans whitespace, digits, and string runs with byte-span functions, string units are decoded on access, and values without insignificant whitespace or duplicate keys serialize by copying their source token. Results, errors, and offsets are unchanged.
- Added the package's own development procedure, changelog, Makefile and documentation manifest.
- Added English and Korean usage, development, and change records.
- Moved the native extension to the `php-extension` package; the PHP library remains independently usable.

Common JSON behavior is unchanged. Verification records are generated by `make check`; aggregate evidence is described in the [verification records](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.md#records) of the repository root. Registry publication is not declared here.

### php-ext (packages/php-ext)

- The PIE package is `polyspec/ordered-json-extension`, and the error class is `Polyspec\OrderedJson\NativeParseError`; they were `ordered-json/ordered-json-extension` and the global class `OrderedJsonNativeParseError`. Hydration creates `Polyspec\OrderedJson\Value`.
- The package test runner writes each case id before the case runs and `ok` or `FAIL` with the elapsed milliseconds after it, so the verifier can name a case that does not end. The `--cases` listing runs the checks without those lines and prints case ids only.
- `OrderedJsonNativeParseError` carries a `kind` from the shared rejection list.
- The package reports its functions, constant and error class for the shared coverage check.
- An unescaped control character is reported at its own offset instead of one past it.
- Added package tests for the descriptor API and declared them in the implementation registry. They cover hydrated members and items, repeated and escaped member names, malformed descriptors rejected with `ValueError`, compact token copying, the supported depth range, and the reported parse error offset. Shared cases reach the extension only through the PHP Value API, so these are the only checks of that surface.
- `ordered_json_hydrate()` returns an object's members alone; it no longer creates a value for each key token.
- Added `ordered_json_hydrate()`, which creates the child `OrderedJson\Value` objects of a container from a descriptor and rejects a descriptor that does not match the source with `ValueError`. Hydration is compiled from a separate `hydrate.c`; the class lookup is cached for each request.
- Removed `ordered_json_compact()`; the PHP library serializes with `ordered_json_compact_node()`.
- Replaced associative descriptor arrays with an integer tape, validated UTF-8 while scanning strings instead of in a separate pass while still reporting invalid UTF-8 before other errors, and serialized compact subtrees with one copy. `ordered_json_compact_node` accepts a descriptor index and rejects a descriptor that does not match the source with `ValueError`. The format is described in the [API contract](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.md#php). Parse results, errors, and offsets are unchanged.
- Corrected macOS bundle configuration: derive an omitted deployment target from the compiler and omit the unused dynamic-library single-module flag check. This removes the obsolete `-single_module` and `-undefined suppress` linker warnings.
- Added the package's own development procedure, changelog, Makefile and documentation manifest.
- Added English and Korean usage, development, and change records.
- Added PIE `php-ext` metadata, a `src` build path, and an enabled standalone build by default.

Common JSON behavior is unchanged. Verification records are generated by `make check`; aggregate evidence is described in the [verification records](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.md#records) of the repository root. Registry publication is not declared here.
