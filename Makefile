# The recipes of this repository are its own (kit docs/spec/utilities-and-recipes.md): they run the utilities of the installed
# @polyspec/kit, node_modules/@polyspec/kit, with explicit arguments, and include no recipe of kit. A packed install and a
# development link to the kit checkout both hold the built utilities in dist/ (make kit-build in the kit checkout).
KIT := $(CURDIR)/node_modules/@polyspec/kit/dist
KIT_TOOLS := $(CURDIR)/var/tools
NODE := $(KIT_TOOLS)/bin/node
NPM := $(KIT_TOOLS)/bin/npm
ALINT := $(KIT_TOOLS)/mise/shims/alint
# The bootstrap installs the node of var/tools, so it starts with the Node.js of the machine (the setup-node of CI).
BOOTSTRAP_NODE := node
# The mise that make install-tools TOOLS=npm installs keeps its data, cache, state and configuration in var/tools/mise and reads
# mise.toml as its global configuration, whose [settings] and [env] state how mise and uv behave; the shims of var/tools/mise
# read these directories, so every recipe runs with them, and with var/tools/bin and the shims first on PATH.
export MISE_DATA_DIR := $(KIT_TOOLS)/mise
export MISE_CACHE_DIR := $(KIT_TOOLS)/mise/cache
export MISE_STATE_DIR := $(KIT_TOOLS)/mise/state
export MISE_CONFIG_DIR := $(KIT_TOOLS)/mise/config
export MISE_GLOBAL_CONFIG_FILE := $(CURDIR)/mise.toml
export MISE_GLOBAL_CONFIG_ROOT := $(CURDIR)
MISE_ENVIRONMENT := MISE_DATA_DIR MISE_CACHE_DIR MISE_STATE_DIR MISE_CONFIG_DIR MISE_GLOBAL_CONFIG_FILE MISE_GLOBAL_CONFIG_ROOT
# kit 0.0.98's run-tests dropped NODE_TEST_CONTEXT, so a node --test that a recipe starts from inside a node test runs as
# its own run, not as a child of that test (kit K1094); no recipe passes it on.
unexport NODE_TEST_CONTEXT
export PATH := $(CURDIR)/var/tools/bin:$(CURDIR)/var/tools/mise/shims:$(PATH)

# PYTHON is the python of mise.toml, which make install-tools installs with mise at the digest of mise.lock and its shim
# runs (kit K127). A recipe names it by its absolute path: GNU make execs a recipe line without shell metacharacters
# directly, so a bare python3 would resolve through the PATH that make read at start (the system Python).
PYTHON := $(CURDIR)/var/tools/mise/shims/python3
# uv and Composer of mise.toml, by the absolute paths of their shims for the same reason.
UV := $(CURDIR)/var/tools/mise/shims/uv
COMPOSER := $(CURDIR)/var/tools/mise/shims/composer
# Go of mise.toml, by the absolute path of its shim: a $(shell) of GNU make before 4.4 does not read the PATH that this
# file exports, so a lookup there finds the Go of the machine in one make and the Go of the checkout in another.
GO := $(CURDIR)/var/tools/mise/shims/go
# cargo is the proxy of rustup, a tool of the machine that reads rust-toolchain.toml; var/tools holds no cargo, so the
# lookup gives the same path under every make.
CARGO := $(shell command -v cargo)
# The supplementary suite of mise.toml (http:jsontestsuite), which json-install-suite installs; empty when it is not installed.
JSON_TEST_SUITE ?= $(wildcard var/tools/mise/installs/http-jsontestsuite/latest)

