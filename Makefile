# PYTHON is the python of mise.toml, which make install-tools installs with mise at the digest of mise.lock and its shim
# runs (kit K127). A recipe names it by its absolute path: GNU make execs a recipe line without shell metacharacters
# directly, so a bare python3 would resolve through the PATH that make read at start (the system Python).
PYTHON := $(CURDIR)/var/tools/mise/shims/python3
# uv and Composer of mise.toml, by the absolute paths of their shims for the same reason.
UV := $(CURDIR)/var/tools/mise/shims/uv
COMPOSER := $(CURDIR)/var/tools/mise/shims/composer
CARGO := $(shell command -v cargo)
GO := $(shell command -v go)
# The supplementary suite of mise.toml (http:jsontestsuite), which ordered-json-install-suite installs; empty when it is not installed.
JSON_TEST_SUITE ?= $(wildcard var/tools/mise/installs/http-jsontestsuite/latest)

# The tools of every run are the releases that the tracked declaration files name: npm in the devEngines.packageManager of
# package.json, Rust in rust-toolchain.toml, PHP in .php-version, and Node.js, Go, Python, Composer and the other tools
# that mise installs in mise.toml at the digests of mise.lock. No command installs or selects a toolchain on demand:
# make install-tools TOOLS=npm installs npm and mise into var/tools/bin and make install the tools of mise.lock into
# var/tools/mise (make install-tools of @polyspec/kit), whose shims kit.mk puts first on PATH with var/tools/bin, so no tool
# of the machine is used or changed, and install-tools installs every tool at its declaration.
export PATH := $(CURDIR)/var/tools/bin:$(PATH)
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

# Shared targets come from the installed kit package. Its bootstrap supports both native npm source links and packed
# installations. CI bootstraps the locked package before Make reads this include.
include node_modules/@polyspec/kit/scripts/kit/kit-bootstrap.mk

# The targets of the full suite that make check runs through ci-targets of @polyspec/kit with FINAL_RUN and that the jobs of
# .github/workflows run with make ci-targets (a target is in one job). verify-all writes the aggregate record into var/records.
CHECK_TARGETS := kit-check suppression-check bypass-check divergence-check link-check rules-check rebuild-check language-check test-markers-check duplication-check layout-check hooks-check owner-validate release-coverage parity-declarations-check docs-check evidence-check verify-all parity-check lint-rust lint-go lint-php lint-php-ext test-php-ext lint-python pie-check ordered-json-test-scripts typecheck lint-ts test-js test-rust test-go test-php test-python

.PHONY: check ordered-json-test-scripts typecheck ordered-json-install-php ordered-json-install-python verify-all verify-js verify-rust verify-go verify-php verify-php-extension verify-python evidence-check pie-check \
	benchmark benchmark-check python-parse-budget install ordered-json-install ordered-json-install-rust \
	ordered-json-js-check ordered-json-js-test ordered-json-go-check ordered-json-go-test ordered-json-php-check ordered-json-php-test \
	ordered-json-php-ext-check ordered-json-php-ext-test ordered-json-python-check ordered-json-python-test ordered-json-rust-check ordered-json-rust-test

# check runs the full suite on a clean committed tree: ci-targets of @polyspec/kit with FINAL_RUN=1 refuses any other tree, runs
# every target past failures and writes its report into var/report/full-run.
check:
	FINAL_RUN=1 $(MAKE) --no-print-directory ci-targets CI_REPORT=var/report/full-run TARGETS="$(CHECK_TARGETS)"

# install makes every download that the checks read after make install-packages: the tools of mise.lock, the Rust toolchain of
# rust-toolchain.toml, the crates of packages/rust/Cargo.lock, the Composer projects of the PHP packages with their PHPUnit,
# the virtual environment of the Python package; the PIE PHAR and the supplementary suite are tools of mise.toml (http:pie and
# http:jsontestsuite), which install-tools installs.
# It is the only target that downloads.
# install runs the bootstrap of kit as the prerequisite install-kit of ordered-json-install (K246-2).
install: ordered-json-install

# deps-<runtime> (K859): the locked install of each runtime, a thin call that ci-setup runs when the runtime list is empty.
.PHONY: deps-node deps-go deps-rust deps-php deps-python
deps-node:
	$(MAKE) --no-print-directory install-packages
deps-go:
	$(GO) -C packages/go mod download
deps-rust: ordered-json-install-rust cargo-downloads-fetch
deps-php: ordered-json-install-php
deps-python: ordered-json-install-python
ordered-json-install: install-kit ordered-json-install-rust cargo-downloads-fetch ordered-json-install-php ordered-json-install-python

