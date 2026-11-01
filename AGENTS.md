<!-- doc-id: development -->
# Development procedure

[한국어](AGENTS.ko.md)

The working principles of every polyspec repository are in [PRINCIPLES.md](PRINCIPLES.md). This document states the rules of this repository only, each as a list item with its `Enforced by:` line.

<a id="workflow"></a>
## Required workflow

- Own: Read [documentation management](docs/operations/documentation-plan.md), the relevant [specification](docs/spec/json-contract.md) and [feature state](docs/features.md) before editing. Update the specification before a behavior change. Include the affected documents, feature state and changelog entries with the code change.
  Enforced by: `make docs-check`
- Own: Keep personal preferences, conversation context, credentials and backup locations outside Git.
  Enforced by: none, whether a tracked file holds a personal preference is a judgement.

<a id="feature-state"></a>
## Feature state

- Own: [Feature state](docs/features.md) is the feature record of this repository. The Implementation cell of each feature row holds one state: `implemented` (the listed behavior exists), `partial` (implementation in progress), `planned` (implementation not started), `shared-suite` (common JSON tests), `package-tests` (an implementation's own tests), `docs-tests` (documentation checker tests), `benchmark` (benchmark protocol and committed result), `source-only` (confirmed distribution) or `published` (a release tag and asset, which the row names).
  Enforced by: `make evidence-check`
- Own: A state stands only in its Implementation cell. `scripts/check-evidence.mts` fails on a state written anywhere else in `docs/features.md` or its translation, refuses a record without the feature table and refuses a row whose ID is not a feature ID `F-...`.
  Enforced by: `make evidence-check`
- Own: Each state names the record that backs it: the [records](docs/operations/validation.md#records) of the run that verifies a commit for `shared-suite`, `package-tests` and `docs-tests`, and the [benchmark result](benchmarks/results.json) for `benchmark`. A benchmark result is evidence only when it was measured from a clean checkout with the protocol and inputs that the workload declares.
  Enforced by: `make evidence-check`

<a id="generated-files"></a>
## Generated files

- Own: Generated files are never tracked in Git. They are dependency installs (`node_modules/`, `vendor/`, virtual environments), build output (`dist/`, `target/`, `*.tsbuildinfo`), caches (`.cache/`, `__pycache__/`, `.pytest_cache/`), test run artifacts (`test-results/`, `playwright-report/`, PHPUnit caches) and tool downloads (`var/`). Each `.gitignore` covers these paths, and a new generator adds its ignore entry in the same commit.
  Enforced by: `.githooks/pre-commit`
- Own: Only these files are tracked among generated ones: lock files (`package-lock.json`, `composer.lock`, `Cargo.lock`, uv locks, `mise.lock`), the committed generated documents that this file names, and test fixtures.
  Enforced by: `.githooks/pre-commit`

<a id="checklist"></a>
## Execution checklist

- Own: The [execution checklist](docs/plans/execution/checklist.md) tracks the tasks of this repository that are not product features, such as checks, tools and CI. Each task is a row with an ID `T<wave>.<task>`. A new problem gets a new task, and a problem related to a task that is done gets a sub-item with the next derived ID (`T1.1-1`).
  Enforced by: `make docs-check`
- Own: A push happens only when no task is `[~]`.
  Enforced by: none, judged at review.
- Own: The guard of `make check` refuses to start while a task is `[~]`, while tracked changes are uncommitted or while an untracked file is not ignored, and it records each full run of a committed tree in `var/full-run.json`. A full run verifies a committed tree only.
  Enforced by: `make check`

<a id="verification"></a>
## Required checks

- Own: Development runs unit tests only: the native test of a changed package, or a tool test with `make ordered-json-test-scripts TESTS=<file>`. `make verify-<language>` builds one implementation and sends the shared cases to its probe, and writes no record.
  Enforced by: `.claude/settings.json`
- Own: The full suite (`make check`) and the end-to-end checks (`make pie-check`, `make owner-check`, the adapter suites and the supplementary suite) run in hosted CI on every pull request and every push to `main`. No rule requires a local run before a commit or a push, and no rule runs a broader check after each correction.
  Enforced by: `make ci-targets`
- Own: Every tracked path is owned by a rule of [config/owner-checks.json](config/owner-checks.json). The pre-commit hook runs `make owner-validate`, which refuses a commit while a path matches no rule, a glob matches no path or an owner does not exist. A new file is mapped in the same commit.
  Enforced by: `.githooks/pre-commit`
- Own: Each target of `CHECK_TARGETS` in the Makefile runs in exactly one job of `.github/workflows/ci.yml`, through `make ci-targets TARGETS="..."`, which runs past failures and uploads each job's report.
  Enforced by: `make ordered-json-test-scripts`
- Own: The lint of each language passes: `make lint-rust` (clippy with `-D warnings`), `make lint-go` (golangci-lint with `.golangci.yml`, and deadcode), `make lint-php` (phpcs with `phpcs.xml.dist`, and PHPStan) and `make lint-python` (ruff with `ruff.toml`, and vulture).
  Enforced by: `make ci-targets`
- Own: The PHP extension is rebuilt when its native code changes. A result from an old binary or a prior run is never taken as verification of changed code.
  Enforced by: `make parity-check`
- Own: A verification result or a source hash is never edited to make a check pass. A record of `var/records/` is written by the run that verifies it and is not committed.
  Enforced by: `.githooks/pre-commit`

<a id="parity"></a>
## Implementations and shared cases

- Own: [config/parity.json](config/parity.json) declares the implementations, which is the one source of the language set of this repository, with the directory of each, and the units that each implementation holds. A new language is added in `config/parity.json`, in the commands of `scripts/registry.mts` and in a package directory, without changing the shared JSON comparison algorithm.
  Enforced by: `make parity-declarations-check`
- Own: A profile narrower than every implementation names its reason and the spec anchors of the difference. A unit that an implementation does not hold yet is an exclusion with the checklist item that removes it, and it fails the check until that item is done.
  Enforced by: `make parity-declarations-check`
- Own: `make parity-check` runs the bindings of every suite in every implementation and reads the public symbols of each one, so a missing case, an undeclared test or an undeclared public symbol fails.
  Enforced by: `make parity-check`
- Own: An API that only one package provides is tested in that package. Shared cases exercise the JSON contract and cannot reach a language-specific API.
  Enforced by: `make parity-declarations-check`
- Own: All language probes use [official.json](examples/official.json) and [scripts/verify.mts](scripts/verify.mts). Shared cases are added there or under `contracts/fixtures/`. No language-specific examples or expected results are created.
  Enforced by: `make verify-all`
- Own: A contract change updates the verifier and the affected packages in one repository revision. See the [repository contract](docs/operations/repositories.md).
  Enforced by: `make verify-all`

<a id="release"></a>
## Release

- Own: A release is a tag of a commit of `main` whose run of the `ci` workflow concluded with success, its job `kit / required` passed. The release workflow creates the tags; no tag is created, moved or pushed by hand.
  Enforced by: `make release-tag`
- Own: The version-bump commit `Release X.Y.Z` sets the version in every manifest of the repository and renames `## Unreleased` of each changelog to `## X.Y.Z`.
  Enforced by: none; judged at review.
- Own: The Go tag `packages/go/vX.Y.Z` is created with `vX.Y.Z` on the same commit.
  Enforced by: `make release-tag`
- Own: A successful run of the `ci` workflow on `main` runs `.github/workflows/release.yml`, which releases the top `## X.Y.Z` at the commit of that run when it is the version commit, or a later commit whose `## Unreleased` is empty while the version is untagged.
  Enforced by: `make release-tag`
- Own: After the tag push, the version of the tag is in every manifest and the section `## X.Y.Z` is in `CHANGELOG.md`, then release.yml builds the archives and the Python wheel and creates the GitHub Release.
  Enforced by: none, judged at review.
- Own: A package that pins a package of another repository names only a tag that exists on GitHub. The pin is written after that tag is pushed.
  Enforced by: none, judged at review.

<a id="tools"></a>
## Shared tools

- Own: The tools that every polyspec repository shares are the package `@polyspec/kit`, a devDependency pinned in `package-lock.json`. The Makefile includes `node_modules/@polyspec/kit/scripts/kit/kit-bootstrap.mk`, which includes the `kit.mk` of the installed package. The files that `kit.copies` lists are copies that `make kit-sync` writes from the package. A copy is never edited, copied under another name or disabled here; a change is made in polyspec/kit and adopted by updating `@polyspec/kit`, then running `make install-packages` and `make kit-sync`.
  Enforced by: `make kit-check`
- Own: This repository differs from the other polyspec repositories only in `config/*.json` (checklist, dependency policy and review, documents, owner checks, release and toolchain), in `config/layout.yml`, which extends `config/layout.kit.yml` with the folders of this repository, and in its product code: the packages in `packages/`, the verifier and the benchmarks.
  Enforced by: `make layout-check`

<a id="dependencies"></a>
## Dependencies

- Own: While polyspec versions are 0.0.x, development checkouts link installed polyspec packages to their source as kit `docs/plans/local-links.md` describes. Links are never committed.
  Enforced by: none, a development link is kept out of Git by the ignored `node_modules/`, and no tool judges a development checkout.

<a id="idempotency"></a>
## Idempotency

- Own: The same tree gives the same result at any time and on any machine. Each rule of this list names how this repository meets the rule.
  Enforced by: none, whether a result depends on the machine is a judgement that no tool makes.
- Own: A check makes no registry query whose result depends on time: no latest lookup, no `@latest`, no resolution of a version range and no query about outdated packages. Installing what a lock pins by exact version and integrity hash is allowed, as `npm ci` and `composer install` are.
  Enforced by: none, judged at review.
- Own: No command installs a tool on demand. Node.js, Rust, Go, Python, PHP and npm are pinned by tracked files: Go, Python, Composer and the other tools of `mise.toml` are exact releases locked by digests in `mise.lock`, and PHP is pinned by its minor release in `.php-version`. Every command except the install targets run cargo, go, npm and Composer offline, so a missing download fails with a message to run `make install`.
  Enforced by: none, judged at review: kit 0.0.77 removed toolchain check (K854), and the pins of mise.toml and mise.lock are read by install-tools.
- Own: Only `make install-tools TOOLS=npm`, `make install-packages` and `make install` download. The first installs npm, the second the packages of `package-lock.json`, and `make install` the tools of `mise.lock`, the Rust toolchain, and the crates of `packages/rust/Cargo.lock`; the PIE PHAR and the supplementary suite are the tools `http:pie` and `http:jsontestsuite` of `mise.toml`.
  Enforced by: none, judged at review: the crates of a Cargo.lock are the state of cargo, which a make target cannot compare with the lock (K864).
- Own: A test reads only the outputs it creates and does not depend on untracked state. Records, documentation checks, shared cases and build copies read the files Git tracks, and each run builds in its own run directory with its own `CARGO_TARGET_DIR`.
  Enforced by: `make ordered-json-test-scripts`
- Own: A shared output is published atomically: it is written completely to a file in `var/` and renamed over its path (`write_record`).
  Enforced by: `make ordered-json-test-scripts`
- Own: A check never judges a message in the user's locale. A command whose output text is compared runs with `LC_ALL=C`, as `scripts/registry.mts` runs `git ls-files`.
  Enforced by: `make ordered-json-test-scripts`

<a id="completion"></a>
## Completion

- Own: A distribution status is updated only with observed evidence, and the check of a publication is separate from the tests.
  Enforced by: `make evidence-check`
- Own: Review code and tests to confirm the accuracy of a document. Automated link, revision and status checks do not establish the accuracy of prose.
  Enforced by: none, the accuracy of prose is a judgement that no tool makes.
- Own: Git messages are factual and concise, and unrelated changes are committed separately.
  Enforced by: none, judged at review.

<a id="package-npm"></a>
## Package npm (packages/js)

- Own: The package `@polyspec/ordered-json` is checked alone by `make ordered-json-js-check`, which runs `make verify-js` (`scripts/verify.mts --only js`) and compares its adapter with the shared cases and writes no record. Its package tests are native node:test files that `make parity-check` runs.
  Enforced by: `make parity-check`
- Own: The package keeps no independent goldens: official cases and expected results belong to the repository root, and a behavior change updates the common specification before the package.
  Enforced by: `make verify-all`
- Own: The changes of the package are listed in its section of [CHANGELOG.md](CHANGELOG.md), and its documents are checked with the others.
  Enforced by: `make docs-check`

<a id="package-rust"></a>
## Package rust (packages/rust)

- Own: The crate is linted by `make lint-rust` (clippy with `-D warnings`).
  Enforced by: `make lint-rust`
- Own: The crate is checked alone by `make ordered-json-rust-check`, which runs `make verify-rust`.
  Enforced by: none, judged at review: no workflow, Git hook or Claude Code hook runs this target.
- Own: Its crates are the locked versions of `packages/rust/Cargo.lock`, which `make install` downloads; no check downloads them.
  Enforced by: none, judged at review: the crates of a Cargo.lock are the state of cargo, which a make target cannot compare with the lock (K864).
- Own: Its package tests are the native tests of the crate that `make parity-check` runs with their declared units.
  Enforced by: `make parity-declarations-check`
- Own: The changes of the crate are listed in its section of [CHANGELOG.md](CHANGELOG.md).
  Enforced by: `make docs-check`

<a id="package-go"></a>
## Package go (packages/go)

- Own: The module is linted by `make lint-go` (golangci-lint with `.golangci.yml`, and deadcode).
  Enforced by: `make lint-go`
- Own: The module is checked alone by `make ordered-json-go-check`, which runs `make verify-go`.
  Enforced by: none, judged at review: no workflow, Git hook or Claude Code hook runs this target.
- Own: `GOTOOLCHAIN` is `local`, and the module requires the Go release of `mise.toml`.
  Enforced by: none, judged at review: kit 0.0.77 removed toolchain check (K854), and the pins of mise.toml and mise.lock are read by install-tools.
- Own: Its package tests are the Go tests beside the code that `make parity-check` runs with their declared units.
  Enforced by: `make parity-declarations-check`
- Own: The changes of the module are listed in its section of [CHANGELOG.md](CHANGELOG.md).
  Enforced by: `make docs-check`

<a id="package-php"></a>
## Package php (packages/php)

- Own: The Composer package is linted by `make lint-php` (phpcs and PHPStan).
  Enforced by: `make lint-php`
- Own: The Composer package is checked alone by `make ordered-json-php-check`, which runs `make verify-php`.
  Enforced by: none, judged at review: no workflow, Git hook or Claude Code hook runs this target.
- Own: Its `composer.lock` is locked to the platform `8.4.1` and requires PHP `>=8.4`, and is re-locked with `composer update --lock` when its manifest changes.
  Enforced by: none, judged at review.
- Own: Its package tests are the PHPUnit tests of `packages/php/tests` that `make parity-check` runs with their declared units, installed by `make install`.
  Enforced by: `make parity-check`
- Own: The changes of the package are listed in its section of [CHANGELOG.md](CHANGELOG.md).
  Enforced by: `make docs-check`

<a id="package-php-ext"></a>
## Package php-ext (packages/php-ext)

- Own: The extension is checked alone by `make ordered-json-php-ext-check`, which runs `make verify-php-extension`. `make build-php-ext` of kit (S10) builds `var/php-ext/polyspec_ordered_json.so` from the stub and its tracked arginfo header (`make php-ext-arginfo` writes it), and `make verify-php-extension` and `make parity-check` load it.
  Enforced by: `make parity-check`
- Own: Its `composer.lock` is locked to the platform `8.4.1` and requires PHP `>=8.4`, the same as the PHP package, and is re-locked with `composer update --lock` when its manifest changes.
  Enforced by: none, judged at review.
- Own: The changes of the extension are listed in its section of [CHANGELOG.md](CHANGELOG.md).
  Enforced by: `make docs-check`

<a id="package-python"></a>
## Package python (packages/python)

- Own: The package is checked alone by `make ordered-json-python-check`, which runs `make verify-python`, and linted by `make lint-python` (ruff with `ruff.toml`, and vulture with `packages/python/vulture_whitelist.py`). `make install-packages` installs it editable into `packages/python/.venv`, which its tests use.
  Enforced by: `make lint-python`
- Own: Its package tests are the unittest tests of `packages/python/tests` that `make parity-check` runs with their declared units.
  Enforced by: `make parity-declarations-check`
- Own: The changes of the package are listed in its section of [CHANGELOG.md](CHANGELOG.md).
  Enforced by: `make docs-check`