# The tools of every run are the releases that the tracked declaration files name: npm in the devEngines.packageManager of
# package.json, Rust in rust-toolchain.toml, PHP in .php-version, and Node.js, Go, Python, Composer and the other tools
# that mise installs in mise.toml at the digests of mise.lock. No command installs or selects a toolchain on demand:
# make install-tools TOOLS=npm installs npm and mise into var/tools/bin and make install the tools of mise.lock into
# var/tools/mise, whose shims come first on PATH with var/tools/bin, so no tool of the machine is used or changed.
export GOTOOLCHAIN := local
export RUSTUP_AUTO_INSTALL := 0
# A check reads no network: make install downloads what the checks read, and every other recipe and the scripts it
# starts run cargo, go, npm and Composer offline, so a missing download fails at once instead of reaching a registry
# in one run and not in another. The recipes that download run their command with $(ONLINE).
export CARGO_NET_OFFLINE := true
export GOPROXY := off
export npm_config_offline := true
export COMPOSER_DISABLE_NETWORK := 1
ONLINE := env -u CARGO_NET_OFFLINE -u GOPROXY -u npm_config_offline -u COMPOSER_DISABLE_NETWORK
# Each checkout builds its Rust crates into their own target; cargo judges freshness by modification times, so a target of
# another checkout would let it take binaries built from other sources as fresh.
unexport CARGO_TARGET_DIR

# The targets of the full suite that make check runs through ci-targets of @polyspec/kit and that the jobs of
# .github/workflows/ci-pipeline.yml run as the prerequisites of their kit-gates-* target (a target is in one job). verify-all
# writes the aggregate record into var/records.
CHECK_TARGETS := suppression-check link-check rules-check rebuild-check language-check duplication-check layout-check owner-validate release-coverage docs-check evidence-check verify-all lint-rust lint-go lint-php lint-php-ext test-php-ext lint-python json-test-scripts typecheck lint-ts test-js test-rust test-go test-php test-python

.PHONY: check json-test-scripts typecheck json-install-php json-install-python verify-all verify-js verify-rust verify-go verify-php verify-php-extension verify-python evidence-check pie-check \
	benchmark benchmark-check python-parse-budget install json-install json-install-rust \
	json-js-check json-js-test json-go-check json-go-test json-php-check json-php-test \
	json-php-ext-check json-php-ext-test json-python-check json-python-test json-rust-check json-rust-test

# check runs the full suite: ci-targets of @polyspec/kit runs every target past failures and writes its report into
# var/report/full-run.
check:
	$(MAKE) --no-print-directory ci-targets CI_REPORT=var/report/full-run TARGETS="$(CHECK_TARGETS)"

# install makes every download that the checks read after make install-packages: the tools of mise.lock, the Rust toolchain of
# rust-toolchain.toml, the crates of the root Cargo.lock, the Composer projects of the PHP packages with their PHPUnit,
# the virtual environment of the Python package; the PIE PHAR and the supplementary suite are tools of mise.toml (http:pie and
# http:jsontestsuite), which install-tools installs.
# It is the only target that downloads.
# install runs the bootstrap as the prerequisite install-kit of json-install, then links the packages (install-link).
install: json-install
	$(MAKE) --no-print-directory install-link

# deps-<runtime> (K859): the locked install of each runtime, a thin call that ci-setup runs when the runtime list is empty.
.PHONY: deps-node deps-go deps-rust deps-php deps-python
deps-node:
	$(MAKE) --no-print-directory install-packages
deps-go:
	$(GO) -C legacy/packages/go mod download
deps-rust: json-install-rust-packages
deps-php: json-install-php
deps-python: json-install-python
json-install: install-kit json-install-rust-packages json-install-php json-install-python

json-install-rust:
	$(ONLINE) rustup toolchain install --no-self-update

# json-install-php installs the locked Composer packages of legacy/packages/php and legacy/packages/php-ext, PHPUnit among them, into their
# vendor/, from which make test-php runs their tests, and the root package, the published composer.json,
# into vendor/, whose autoloader PHPStan of make lint-php reads for the PHP of benchmarks/. The root package requires only
# the platform, so its install downloads nothing; its composer.lock locks no package.
json-install-php:
	$(ONLINE) $(COMPOSER) install --no-interaction --no-progress
	$(ONLINE) $(COMPOSER) install --no-interaction --no-progress --working-dir=legacy/packages/php
	$(ONLINE) $(COMPOSER) install --no-interaction --no-progress --working-dir=legacy/packages/php-ext

# json-install-python makes legacy/packages/python/.venv from the Python of mise.toml (python-venv of kit) and installs the package
# into it, non-editable, with the uv of mise.toml. make install-link then makes the installed package folder a link to
# legacy/packages/python/src/polyspec/ordered_json (kit K765), so the tests import the sources of the checkout; make test-python runs the
# Python tests with its interpreter.
json-install-python:
	$(MAKE) --no-print-directory python-venv DIR=legacy/packages/python/.venv
	$(ONLINE) $(UV) pip install --python legacy/packages/python/.venv/bin/python --link-mode copy --no-deps legacy/packages/python
	$(MAKE) --no-print-directory install-link

