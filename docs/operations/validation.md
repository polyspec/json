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

`make check` runs the targets of `CHECK_TARGETS` through ci-targets of `@polyspec/kit`, past failures, and writes the report into `var/report/full-run`. Its target `verify-all` builds every implementation of `config/parity.json`, sends the common JSON cases to the probe of each, writes the aggregate record `var/records/verification.json`, and runs the evidence check with the [records](#records) of the checkout (`scripts/verify.mts --record`). An aggregate record includes the source hash of every tracked file. The package tests of each implementation run in `make parity-check`, with the native runner of its language, and the tool tests in `make ordered-json-test-scripts`.

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

`.github/workflows/ci.yml` runs on every pull request, push to `main` and manual dispatch. It is one pipeline (PRINCIPLES S12): its one job `kit` calls `.github/workflows/ci-pipeline.yml`, the pipeline of this repository taken from the one of `@polyspec/kit`, which runs a target of the Makefile in each of its jobs: `kit-gates-static` in the shared job, `kit-gates-parity` in the parity job and `kit-gates-runtime-<runtime>` in the job of each runtime that its matrix lists.

[config/ci.json](../../config/ci.json) declares, for those jobs, the setup targets (`setup`) and the tools beyond those of kit (`tools`). The parity job installs the comparison environments with `ordered-json-install-parity`; the php-ext job installs PIE and the supplementary suite with `ordered-json-install-pie`; each runtime job builds its package. Every target of `CHECK_TARGETS` is a prerequisite of exactly one of these job targets; `tests/scripts/workflow-rules.test.mts` fails otherwise.

Each job checks out this repository at the workspace root and installs the locked kit package before its first make command; no sibling checkout is required. Downloads remain installation steps; no check enables network access. The closing job `kit / required` of the pipeline passes only when every job passed, so a run of `ci` that concludes `success` is the evidence that the release workflow requires ([publishing main](#publish)).

<a id="publish"></a>
## Publishing main

While the version is 0.x, the work of a checklist row is committed locally, and `main` receives the commits in one push, when every row of the checklist is `[o]` (AGENTS.md):

~~~sh
git push origin HEAD:main
~~~

The push runs `ci.yml`. When its run concludes `success`, the release workflow releases the top `## X.Y.Z` of the change log at the commit of the run when that commit is the version commit, or a later commit whose `## Unreleased` is empty while the version is untagged; `make release-tag`, which runs the release utility of `@polyspec/kit`, decides it ([tag releases](distribution.md#tag-release)).

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
