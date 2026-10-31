<!-- doc-id: validation -->
# Verification

[한국어](validation.ko.md)

<a id="repository-check"></a>
## Aggregate check

Development runs unit tests only (`make ordered-json-test-scripts`). The aggregate check, the PIE artifact check and the owner checks are end-to-end checks that [hosted CI](#ci) runs after every push; no rule requires a local run before a commit or a push, and the pre-push hook only reads the checklist. To run the aggregate check locally anyway, install the [required tools](installation.md#requirements) and run from the repository root:

~~~sh
make install
make check
~~~

`make check` runs the targets of `CHECK_TARGETS` through full-run of `@polyspec/kit`. Its target `verify-all` builds every implementation of `config/parity.json`, sends the common JSON cases to the probe of each, writes the aggregate record `var/records/verification.json`, and runs the evidence check with the [records](#records) of the checkout (`scripts/verify.mts --record`). An aggregate record includes the source hash of every tracked file. The package tests of each implementation run in `make parity-check`, with the native runner of its language, and the tool tests in `make ordered-json-test-scripts`.

Each build step prints a start line, its output as it arrives, and its exit status with the elapsed time. A build step or PIE command has no time limit: its exit status and its output decide the result. Each probe receives one shared case at a time and the verifier prints the case with the elapsed time of its reply; a reply has 60 s, and a probe that misses it is killed and the case is named. No limit applies to the whole run. When a build step or a probe ends, the verifier kills its process group, so a process that it started in the background neither outlives it nor holds its output open. A failure ends neither the run nor the other languages: the build of each language and every shared case of every probe run to their end, a failed build skips only the later steps of its own language, and the run then lists every failure and exits with status 1 without writing a record. The expected result of a fixture or a supplementary case comes from an independent reference (`scripts/reference.mts`): the bytes decoded as strict UTF-8 and parsed by momoa, a JSON parser that keeps every member in order with its source range, with the unescaped control characters and the nesting limit checked on its tokens.

<a id="records"></a>
## Records

The evidence of a commit is the run that verifies it. `make pie-check` writes the PIE record `var/records/pie-verification.json` and `make verify-all` writes the aggregate record `var/records/verification.json`. Git ignores `var/`, so no record is committed: a record hashes every tracked file except `benchmarks/results.json`, so a committed record would go stale with the next commit and would force a full run on a local machine after every change. With `--records`, the evidence check at the end of `make verify-all` checks the aggregate record and, when it exists, the PIE record of the same checkout against the current sources, so a run that writes both checks both.

The aggregate record includes source hashes, package file records, actual runtime versions, the running Node.js release, case counts, results, build warnings, and supplementary input revision. PHP and extension versions are separate fields. A changed input invalidates the record as current evidence. The verifier rejects changes during execution and incomplete implementation results. The record does not establish publication. Every record and report (`var/records/verification.json`, `var/records/pie-verification.json`, `benchmarks/results.json`, and the review copy of a failed benchmark) is written completely to a file in `var/`, which Git ignores and no manifest reads, and renamed over its path, so a reader finds the previous file or the new one and never part of one.

<a id="supplementary"></a>
## Supplementary inputs

~~~sh
make install
make check JSON_TEST_SUITE=.cache/JSONTestSuite
~~~

`make install` fetches the revision of nst/JSONTestSuite that [external inputs](../../external-inputs.json) pins into `.cache/JSONTestSuite` and refuses a checkout whose revision, case count or inputs hash differs from the pin, naming the expected and the actual value of each field.

The record states whether supplementary inputs were used. `i_` cases use the shared UTF-8 and depth policy. Official inputs and expectations exist only at the repository root; probes contain no separate goldens.

[External inputs](../../external-inputs.json) pins that revision and the hash of its cases, and a record measured against a different checkout fails the documentation check. `make check` and `make pie-check` compare the suite with that pin before any work, and `make pie-check` also compares the hash of the PHAR with the PIE pin; each field that differs fails the command with the expected and the actual value before a build starts.

<a id="individual"></a>
## Individual implementations

From the common checkout, selected checks build and run the declared probes. They do not update the aggregate record:

~~~sh
make verify-js
make verify-rust
make verify-go
make verify-php verify-php-extension
~~~

For an independent clone:

~~~sh
git clone https://github.com/polyspec/ordered-json.git
cd ordered-json
make check
~~~

Each package has an independent build target, while the verifier (`scripts/registry.mts`) defines the shared build, probe and runtime commands of the implementations of `config/parity.json`. The native extension is built from a copy of the source files that Git tracks in its package, in the run's temporary directory, and is tested with the sibling PHP package in the same checkout. Each run prints its run directory and removes it when it ends, so runs of one checkout do not share build output. Every cargo command of a run, and the `cargo run` of the benchmark, sets `CARGO_TARGET_DIR` to a directory inside that run, so a target directory that the environment names or that another checkout filled never provides the Rust probe or the benchmark binary.

Run `make check JSON_TEST_SUITE=/path/to/JSONTestSuite` for supplementary inputs.

<a id="pie"></a>
## PIE artifact check

`make install` downloads the PIE release that [external inputs](../../external-inputs.json) pins from the [official releases](https://github.com/php/pie/releases) into `.cache/pie/pie.phar`, the default `PIE` of `make pie-check`, and refuses a file whose SHA-256 differs from the pin, naming both hashes. Its provenance can be verified with `gh attestation verify --owner php .cache/pie/pie.phar`. From the common root:

~~~sh
make pie-check JSON_TEST_SUITE=.cache/JSONTestSuite
~~~

The [PIE checker](../../scripts/check-pie.mts) copies the extension's tracked source files into a temporary run directory, isolates PIE configuration in that directory, registers the copy as a path repository, validates package recognition, and builds it with PIE. It tests that artifact directly with the same shared probe and expectations. It does not run the ordinary native build in between.

The PIE record `var/records/pie-verification.json` records the PIE version and PHAR hash, the declared artifact path relative to the run directory, commands, source hashes, PHP and extension versions, and case results. The PHAR hash and the supplementary revision must match their pins. The built module is named by path alone: a fresh identifier and signature enter it at link time, so its hash identifies one run, and the checker rejects a record that carries one. Build errors, missing build tools, probe warnings, or changes during the check fail verification. Compilation warnings remain in the record. This check does not install the module or publish a package. The record hashes every tracked file except `benchmarks/results.json`; the documentation check of a `make check` that runs after `make pie-check` in the same checkout rejects the PIE record when it does not match the current sources.

<a id="ci"></a>
## Hosted CI

`.github/workflows/ci.yml` runs on every pull request, push to `main` and manual dispatch. Six language jobs run their native package tests and applicable lints in parallel. The independent `parity` job installs and builds every implementation, checks the shared cases with `verify-all` and validates all declared units and public symbols with `parity-check`. It waits for no language job; a failed language job does not cancel it. PHP extension artifact proof remains in `php-ext`. Each job owns a distinct report artifact.

| Job | Targets |
| --- | --- |
| `parity` | `test-markers-check verify-all parity-check` |
| `js` | `test-js` |
| `rust` | `test-rust lint-rust` |
| `go` | `test-go lint-go` |
| `php` | `test-php lint-php` |
| `php-ext` | `lint-php-ext test-php-ext pie-check` |
| `python` | `test-python lint-python` |

~~~sh
make install-tools TOOLS=npm
make install-packages
make install-tools TOOLS="go rust php composer python uv"
make kit-install-symbols EXTRACTORS="go php"
make kit-install-php-arginfo
make ordered-json-install-parity
make ci-targets TARGETS="test-markers-check verify-all parity-check"
~~~

After the canonical locked-package bootstrap, every job installs the pinned npm and locked packages. Each language job requests its tools through Kit `make install-tools TOOLS="..."` and reuses the product package installers for locked Rust, Composer and Python dependencies. The parity job prepares all comparison environments in its own checkout through those same package installers. Kit 0.0.61 provides selected installation. Parity explicitly installs its Go/PHP symbol extractors and PHP arginfo through Kit targets, while the extension job installs only PHP arginfo. Locked PIE and supplementary input downloads use native mise through product install targets. No custom tool installer is maintained here and no speedup is claimed before measurement. The `docs` job runs the repository checks and TypeScript lint with `make install-tools`, and prepares Git hooks. The push gate retains `push-gate-commit`, `docs-check`, `evidence-check` and `commits-check`. Release and gates workflows remain managed by kit.

Every target of `CHECK_TARGETS` runs in exactly one job of `ci.yml` and `push-gate.yml`; native tests within parity remain the declared cross-language coverage. Every check step runs after failure under `if: !cancelled()`. `make ci-targets` runs each target to completion and records its status, exit code, time and output in `var/report/ci-targets/`. The report is uploaded even after failure. Each job runs on `ubuntu-24.04`, uses the locked toolchains and records the actual PHP patch release. No whole-job deadline is imposed.

The last job of `ci.yml`, `ci-passed`, is the check of the workflow that the release workflow requires on the tagged commit ([publishing main](#publish)). It needs every other job of the workflow, runs after each of them also when one failed, was skipped or was cancelled (`if: ${{ always() }}`), and runs `make ci-passed RESULTS='${{ toJSON(needs) }}'`: ci-passed of `@polyspec/kit` prints the result of every needed job and fails unless each one is `success`. A job added to `ci.yml` is listed in `needs`, so the required check covers it; `tests/scripts/workflow-rules.test.mts` fails when `ci-passed` is missing, is not the last job, lacks `if: ${{ always() }}`, does not need every other job, runs on another runner or runs another step.

Each job of the repository-owned CI and push-gate workflows checks out this repository at the workspace root. Before its first make command, the canonical bootstrap installs the locked kit package with the npm version declared in devEngines.packageManager. The Makefile includes the installed package bootstrap; no sibling checkout is required. Development source links remain optional native package-manager state.


The docs job prepares Git hooks after tool installation. The language and parity installers fetch the installed kit Rust checker crates before offline linting. Downloads remain installation steps; no check enables network access.


The Kit-managed provider gates read [config/ci.json](../../config/ci.json). The full parity path remains mandatory. Setup reuses Kit native runtime defaults, the repository Python editable installer for its PEP 751 lock model, and the pinned PHP arginfo installer. Shared metadata checks explicitly declare their Go, PHP and Python prerequisites. No application recipe replaces a Kit gate.

<a id="publish"></a>
## Publishing main

While the version is 0.x, the work of a checklist row is committed locally, and `main` receives the commits in one push, when every row of the checklist is `[o]` (AGENTS.md). The pre-push hook `.githooks/pre-push` runs the push gate before the push:

~~~sh
git push origin HEAD:main
~~~

The push runs `ci.yml`, and its job `ci-passed` is the check that the release workflow requires on the tagged commit. A version-bump commit follows on `main`, and the tag `vX.Y.Z` goes on a commit whose run concluded `ci-passed` success ([tag releases](distribution.md#tag-release)).

<a id="documentation-checks"></a>
## Documentation checks

~~~sh
make docs-check
make evidence-check
~~~

`make docs-check` runs check-documents of `@polyspec/kit` on the documents that [config/documents.json](../../config/documents.json) selects, common and package documents alike: translation pairs and revision hashes, one `doc-id` marker per document that names it once in the repository, section and code-block parity, links and anchors, local home-directory paths, the checklist `docs/plans/execution-checklist.md` with its translation, the values of the feature table of `docs/features.md`, and the sections of `CHANGELOG.md`. `make evidence-check` runs [scripts/check-evidence.mts](../../scripts/check-evidence.mts): the feature rows against the evidence they name, the distribution observations, the benchmark result and the JSON reports of `docs/`. With `--records`, which `make verify-all` passes after it writes the aggregate record, it also checks that the [records](#records) of the checkout match the current sources; `make evidence-check` omits that comparison. `make commits-check` checks the message of the commit against the commit rules of `@polyspec/kit` (`COMMIT_RULES` of check-commits).

Review English and Korean prose against code and tests before updating a Korean `source-sha256` marker. Matching hashes do not prove translation accuracy. External links are syntax-checked, not fetched. [Hosted CI](#ci) runs these checks on every pull request and every push to `main`.

<a id="limits"></a>
## Limits

The suite checks parser acceptance and the [acceptance contract](../spec/json-contract.md#acceptance). It does not establish exhaustive API argument coverage, all nondefault depth settings, every declared minimum runtime, all platforms, or every host encoder integration. Windows and ZTS native builds have not been verified.

Report failed checks and compiler warnings directly. Do not reuse results for changed inputs. A JSON record may be written before a later documentation failure; the complete check must succeed before completion.