# Product dependency installs are reused by independent CI jobs after Kit prepares
# only the requested toolchains. These targets install no other language's tools.
.PHONY: json-install-rust-packages json-install-verify json-install-suite json-install-pie
# Cargo runs offline here (CARGO_NET_OFFLINE), so the install fetches the crates of every tracked Cargo.lock with cargo fetch --locked.
json-install-rust-packages: json-install-rust
	@set -e; for lock in $$(git ls-files -- '*Cargo.lock'); do $(ONLINE) $(CARGO) fetch --locked --manifest-path "$${lock%.lock}.toml"; done

json-install-suite:
	$(ONLINE) $(KIT_TOOLS)/bin/mise install --locked http:jsontestsuite

json-install-pie: json-install-suite
	$(ONLINE) $(KIT_TOOLS)/bin/mise install --locked http:pie

# json-install-verify installs what verify-all builds and probes: the packages of every implementation, the suite and the PIE
# PHAR of its prerequisite pie-check.
json-install-verify: json-install-rust-packages json-install-php json-install-python json-install-suite json-install-pie

# json-test-scripts runs the node:test tool tests of tests/scripts, or the files of TESTS, through run-tests of @polyspec/kit,
# which runs the command and passes its output and exit code through; typecheck checks the TypeScript of scripts/, tests/scripts/
# and benchmarks/ with the tsc of package.json (tsconfig.json), which Node runs by type stripping and so never checks itself.
json-test-scripts:
	$(NODE) $(KIT)/run-tests.mjs node -- --test-concurrency=1 $(or $(TESTS),tests/scripts/)

typecheck:
	$(NODE) node_modules/typescript/bin/tsc -p tsconfig.json

# verify-all builds and verifies every implementation with the shared cases, writes var/records/verification.json and checks
# it with the evidence check (scripts/verify.mts --record); verify-<implementation> verifies one implementation and writes no
# record. The package tests of each implementation run in test-<language>, with the native runner of its language.
# verify-all checks the PIE record of make pie-check, which names the sources of the tree that it checked, so pie-check is its
# prerequisite: it reads the record of its own tree and never one that an earlier tree left (pie-check is no target of
# CHECK_TARGETS of its own).
verify-all: pie-check
	$(NODE) scripts/verify.mts --record$(if $(JSON_TEST_SUITE), --suite "$(JSON_TEST_SUITE)")

verify-js verify-rust verify-go verify-php verify-php-extension verify-python:
	$(NODE) scripts/verify.mts --only $(patsubst verify-%,%,$@)$(if $(JSON_TEST_SUITE), --suite "$(JSON_TEST_SUITE)")

# evidence-check checks the feature rows against the evidence they name, the release assets of the published features and the
# JSON reports of docs/ (scripts/check-evidence.mts); verify-all runs it again with the verification records of the run.
evidence-check:
	$(NODE) scripts/check-evidence.mts

# pie-check builds the extension with the PIE PHAR of mise.toml, verifies the module with the shared cases and writes
# var/records/pie-verification.json (scripts/check-pie.mts).
pie-check:
	$(NODE) scripts/check-pie.mts$(if $(JSON_TEST_SUITE), --suite "$(JSON_TEST_SUITE)")

benchmark:
	$(NODE) benchmarks/run.mts

# benchmark-check measures the benchmark without replacing the committed result.
benchmark-check:
	$(NODE) benchmarks/run.mts --check

# The packages keep no Makefile (ruling 6 of the fourth pass): each package's check and test are targets of this Makefile,
# named <repo>-<package>-<task>, where <package> is its folder under packages/ and the task is check or test.
json-js-check: verify-js
json-js-test: json-js-check

json-go-check: verify-go
json-go-test: test-go

json-php-check: verify-php
json-php-test: json-php-check

json-php-ext-check: verify-php-extension
json-php-ext-test: json-php-ext-check

