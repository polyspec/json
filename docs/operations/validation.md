<!-- doc-id: validation -->
# Verification

[한국어](validation.ko.md)

<a id="repository-check"></a>
## Aggregate check

Development runs unit tests only (`make json-test-scripts`). The aggregate check and the owner checks are end-to-end checks that [hosted CI](#ci) runs after every push; no rule requires a local run before a commit or a push, and the pre-push hook only reads the checklist. To run the aggregate check locally anyway, install the [required tools](installation.md#requirements) and run from the repository root:

~~~sh
make install
make check
~~~

`make check` runs the targets of `CHECK_TARGETS` through ci-targets of `@polyspec/kit`, past failures, and writes the report into `var/report/full-run`. Its target `verify-all` builds every implementation of `config/implementations.json`, sends the common JSON cases to the probe of each, writes the aggregate record `var/records/verification.json`, and runs the evidence check with the [records](#records) of the checkout (`scripts/verify.mts --record`). An aggregate record includes the source hash of every tracked file. The package tests of each implementation run in `make test-<language>`, with the native runner of its language, and the tool tests in `make json-test-scripts`.

Each build step prints a start line, its output as it arrives, and its exit status with the elapsed time. A build step has no time limit: its exit status and its output decide the result. Each probe receives one shared case at a time and the verifier prints the case with the elapsed time of its reply; a reply has 60 s, and a probe that misses it is killed and the case is named. No limit applies to the whole run. When a build step or a probe ends, the verifier kills its process group, so a process that it started in the background neither outlives it nor holds its output open. A failure ends neither the run nor the other languages: the build of each language and every shared case of every probe run to their end, a failed build skips only the later steps of its own language, and the run then lists every failure and exits with status 1 without writing a record. The expected result of a fixture or a supplementary case comes from an independent reference (`scripts/reference.mts`): the bytes decoded as strict UTF-8 and parsed by momoa, a JSON parser that keeps every member in order with its source range, with the unescaped control characters and the nesting limit checked on its tokens.

<a id="records"></a>
## Records

The evidence of a commit is the run that verifies it. `make verify-all` writes the aggregate record `var/records/verification.json`. Git ignores `var/`, so no record is committed: a record hashes every tracked file except `benchmarks/results.json`, so a committed record would go stale with the next commit and would force a full run on a local machine after every change. With `--records`, the evidence check at the end of `make verify-all` checks the aggregate record of the same checkout against the current sources. The PIE package of the binding installs a pre-packaged binary of a published release, so no PIE check runs on a checkout; a later row (T3.25-5) checks `pie install` against the published release.

The aggregate record includes source hashes, package file records, actual runtime versions, the running Node.js release, case counts, results, build warnings, and supplementary input revision. PHP and extension versions are separate fields. A changed input invalidates the record as current evidence. The verifier rejects changes during execution and incomplete implementation results. The record does not establish publication. Every record and report (`var/records/verification.json`, `benchmarks/results.json`, and the review copy of a failed benchmark) is written completely to a file in `var/`, which Git ignores and no manifest reads, and renamed over its path, so a reader finds the previous file or the new one and never part of one.

<a id="supplementary"></a>
## Supplementary inputs

~~~sh
make install
make check JSON_TEST_SUITE=.cache/JSONTestSuite
~~~

`make install` fetches the revision of nst/JSONTestSuite that [external inputs](../../external-inputs.json) pins into `.cache/JSONTestSuite` and refuses a checkout whose revision, case count or inputs hash differs from the pin, naming the expected and the actual value of each field.

The record states whether supplementary inputs were used. `i_` cases use the shared UTF-8 and depth policy. Official inputs and expectations exist only at the repository root; probes contain no separate goldens.

[External inputs](../../external-inputs.json) pins that revision and the hash of its cases, and a record measured against a different checkout fails the documentation check. `make check` compares the suite with that pin before any work; each field that differs fails the command with the expected and the actual value before a build starts.

<a id="individual"></a>
## Individual implementations

From the common checkout, selected checks build and run the declared probes. They do not update the aggregate record:

~~~sh
make verify-js
make verify-rust
make verify-go
make verify-php
~~~

For an independent clone:

~~~sh
git clone https://github.com/polyspec/json.git
cd json
make check
~~~

Each package has an independent build target, while the verifier (`scripts/registry.mts`) defines the shared build, probe and runtime commands of the implementations of `config/implementations.json`. The PHP probe, `packages/php-ext/tests/probe.php`, runs with the library of the binding extension that `make binding-php-ext-library` builds from the Rust core of the same checkout loaded (T3.25-3). Each run prints its run directory and removes it when it ends, so runs of one checkout do not share build output. Every cargo command of a run, and the `cargo run` of the benchmark, sets `CARGO_TARGET_DIR` to a directory inside that run, so a target directory that the environment names or that another checkout filled never provides the Rust probe or the benchmark binary.

Run `make check JSON_TEST_SUITE=/path/to/JSONTestSuite` for supplementary inputs.

<a id="ci"></a>
## Hosted CI

`.github/workflows/ci.yml` runs on every pull request, push to `main` and manual dispatch. It is one pipeline (PRINCIPLES S12): its one job `kit` calls `.github/workflows/ci-pipeline.yml`, the pipeline of this repository taken from the one of `@polyspec/kit`, whose job `plan` writes the plan of `config/ci.json` and whose other jobs each run one target of the Makefile: `kit-gates-static` in the shared job, `kit-gates-verify` in the verify job, `kit-gates-bindings` in the bindings job and `kit-gates-runtime-<runtime>` in the job of each runtime that its matrix lists.

A job holds no content in YAML. Its one run step is `make ci-<job>` with make variables as its only arguments, and the recipe of the Makefile installs what the job needs, stops when an install fails, runs the target of the job through `make ci-targets` and cleans the CI context up. The other steps are `uses:` steps: the checkout, the setup of PHP, the bootstrap of kit and the upload of the report. A local run of a job is the call that CI makes:

~~~sh
make ci-shared
make ci-runtime RUNTIME=go
make ci-assets-php PHP_MINOR=8.4
~~~

[config/ci.json](../../config/ci.json) declares, for those jobs, the setup targets (`setup`) and the tools beyond those of kit (`tools`). The verify job, which the pipeline itself declares, installs the toolchains of every language and the comparison environments with `json-install-verify`; each runtime job builds its package. Every target of `CHECK_TARGETS` is a prerequisite of exactly one of these job targets; `tests/scripts/workflow-rules.test.mts` fails otherwise.

Each job checks out this repository at the workspace root and installs the locked kit package before its first make command; no sibling checkout is required. Downloads remain installation steps; no check enables network access. The closing job `kit / required` of the pipeline runs `make ci-required` with the results of the other jobs and passes only when every job passed, so a run of `ci` that concludes `success` is the evidence that the release workflow requires ([publishing main](#publish)).

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