ordered-json-install-rust:
	$(ONLINE) rustup toolchain install --no-self-update

# ordered-json-install-php installs the locked Composer packages of packages/php and packages/php-ext, PHPUnit among them, into their
# vendor/, from which kit parity runs their tests (config/parity.json), and the root package, the published composer.json,
# into vendor/, whose autoloader PHPStan of make lint-php reads for the PHP of benchmarks/. The root package requires only
# the platform, so its install downloads nothing; its composer.lock locks no package.
ordered-json-install-php:
	$(ONLINE) $(COMPOSER) install --no-interaction --no-progress
	$(ONLINE) $(COMPOSER) install --no-interaction --no-progress --working-dir=packages/php
	$(ONLINE) $(COMPOSER) install --no-interaction --no-progress --working-dir=packages/php-ext

# ordered-json-install-python makes packages/python/.venv from the Python of mise.toml (python-venv of kit) and installs the package
# into it, non-editable, with the uv of mise.toml: the python extractor of kit reads the modules from the file list of the installed
# distribution (kit K788), which an editable install does not hold. make install-link then makes the installed package folder a link to
# packages/python/src/polyspec/ordered_json (kit K765), so the tests import the sources of the checkout. config/parity.json runs the
# Python tests with its interpreter.
ordered-json-install-python:
	$(MAKE) --no-print-directory python-venv DIR=packages/python/.venv
	$(ONLINE) $(UV) pip install --python packages/python/.venv/bin/python --link-mode copy --no-deps packages/python
	$(MAKE) --no-print-directory install-link

# Product dependency installs are reused by independent CI jobs after Kit prepares
# only the requested toolchains. These targets install no other language's tools.
.PHONY: ordered-json-install-rust-packages ordered-json-install-parity ordered-json-install-suite ordered-json-install-pie
ordered-json-install-rust-packages: ordered-json-install-rust
	$(MAKE) --no-print-directory cargo-downloads-fetch

ordered-json-install-suite:
	$(ONLINE) $(KIT_TOOLS)/bin/mise install --locked http:jsontestsuite

ordered-json-install-pie: ordered-json-install-suite
	$(ONLINE) $(KIT_TOOLS)/bin/mise install --locked http:pie

ordered-json-install-parity: ordered-json-install-rust-packages ordered-json-install-php ordered-json-install-python ordered-json-install-suite

# ordered-json-test-scripts runs the node:test tool tests of tests/scripts, or the files of TESTS, through run-tests of @polyspec/kit,
# which gives each test its own deadline; typecheck checks the TypeScript of scripts/, tests/scripts/ and benchmarks/ with the tsc
# of package.json (tsconfig.json), which Node runs by type stripping and so never checks itself.
ordered-json-test-scripts:
	$(NODE) $(KIT)/run-tests.$(KIT_EXT) node -- $(or $(TESTS),tests/scripts/)

typecheck:
	$(NODE) node_modules/typescript/bin/tsc -p tsconfig.json

# verify-all builds and verifies every implementation with the shared cases, writes var/records/verification.json and checks
# it with the evidence check (scripts/verify.mts --record); verify-<implementation> verifies one implementation and writes no
# record. The package tests of each implementation run in parity-check, with the native runner of its language.
verify-all:
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
ordered-json-js-check: verify-js
ordered-json-js-test: ordered-json-js-check

ordered-json-go-check: verify-go
ordered-json-go-test: test-go

ordered-json-php-check: verify-php
ordered-json-php-test: ordered-json-php-check

ordered-json-php-ext-check: verify-php-extension
ordered-json-php-ext-test: ordered-json-php-ext-check

ordered-json-python-check: verify-python
ordered-json-python-test: ordered-json-python-check

ordered-json-rust-check: verify-rust
ordered-json-rust-test: ordered-json-rust-check

# parity-check loads the library that build-php-ext (kit, S10) publishes into var/php-ext, which config/parity.json names for the
# implementation php-extension.
parity-check: build-php-ext

# python-parse-budget compares the CPU time of the Python parse with the pure PHP parse on one generated document and fails
# when the Python median exceeds three times the PHP median (benchmarks/python-parse/run.py). A person runs it after a
# change of the Python parser; it is no target of make check.
python-parse-budget:
	$(MAKE) --no-print-directory install-tools TOOLS="python php"
	$(PYTHON) benchmarks/python-parse/run.py