json-python-check: verify-python
json-python-test: json-python-check

json-rust-check: verify-rust
json-rust-test: json-rust-check

# python-parse-budget compares the CPU time of the Python parse with the pure PHP parse on one generated document and fails
# when the Python median exceeds three times the PHP median (benchmarks/python-parse/run.py). A person runs it after a
# change of the Python parser; it is no target of make check.
python-parse-budget:
	$(MAKE) --no-print-directory install-tools TOOLS="python php"
	$(PYTHON) benchmarks/python-parse/run.py

# ---- The recipes of the bootstrap and the installs, which run the utilities of the installed kit --------------------------
.PHONY: install-kit install-tools install-packages install-link kit-install-declared kit-install-symbols toolchain-lock python-venv
# install-kit installs, in order, the mise, node and npm of mise.toml, the packages of package-lock.json, the other tools of
# mise.toml and the symbol extractors of config/toolchain.json, all into var/tools of this checkout.
install-kit:
	$(MAKE) --no-print-directory install-tools TOOLS=npm
	$(MAKE) --no-print-directory install-packages
	$(MAKE) --no-print-directory install-tools
	$(MAKE) --no-print-directory kit-install-declared

# The home and the cache of the Composer that install-tools and install-symbols run, the folders of var/tools that kit 0.0.98
# set (kit K1095).
COMPOSER_TOOL_ENV = COMPOSER_HOME=$(CURDIR)/var/tools/composer/home COMPOSER_CACHE_DIR=$(CURDIR)/var/tools/composer/cache
# TOOLS=npm runs the bootstrap installer, which imports only Node.js built-ins, with the Node.js of the machine; any other TOOLS
# names tools of mise.toml, and no TOOLS installs every tool of mise.lock.
install-tools:
ifeq ($(TOOLS),npm)
	$(ONLINE) $(BOOTSTRAP_NODE) $(KIT)/bootstrap/bootstrap.mjs
else
	$(COMPOSER_TOOL_ENV) $(ONLINE) $(NODE) $(KIT)/install-tools.mjs --no-self-update $(TOOLS)
endif

# npm reads allow-remote of .npmrc, which allows the URL of the kit release that package.json names.
install-packages:
	$(ONLINE) $(NPM) ci

install-link:
	$(NODE) $(KIT)/link.mjs link$(if $(PROJECT), --project $(PROJECT))$(if $(RUNTIME), --runtime $(RUNTIME))

kit-install-declared:
	$(COMPOSER_TOOL_ENV) $(ONLINE) $(NODE) $(KIT)/install-symbols.mjs --declared

kit-install-symbols:
	$(COMPOSER_TOOL_ENV) $(ONLINE) $(NODE) $(KIT)/install-symbols.mjs $(EXTRACTORS)

# toolchain-lock writes mise.lock with the mise of var/tools for every platform that has the archives of the tools.
TOOLCHAIN_LOCK_PLATFORMS := linux-x64,linux-arm64,macos-arm64,macos-x64,windows-x64,windows-arm64
toolchain-lock:
	$(ONLINE) $(KIT_TOOLS)/bin/mise lock uv python --global --platform $(TOOLCHAIN_LOCK_PLATFORMS)
	$(ONLINE) $(KIT_TOOLS)/bin/mise install --locked uv python
	UV_PYTHON="$$($(KIT_TOOLS)/bin/mise which python3)" $(ONLINE) $(KIT_TOOLS)/bin/mise lock --global --platform $(TOOLCHAIN_LOCK_PLATFORMS)

python-venv:
	$(NODE) $(KIT)/python-venv.mjs $(DIR)

# ---- Builds and tests of each runtime of packages/ -----------------------------------------------------------------------
.PHONY: build-go build-js build-php build-python build-rust test-go test-js test-php test-python test-rust build-php-ext lint-php-ext test-php-ext
# The build of each package of a runtime with the build of its ecosystem; the JavaScript and PHP packages have none (kit K1106).
build-go:
	$(NODE) $(KIT)/runtime-targets.mjs build --roots legacy/packages/go -- $(GO) build ./...
build-js build-php:
build-python:
	$(NODE) $(KIT)/runtime-targets.mjs build --roots legacy/packages/python -- $(UV) build
build-rust:
	$(NODE) $(KIT)/runtime-targets.mjs build --roots packages/rust -- cargo build --locked -p polyspec-json

# The unit tests of a runtime; CASES=<pattern> is the name filter of its runner. The runner arguments are those that kit 0.0.98
# passed (kit K1094, K1106): go -count=1 -timeout=0, one test at a time in node and cargo, and the 30 s test timeout of node.
test-go:
	$(NODE) $(KIT)/runtime-targets.mjs test --runner go --roots legacy/packages/go -- -count=1 -timeout=0
test-js:
	$(NODE) $(KIT)/runtime-targets.mjs test --runner node --roots legacy/packages/js -- --test-timeout=30000 --test-concurrency=1
test-php:
	$(NODE) $(KIT)/runtime-targets.mjs test --runner php --roots legacy/packages/php
test-python:
	PYTHONUNBUFFERED=1 NO_COLOR=1 PYTHON_COLORS=0 $(NODE) $(KIT)/runtime-targets.mjs test --runner python --roots legacy/packages/python --venv .venv
test-rust:
	$(NODE) $(KIT)/runtime-targets.mjs test --runner cargo --roots packages/rust -- -p polyspec-json -- --test-threads=1

# ---- Bindings: generated from packages/rust/interface.json by binding (C-0) ---------------------------------------------
# binding is not yet a package that package-lock.json pins; until it is, BINDING names the cli (packages/ts/src/cli.ts) of
# a binding checkout, and both targets refuse to run without it. bindings writes the generated folders of packages/ts,
# packages/python and packages/php-ext, which Git ignores; bindings-check runs the contract check, which also compares the
# tracked binding packages with what binding scaffold writes (binding L-2, CK-19).
.PHONY: bindings bindings-check lint-bindings test-bindings
# The lint and the tests of the binding crates, after make bindings writes their generated folders.
lint-bindings: bindings
	$(CARGO) clippy --locked $(foreach crate,$(BINDING_CRATES),-p $(crate)) --all-targets -- -D warnings
test-bindings: bindings
	$(CARGO) test --locked $(foreach crate,$(BINDING_CRATES),-p $(crate))
BINDING ?=
bindings:
	@test -n "$(BINDING)" || { echo "bindings: set BINDING to the cli of binding"; exit 1; }
	$(NODE) $(BINDING) generate --root $(CURDIR)
bindings-check:
	@test -n "$(BINDING)" || { echo "bindings-check: set BINDING to the cli of binding"; exit 1; }
	$(NODE) $(BINDING) check $(CURDIR)/packages/rust/interface.json

# The PHP extension of legacy/packages/php-ext: build-php-ext builds var/php-ext/polyspec_ordered_json.so with phpize after the check
# of its stub and arginfo header; gen_stub.php may fetch its PHP-Parser once.
build-php-ext:
	$(ONLINE) $(NODE) $(KIT)/php-extension.mjs build --extension legacy/packages/php-ext --build-dir var/php-ext --skip vendor --skip node_modules --library legacy/packages/php
lint-php-ext:
	$(NODE) $(KIT)/php-extension.mjs check --extension legacy/packages/php-ext --build-dir var/php-ext --skip vendor --skip node_modules --library legacy/packages/php
test-php-ext: build-php-ext
	$(NODE) $(KIT)/php-extension.mjs test --extension legacy/packages/php-ext --build-dir var/php-ext --skip vendor --skip node_modules --library legacy/packages/php -- --roots legacy/packages/php

# ---- Checks ----------------------------------------------------------------------------------------------------------------
.PHONY: layout-check docs-check rules-check owner-check owner-validate rebuild-check language-check \
	duplication-check suppression-check link-check release-coverage \
	lint-ts lint-php lint-python lint-go lint-rust
# layout-check runs alint with config/layout.yml, then fails on an install directory that Git does not ignore and on a tracked
# generated file.
layout-check:
	@test -x $(ALINT) || { echo "layout-check: $(ALINT) is missing; run make install-tools"; exit 1; }
	$(ALINT) check --config config/layout.yml --color never --compact .
	$(NODE) $(KIT)/generated-files.mjs installs var package.json=node_modules pyproject.toml=.venv composer.json=vendor
	$(NODE) $(KIT)/generated-files.mjs tracked --binary ELF --binary Mach-O --binary PE

docs-check:
	$(NODE) $(KIT)/check-documents.mjs --checklist-place --private-path /Users/ --private-path /home/ --kit-rows

rules-check:
	$(NODE) $(KIT)/check-rules.mjs

# owner-check runs the checks of config/owner-checks.json that own the changed paths; PATHS="a b" or BASE=<revision> selects them.
owner-check:
	$(NODE) $(KIT)/owner-check.mjs --every-path $(if $(PATHS),--paths "$(PATHS)") $(if $(BASE),--base $(BASE))
owner-validate:
	$(NODE) $(KIT)/owner-check.mjs --every-path --validate

# The tool sources of rebuild-check, the values that kit 0.0.98 fixed (kit K1080): the scripts and generators, each glob quoted.
REBUILD_SOURCES := --source 'scripts/**/*.{mts,mjs,cjs,js,ts,py,php,sh,mk}' --source 'packages/*/{scripts,tools,bin}/**/*.{mts,mjs,cjs,js,ts,py,php,sh,mk}' --source 'packages/*/*/{scripts,tools,bin}/**/*.{mts,mjs,cjs,js,ts,py,php,sh,mk}' --source '**/*_generate.go' --source '**/*.generate.{mts,mjs,cjs,js,ts,py,php,sh,mk}' --source 'benchmarks/**/*.{mts,mjs,cjs,js,ts,py,php,sh,mk}' --source 'examples/**/*.{mts,mjs,cjs,js,ts,py,php,sh,mk}' --source 'tests/fixtures/*/generate.*'
# The files among the sources that are no tool source (kit K1080): the .d.ts declarations and the tests.
REBUILD_EXCLUDES := --exclude '**/*.d.ts' --exclude '*/**/{test,tests}/**' --exclude 'test/**' --exclude 'tests/**/{*_generate.go,*.generate.*}' --exclude '**/*.{test,spec}.{js,jsx,ts,tsx,cjs,cts,mjs,mts}' --exclude '**/{*_test.go,test_*.py,*_test.py,*Test.php}'
rebuild-check:
	$(NODE) $(KIT)/rebuild-check.mjs $(REBUILD_SOURCES) $(REBUILD_EXCLUDES)
language-check:
	$(NODE) $(KIT)/language-check.mjs --forbid '\p{Script=Hangul}'
duplication-check:
	$(NODE) $(KIT)/duplication-check.mjs
suppression-check:
	$(NODE) $(KIT)/suppression-check.mjs
release-coverage:
	$(NODE) $(KIT)/release.mjs coverage


# The lint of each language, with the configuration files of this repository: .oxlintrc.json and knip.json, phpcs.xml.dist and
# phpstan.dist.neon, ruff.toml and the [tool.vulture] of legacy/packages/python/pyproject.toml, .golangci.yml, and the [lints] of
# the root Cargo.toml with clippy.toml.
lint-ts:
	$(NODE) $(KIT)/lint-ts.mjs
lint-php:
	$(NODE) $(KIT)/lint-php.mjs --memory-limit=-1
lint-python:
	$(NODE) $(KIT)/lint-python.mjs
# lint-go lints every Go module of the checkout, a go.mod: legacy/packages/go and the binding module packages/go, whose Go
# files make bindings writes (binding design L-1), so it runs after bindings and fails with it.
lint-go: bindings
	$(NODE) $(KIT)/lint-go.mjs
# lint-rust lints the core crate: kit runs clippy --workspace, and the binding crates, which need make bindings first, are
# excluded and linted by lint-bindings.
BINDING_CRATES := polyspec-json-node polyspec-json-wasm polyspec-json-python polyspec-json-php-ext polyspec-json-go
lint-rust:
	$(NODE) $(KIT)/lint-rust.mjs --locked $(foreach crate,$(BINDING_CRATES),--exclude $(crate))

# ---- Development links (the git-ignored .links of the main checkout) -------------------------------------------------------
.PHONY: link unlink link-check
link:
	$(NODE) $(KIT)/link.mjs link$(if $(PROJECT), --project $(PROJECT))$(if $(RUNTIME), --runtime $(RUNTIME))
unlink:
	$(NODE) $(KIT)/link.mjs unlink$(if $(PROJECT), --project $(PROJECT))$(if $(RUNTIME), --runtime $(RUNTIME))
link-check:
	$(NODE) $(KIT)/link-check.mjs$(if $(PROJECT), --project $(PROJECT))

# ---- CI: the gates, the plan and the setup of the jobs of .github/workflows/ci-pipeline.yml ----------------------------------
.PHONY: kit-gates-static kit-gates-verify kit-gates-runtime-ts kit-gates-runtime-php kit-gates-runtime-python \
	kit-gates-runtime-go kit-gates-runtime-rust kit-gates-runtime-php-ext kit-ci-plan kit-ci-setup kit-ci-context-prepare \
	kit-ci-context-cleanup ci-targets
# The targets of the jobs of the pipeline, which its steps run by name: kit-gates-static in the shared job, kit-gates-verify in
# the verify job and kit-gates-runtime-<runtime> in the runtime job of each runtime. Together they hold every target of
# CHECK_TARGETS, each in one of them (tests/scripts/workflow-rules.test.mts).
# kit-gates-static runs past a failure, so one run names every static gate that fails.
ifneq ($(filter kit-gates-static,$(MAKECMDGOALS)),)
MAKEFLAGS += -k
endif
kit-gates-static: layout-check docs-check rules-check owner-validate rebuild-check language-check duplication-check suppression-check link-check release-coverage evidence-check json-test-scripts typecheck
	@echo "[kit-gates-static] every shared gate passed"
kit-gates-verify: verify-all
kit-gates-runtime-ts: lint-ts test-js
kit-gates-runtime-php: lint-php test-php
kit-gates-runtime-python: lint-python test-python
kit-gates-runtime-go: lint-go test-go
kit-gates-runtime-rust: lint-rust test-rust
kit-gates-runtime-php-ext: lint-php-ext test-php-ext

# kit-ci-plan writes the jobs, runners and tools of config/ci.json to GITHUB_OUTPUT; kit-ci-setup runs the setup targets that
# config/ci.json declares for GROUP=shared|runtime and RUNTIME.
kit-ci-plan:
	$(NODE) $(KIT)/ci-setup.mjs --plan
kit-ci-setup:
	$(NODE) $(KIT)/ci-setup.mjs --setup $(GROUP) $(RUNTIME)
kit-ci-context-prepare:
	$(NODE) $(KIT)/ci-setup.mjs --context-prepare $(GROUP) $(RUNTIME)
kit-ci-context-cleanup:
	$(NODE) $(KIT)/ci-setup.mjs --context-cleanup $(GROUP) $(RUNTIME)

# ci-targets runs TARGETS past failures and writes the logs, record.json and summary.md into CI_REPORT.
CI_REPORT ?= var/report/ci-targets
ci-targets:
	$(NODE) $(KIT)/ci-targets.mjs -k $(CI_REPORT) $(TARGETS)

# ---- Release: the steps of .github/workflows/release.yml, in its order (config/release.json) ---------------------------------
.PHONY: release-prepare release-tools release-tools-path release-tag release-assets release-publish release-undraft
# The release builds the released versions, so its Go runs without the go.work that link writes.
release-prepare release-tools release-tag release-assets release-publish release-undraft release-coverage: export GOWORK := off
# release-prepare: this repository needs no preparation before release-tools.
release-prepare:
	@:
release-tools:
	$(ONLINE) $(NODE) $(KIT)/release-tools.mjs
# release-tools-path puts var/tools/bin and the shims on GITHUB_PATH and the environment of mise on GITHUB_ENV for the steps after it.
release-tools-path:
	@echo "$(KIT_TOOLS)/mise/shims" >> "$$GITHUB_PATH"
	@echo "$(KIT_TOOLS)/bin" >> "$$GITHUB_PATH"
	@for name in $(MISE_ENVIRONMENT); do echo "$$name=$$(printenv $$name)"; done >> "$$GITHUB_ENV"
# release-tag tags the commit of the successful CI run RUN; AUTO=1 releases only the version commit of the top version.
release-tag:
	RELEASE_MAIN=origin/main $(NODE) $(KIT)/release-run.mjs tag "$$RUN"$(if $(AUTO), --auto)
release-assets:
	RELEASE_ASSETS=var/release/assets $(ONLINE) $(NODE) $(KIT)/release.mjs assets "$$TAG"
release-publish:
	RELEASE_ASSETS=var/release/assets RELEASE_RECORDS=var/release $(NODE) $(KIT)/release.mjs publish "$$TAG"
release-undraft:
	RELEASE_RECORDS=var/release $(NODE) $(KIT)/release.mjs undraft "$$TAG"

# ---- The procedure of a row: worktree, checklist, commit, landing --------------------------------------------------------------
.PHONY: worktree-setup land plan-new plan-split item-new item-edit item-state item-test commit documents-stamp text-absent twin-merge
# The worktree of a row (kit K1107), as kit 0.0.98 made it: ../<main checkout>-<NAME>-<ID> on <TYPE or fix>/<NAME>-<ID> from main;
# a worktree without node_modules first gets npm ci of the npm of var/tools, then make install and make link-check run in it. The
# worktree runs its own tools in a make of its own (kit K858): the recipe drops the flags of this make and this var/tools from PATH.
WORKTREE_MAIN = $(patsubst %/.git,%,$(shell git rev-parse --path-format=absolute --git-common-dir))
WORKTREE_DECLARATION = --folder $(WORKTREE_MAIN)-$(NAME)-$(ID) --branch $(or $(TYPE),fix)/$(NAME)-$(ID) --base main --prepare 'test -d node_modules || PATH="$(KIT_TOOLS)/bin:$$PATH" $(NPM) ci --ignore-scripts' --make install --make link-check
WORKTREE_ENVIRONMENT = env -u MAKEFLAGS -u MFLAGS -u MAKELEVEL PATH="$$(printf '%s' "$$PATH" | awk -v RS=: -v ORS=: -v tools='$(KIT_TOOLS)' 'index($$0, tools) != 1' | sed 's/:$$//')"
# worktree-setup creates or reuses the worktree of a row from main and runs make install in it.
worktree-setup:
	$(ONLINE) $(WORKTREE_ENVIRONMENT) $(NODE) $(KIT)/worktree-setup.mjs $(WORKTREE_DECLARATION)
# land merges BRANCH fast-forward into main and removes its worktree and branch.
land:
	$(NODE) $(KIT)/land.mjs $(BRANCH) main

# The texts of a row reach plan.mjs unexpanded: each text that is set is passed in single quotes as its raw value.
raw_text = $(foreach v,$(1),$(if $(filter undefined,$(origin $(v))),,$(v)='$(subst ','\'',$(value $(v)))'))
plan-new:
	NAME_PATTERN='^[a-z][a-z0-9-]*$$' $(NODE) $(KIT)/plan.mjs plan-new
plan-split:
	$(NODE) $(KIT)/plan.mjs plan-split
item-new:
	$(call raw_text,TASK TASK_KO DELIVERABLES VERIFICATION) $(NODE) $(KIT)/plan.mjs item-new
item-edit:
	$(call raw_text,TASK TASK_KO DELIVERABLES VERIFICATION CAUSE RETRY CAUSE_KO RETRY_KO) DONE_STAYS=1 $(NODE) $(KIT)/plan.mjs item-edit
item-state:
	$(NODE) $(KIT)/plan.mjs item-state
item-test:
	$(NODE) $(KIT)/plan.mjs item-test
commit:
	$(NODE) $(KIT)/plan.mjs commit
documents-stamp:
	$(NODE) $(KIT)/documents-stamp.mjs $(PATHS)
# text-absent fails while the tracked file FILE holds the text TEXT; both reach the utility unexpanded through its environment.
unexport TEXT
text-absent: export KIT_TEXT_ABSENT_FILE = $(value FILE)
text-absent: export KIT_TEXT_ABSENT_TEXT = $(value TEXT)
text-absent:
	$(NODE) $(KIT)/text-absent.mjs
# twin-merge is the merge driver of a Korean twin, a changelog and a checklist that git config names (merge.kit-*.driver).
twin-merge:
	@$(NODE) $(KIT)/twin-merge.mjs $(MERGE)
