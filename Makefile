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
CHECK_TARGETS := suppression-check link-check rules-check rebuild-check language-check duplication-check layout-check owner-validate release-coverage docs-check evidence-check verify-all lint-rust lint-go lint-php lint-php-ext test-php-ext lint-python json-test-scripts typecheck lint-ts test-js fmt-check test-rust test-go test-php test-python \
	lint-bindings check-declarations test-binding-crates test-binding-python test-binding-node test-binding-wasm test-binding-php test-binding-go test-differential-js

.PHONY: check fmt-check json-test-scripts typecheck json-install-php json-install-python verify-all verify-js verify-rust verify-go verify-php verify-php-extension verify-python evidence-check pie-check \
	benchmark benchmark-check benchmark-host python-parse-budget install json-install json-install-rust \
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

# benchmark-host measures the conversion of RQ-036, which reads every string in as its UTF-16 code units, against the
# same walk with Rust strings, on a document of one large string and one of many small strings, and writes each median with
# its run count and the load average of the machine into var/report/bench/host-cost-rust.json (benchmarks/host-cost.mts); a
# ratio above its limit prints WARNING and the target passes.
benchmark-host:
	$(NODE) benchmarks/host-cost.mts --report var/report/bench/host-cost-rust.json -- $(CARGO) run --locked --release --quiet --manifest-path packages/rust/Cargo.toml --example host_cost

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
# The npm that devEngines of package.json names installs the lock, @polyspec/kit included, before the tools of the checkout
# exist, since install-tools TOOLS=npm runs the bootstrap of the installed kit. It runs outside the checkout with --prefix,
# since an npm of another release refuses a folder whose devEngines names npm 12.2.0 (EBADDEVENGINES); npm reads
# allow-remote of the .npmrc of the checkout. It reads that release with the Node.js of the machine, BOOTSTRAP_NODE, since
# the node of var/tools is not installed yet. A fresh checkout runs make bootstrap, make install-tools TOOLS=npm and
# make install-packages, then make install.
.PHONY: bootstrap
BOOTSTRAP_NPM := $(abspath $(shell command -v npm))
bootstrap: ## Install package-lock.json with the npm of devEngines before the tools of the checkout exist; ONLINE
	root="$$PWD"; version="$$($(BOOTSTRAP_NODE) -p 'require("./package.json").devEngines.packageManager.version')"; \
	cd "$${TMPDIR:-/tmp}" && $(ONLINE) npm_config_cache="$$root/var/bootstrap/npm-cache" "$(BOOTSTRAP_NPM)" exec --yes --package="npm@$$version" -- npm --prefix "$$root" ci --ignore-scripts

# json-lock-update writes package-lock.json and Cargo.lock again after a manifest changes a pin, since every other install
# follows its lock. npm runs as in bootstrap, the release of devEngines outside the checkout; json-cargo-lock-update moves
# only polyspec-binding-core, to the release BINDING_VERSION, so no other crate of the lock changes.
.PHONY: json-lock-update
BINDING_VERSION ?= $(shell sed -n 's/.*polyspec-binding-core = .*tag = "v\([0-9.]*\)".*/\1/p' packages/rust/Cargo.toml)
json-lock-update: ## Write package-lock.json and Cargo.lock again from the manifests; ONLINE
	root="$$PWD"; version="$$($(BOOTSTRAP_NODE) -p 'require("./package.json").devEngines.packageManager.version')"; \
	cd "$${TMPDIR:-/tmp}" && $(ONLINE) npm_config_cache="$$root/var/bootstrap/npm-cache" "$(BOOTSTRAP_NPM)" exec --yes --package="npm@$$version" -- npm --prefix "$$root" install --package-lock-only --ignore-scripts --no-audit --no-fund
	$(MAKE) --no-print-directory json-cargo-lock-update
# json-cargo-lock-update moves polyspec-binding-core only when Cargo.lock holds another release than BINDING_VERSION: cargo
# update --precise of a git source reads a version that the lock already holds as a git revision and fails (T3.41).
.PHONY: json-cargo-lock-update
json-cargo-lock-update:
	if grep -A1 '^name = "polyspec-binding-core"$$' Cargo.lock | grep -qx 'version = "$(BINDING_VERSION)"'; then \
	echo 'json-cargo-lock-update: Cargo.lock holds polyspec-binding-core $(BINDING_VERSION)'; \
	else $(ONLINE) $(CARGO) update -p polyspec-binding-core --precise $(BINDING_VERSION); fi

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
# The package tests of the Node binding (T3.25-1) on node --test: @polyspec/json resolves to packages/ts, whose generated entry
# loads the addon that binding-node-addon puts beside it.
test-js: binding-node-addon
	$(NODE) $(KIT)/runtime-targets.mjs test --runner node --roots packages/ts/tests -- --test-timeout=30000 --test-concurrency=1
test-php:
	$(NODE) $(KIT)/runtime-targets.mjs test --runner php --roots legacy/packages/php
test-python:
	PYTHONUNBUFFERED=1 NO_COLOR=1 PYTHON_COLORS=0 $(NODE) $(KIT)/runtime-targets.mjs test --runner python --roots legacy/packages/python --venv .venv
test-rust:
	$(NODE) $(KIT)/runtime-targets.mjs test --runner cargo --roots packages/rust -- -p polyspec-json -- --test-threads=1

# ---- Bindings: generated from packages/rust/interface.json by binding (C-0) ---------------------------------------------
# binding is the npm package @polyspec/binding of package.json, the asset of the GitHub Release of the tag that every
# dependency line on polyspec-binding-core names, so that the tool and the crate are one release (binding CK-20, CK-70).
# binding reads the crates of Cargo.lock with cargo metadata --locked --offline, which make install fetches
# (json-install-rust-packages). bindings writes the generated folders of the binding packages and the Go files
# zz_generated_*.go, which Git ignores; bindings-check runs the contract check, which also compares the tracked binding
# packages with what binding scaffold writes (binding L-2, CK-19).
BINDING := $(CURDIR)/node_modules/.bin/binding
.PHONY: bindings bindings-check lint-bindings test-bindings check-declarations binding-node-package test-binding-crates \
	test-binding-python test-binding-node test-binding-wasm test-binding-php test-binding-go json-install-bindings
# The binding packages are the released packages of the core (docs/spec/json-contract.md#transition), so the full suite runs
# the generated tests of each target of the contract, which hold the cases of contracts/core.json (binding G-5), on the
# standard runner of its language, each in its own target test-binding-<target>, against a build with the test features of
# its crate (binding GN-5): unittest against the installed wheel, node --test against the installed npm package and through
# its subpath ./wasm, PHPUnit with the extension loaded and go test with the static library. The job bindings of
# .github/workflows/ci-pipeline.yml runs them through kit-gates-bindings.
test-bindings: lint-bindings check-declarations test-binding-crates $(foreach target,$(BINDING_TARGETS),test-binding-$(target))
# The build script of ext-php-rs runs bindgen, which reads the libclang and the clang of the LLVM of config/toolchain.json:
# LLVM_ROOT of packages/release.mk, an LLVM that the machine provides (binding GN-19i); without that file bindgen finds them
# itself.
BINDING_LLVM = $(if $(LLVM_ROOT),LIBCLANG_PATH=$(LLVM_ROOT)/lib CLANG_PATH=$(LLVM_ROOT)/bin/clang)
# The build script of ext-php-rs runs again only when the env PHP, PHP_CONFIG or PATH changes, and var/tools/bin/php keeps its
# path when make install-tools wraps another PHP, so every cargo run that builds the extension passes the php-config beside
# the binary of $(PHP): a change of the PHP changes PHP_CONFIG and builds the extension for it again (T3.45).
BINDING_PHP = PHP_CONFIG=$(dir $(shell $(PHP) -r 'echo PHP_BINARY;'))php-config
# The lint and the tests of the binding crates, after make bindings writes their generated folders.
lint-bindings: bindings
	$(BINDING_PHP) $(BINDING_LLVM) $(CARGO) clippy --locked $(foreach crate,$(BINDING_CRATES),-p $(crate)) --all-targets -- -D warnings
test-binding-crates: bindings
	$(BINDING_PHP) $(BINDING_LLVM) $(CARGO) test --locked $(foreach crate,$(BINDING_CRATES),-p $(crate))
# The TypeScript compiler of package-lock.json checks the generated declarations of the Node binding and of its WASM binding.
check-declarations: bindings
	$(NODE) node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict packages/ts/generated/index.d.ts
	$(NODE) node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict packages/ts/wasm/generated/index.d.ts

# The tools of the job bindings beyond those of make install-tools: maturin and the wasm-bindgen CLI of mise.toml at the
# digests of mise.lock, the crates of Cargo.lock, and PHPUnit of legacy/packages/php/composer.lock (json-install-php), which
# runs the generated tests of the PHP extension until the legacy PHP package is removed.
json-install-bindings: json-install-rust-packages json-install-php json-install-suite
	$(ONLINE) $(KIT_TOOLS)/bin/mise install --locked github:PyO3/maturin github:wasm-bindgen/wasm-bindgen
MATURIN := $(KIT_TOOLS)/mise/shims/maturin
WASM_BINDGEN := $(KIT_TOOLS)/mise/shims/wasm-bindgen
GOFMT := $(KIT_TOOLS)/mise/shims/gofmt
# The PHP of PATH, whose php-config the build script of ext-php-rs reads: the PHP of .php-version that setup-php provides.
PHP ?= php
PHPUNIT := $(CURDIR)/legacy/packages/php/vendor/bin/phpunit
BINDING_VAR := $(CURDIR)/var/bindings
BINDING_DYLIB := $(if $(filter Darwin,$(shell uname -s)),dylib,so)
# The test features of a binding crate: every feature of its manifest (binding GN-5), joined by commas.
binding_features = $(shell sed -n '/^\[features\]/,/^\[/s/^\([a-z][a-z0-9-]*\) = .*/\1/p' $(1) | paste -sd, -)

# The wheel that maturin builds for the Python of mise.toml, installed into a virtual environment without an index, and
# the generated tests on unittest, which fails a run that ran no test.
test-binding-python: bindings
	$(PYTHON) -m venv --clear $(BINDING_VAR)/venv
	rm -rf $(BINDING_VAR)/wheels
	cd packages/python && $(MATURIN) build --locked --interpreter $(BINDING_VAR)/venv/bin/python --features $(call binding_features,packages/python/Cargo.toml) --out $(BINDING_VAR)/wheels
	$(BINDING_VAR)/venv/bin/python -m pip install -q --no-index --force-reinstall $(BINDING_VAR)/wheels/*.whl
	cd $(BINDING_VAR) && venv/bin/python -m unittest discover -s $(CURDIR)/packages/python/generated/tests -t $(CURDIR)/packages/python/generated/tests

# The npm package with the addon of this platform and the WASM module, packed and installed into var/bindings/node as a
# release packs them (binding GN-3c, GN-18, P-5): the addon is the platform package that a release names in
# optionalDependencies, and the module and its glue are what the wasm-bindgen of mise.toml writes into
# packages/ts/wasm/generated.
BINDING_PLATFORM := $(shell $(NODE) -p 'process.platform + "-" + process.arch + (process.platform === "linux" ? "-gnu" : "")' 2>/dev/null)
BINDING_ADDON := json.$(BINDING_PLATFORM).node
WASM_BINDGEN_RELEASE := $(shell sed -n 's/^wasm-bindgen = "=\(.*\)"$$/\1/p' packages/ts/wasm/Cargo.toml)
# The Node addon of the checkout beside packages/ts/generated/index.cjs, which loads it there: the package tests (make test-js)
# and the probe of the shared verifier take @polyspec/json from packages/ts.
binding-node-addon: bindings
	$(CARGO) build --locked -p polyspec-json-node --features $(call binding_features,packages/ts/Cargo.toml)
	cp target/debug/libpolyspec_json_node.$(BINDING_DYLIB) packages/ts/generated/$(BINDING_ADDON)
binding-node-package: binding-node-addon
	test "$$($(WASM_BINDGEN) --version)" = "wasm-bindgen $(WASM_BINDGEN_RELEASE)"
	$(CARGO) build --locked -p polyspec-json-wasm --target wasm32-unknown-unknown --features $(call binding_features,packages/ts/wasm/Cargo.toml)
	$(WASM_BINDGEN) --target web --out-dir packages/ts/wasm/generated --out-name json_wasm target/wasm32-unknown-unknown/debug/polyspec_json_wasm.wasm
	rm -rf $(BINDING_VAR)/node $(BINDING_VAR)/node-platform
	mkdir -p $(BINDING_VAR)/node $(BINDING_VAR)/node-platform
	cp target/debug/libpolyspec_json_node.$(BINDING_DYLIB) $(BINDING_VAR)/node-platform/$(BINDING_ADDON)
	$(NODE) -e 'const p = require("./packages/ts/package.json"); require("fs").writeFileSync("$(BINDING_VAR)/node-platform/package.json", JSON.stringify({ name: p.name + "-$(BINDING_PLATFORM)", version: p.version, os: [process.platform], cpu: [process.arch], main: "$(BINDING_ADDON)", files: ["$(BINDING_ADDON)"] }, null, 2) + "\n")'
	cd $(BINDING_VAR)/node-platform && $(NPM) pack --pack-destination $(BINDING_VAR)/node
	cd packages/ts && $(NPM) pack --pack-destination $(BINDING_VAR)/node
	echo '{ "private": true }' > $(BINDING_VAR)/node/package.json
	cd $(BINDING_VAR)/node && $(NPM) install --offline --no-audit --no-fund --omit=optional ./*.tgz

# The generated tests of the Node binding on node --test, against the installed package.
test-binding-node: binding-node-package
	cp packages/ts/generated/tests/generated.test.mjs $(BINDING_VAR)/node/generated.test.mjs
	cd $(BINDING_VAR)/node && $(NODE) --test generated.test.mjs

# The differential test of the two JavaScript implementations (docs/spec/json-contract.md#transition, V-6 (5)): the legacy
# package and the installed binding package parse the files of the supplementary suite and the official examples alike.
test-differential-js: binding-node-package
	@[ -n "$(JSON_TEST_SUITE)" ] || { echo "test-differential-js needs the supplementary suite: make json-install-suite" >&2; exit 2; }
	JSON_BINDING_NODE=$(BINDING_VAR)/node JSON_TEST_SUITE=$(abspath $(JSON_TEST_SUITE)) $(NODE) --test legacy/packages/js/tests/differential.mjs

# The generated tests of the WASM binding through the subpath ./wasm of the installed package (binding P-5); --expose-gc
# serves the generated tests that collect instances (binding GN-18a).
test-binding-wasm: binding-node-package
	cp packages/ts/wasm/generated/tests/generated.test.mjs $(BINDING_VAR)/node/generated.wasm.test.mjs
	cd $(BINDING_VAR)/node && $(NODE) --expose-gc --test generated.wasm.test.mjs

# The extension built with the test features against the PHP of PATH, its stub linted, and the generated tests on PHPUnit
# with the extension loaded; a run without a test or with a skipped test fails.
test-binding-php: bindings
	$(BINDING_PHP) $(BINDING_LLVM) $(CARGO) build --locked -p polyspec-json-php-ext --features $(call binding_features,packages/php-ext/Cargo.toml)
	$(PHP) -l packages/php-ext/generated/polyspec_json.stub.php
	$(PHP) -d extension=$(CURDIR)/target/debug/libpolyspec_json.$(BINDING_DYLIB) $(PHPUNIT) --fail-on-empty-test-suite --fail-on-skipped packages/php-ext/generated/tests

# The static library with the test features, which Go links through CGO_LDFLAGS, then gofmt, go vet and the generated tests
# on go test with the build tags of those features, polyspec_<feature> with _ for - (binding GN-5). The module has no go.work,
# and GOTOOLCHAIN=local is exported above.
BINDING_GO_FEATURES = $(call binding_features,packages/go/internal/ffi/Cargo.toml)
BINDING_GO_ENV = CGO_LDFLAGS=-L$(CURDIR)/target/debug GOWORK=off GOFLAGS=-tags=$(subst -,_,$(shell echo '$(BINDING_GO_FEATURES)' | sed 's/\([^,]*\)/polyspec_\1/g'))
test-binding-go: bindings
	$(CARGO) build --locked -p polyspec-json-go --features $(BINDING_GO_FEATURES)
	test -z "$$(cd packages/go && $(GOFMT) -l .)"
	cd packages/go && $(BINDING_GO_ENV) $(GO) vet ./...
	cd packages/go && $(BINDING_GO_ENV) $(GO) test -count=1 ./...
# bindings generates the five targets, each in its own target bindings-<target>, so that a target that binding does not
# generate fails with its name (binding GN-1c) and the other targets still run.
BINDING_TARGETS := php python node wasm go
BINDING_PHONY = $(foreach target,$(BINDING_TARGETS),bindings-$(target))
.PHONY: $(BINDING_PHONY)
bindings: $(BINDING_PHONY)
$(BINDING_PHONY):
	$(NODE) $(BINDING) generate --root $(CURDIR) --target $(@:bindings-%=%)
bindings-check:
	$(NODE) $(BINDING) check $(CURDIR)/packages/rust/interface.json

# ---- Release recipes of the bindings: packages/release.mk, which binding release-recipes writes (binding GN-19h) -----------
# The recipes of the platform assets (release-go-static, release-wheel, release-php-ext, release-npm-platform, release-npm,
# release-go-module, release-binding-check, release-platform-assets and install-wasm-bindgen) are the file that
# binding release-recipes writes for the contract; Git ignores it, and make release-recipes writes it again before a release
# runs a recipe, because no recipe of these targets is written by hand (CK-94). The file reads BINDING_RUN, NODE, NPM and UV,
# which this Makefile defines before the include; a checkout that has not written the file yet reads none of its targets.
BINDING_RUN := $(NODE) $(BINDING)
.PHONY: release-recipes
release-recipes:
	$(BINDING_RUN) release-recipes --root $(CURDIR)
-include packages/release.mk

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

# fmt-check checks that every crate of the workspace, the binding packages included, is in the form of rustfmt.
fmt-check:
	$(CARGO) fmt --all --check

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
	kit-gates-runtime-go kit-gates-runtime-rust kit-gates-runtime-php-ext kit-gates-bindings kit-ci-plan \
	ci-targets
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
kit-gates-runtime-ts: lint-ts
kit-gates-runtime-php: lint-php test-php
kit-gates-runtime-python: lint-python test-python
kit-gates-runtime-go: lint-go test-go
kit-gates-runtime-rust: lint-rust fmt-check test-rust
kit-gates-runtime-php-ext: lint-php-ext test-php-ext
# kit-gates-bindings runs in the job bindings, which installs the tools of every target of the contract.
kit-gates-bindings: lint-bindings check-declarations test-binding-crates test-binding-python test-binding-node test-binding-wasm test-binding-php test-binding-go test-differential-js test-js

# kit-ci-plan writes the fan-out of the pipeline, the jobs and runners of config/ci.json, to GITHUB_OUTPUT.
kit-ci-plan:
	$(NODE) $(KIT)/ci-setup.mjs --plan

# ci-targets runs TARGETS past failures and writes the logs, record.json and summary.md into CI_REPORT.
CI_REPORT ?= var/report/ci-targets
ci-targets:
	$(NODE) $(KIT)/ci-targets.mjs -k $(CI_REPORT) $(TARGETS)

# ---- CI: the one recipe of each job (tests/scripts/workflow-rules.test.mts) -------------------------------------------------
# Each job of .github/workflows/ci-pipeline.yml and .github/workflows/assets.yml has one run step, make ci-<job> with make
# variables as its only arguments, so a local run of a job is the call that CI makes, such as make ci-runtime RUNTIME=php. The
# recipe holds the order and the conditions of the job: the installs and the prerequisites first, each of which stops the job
# when it fails, then the checks through ci-targets, each to its end, then the cleanup of the CI context whenever its prepare
# started. The status of the job is that of its checks, or that of the prepare or the cleanup when one of them fails.
.PHONY: ci-plan ci-shared ci-verify ci-runtime ci-bindings ci-required ci-assets-platform ci-assets-php ci-assets-npm
# The checks of each job whose recipe runs them itself, the targets that it runs through ci-targets. The jobs shared and
# runtime are runs of ci-setup of kit (kit K1250): it installs the tools of the job of config/ci.json and runs its setup
# targets, stopping at the first failure, then prepares the context of the job when config/ci.json declares one, runs
# kit-gates-static or kit-gates-runtime-<runtime> with the targets that config/ci.json declares for the job through make -k
# ci-targets, every target to its end, and cleans up the context whenever its preparation ran.
CI_VERIFY_CHECKS := kit-gates-verify
CI_BINDINGS_CHECKS := kit-gates-bindings
# The plan job writes the plan of config/ci.json to GITHUB_OUTPUT: the runner of the other jobs and whether a runtime job runs.
ci-plan:
	$(MAKE) --no-print-directory kit-ci-plan
ci-shared:
	$(NODE) $(KIT)/ci-setup.mjs --job shared
ci-verify:
	$(MAKE) --no-print-directory install-tools TOOLS="go rust php composer python uv"
	$(MAKE) --no-print-directory json-install-verify
	$(MAKE) --no-print-directory ci-targets TARGETS="$(CI_VERIFY_CHECKS)"
# RUNTIME is a runtime of config/ci.json, which the matrix of the job runtime lists.
ci-runtime:
	@[ -n "$(RUNTIME)" ] || { echo "ci-runtime needs RUNTIME, a runtime of config/ci.json: make ci-runtime RUNTIME=php" >&2; exit 2; }
	$(NODE) $(KIT)/ci-setup.mjs --job runtime $(RUNTIME)
# The job bindings runs on ubuntu-26.04-arm, whose image holds the LLVM of config/toolchain.json at /usr/lib/llvm-<major>, the
# LLVM_ROOT that packages/release.mk reads for the build of the PHP extension.
ci-bindings:
	$(MAKE) --no-print-directory install-tools TOOLS="go php composer python uv"
	$(MAKE) --no-print-directory json-install-bindings
	$(MAKE) --no-print-directory release-recipes
	$(MAKE) --no-print-directory ci-targets TARGETS="$(CI_BINDINGS_CHECKS)"
# The judgement of the pipeline, which exists only in CI: RESULTS is the JSON of toJSON(needs). config/ci.json declares
# runtimes, so the plan selects every job of needs, and each has to succeed; a skipped job fails it.
ci-required:
	$(NODE) $(KIT)/ci-setup.mjs --required

# The jobs of .github/workflows/assets.yml. RELEASE=true, which the release workflow passes, runs the release check of binding
# before the builds. The builds run through ci-targets, each to its end, so one run names every asset that does not build;
# their report is var/report/ci-assets.
CI_ASSETS_REPORT := var/report/ci-assets
CI_RELEASE_CHECK = $(if $(filter true,$(RELEASE)),release-binding-check)
ci-assets-platform:
	$(MAKE) --no-print-directory json-install-rust-packages
	$(MAKE) --no-print-directory install-tools TOOLS="uv python"
	$(MAKE) --no-print-directory release-recipes
	$(MAKE) --no-print-directory ci-targets CI_REPORT=$(CI_ASSETS_REPORT) TARGETS="$(CI_RELEASE_CHECK) release-go-static release-wheel release-npm-platform"
# PHP_MINOR is the PHP minor that setup-php of the job selected; the build checks that the PHP on PATH is that minor. The job
# provisions the LLVM of config/toolchain.json before this recipe (binding GN-19i): the ubuntu-26.04 images hold it at
# /usr/lib/llvm-<major>, the default LLVM_ROOT of packages/release.mk, and on macOS install-llvm-action installs it and sets
# LLVM_PATH, which the build takes as LLVM_ROOT.
# install-llvm-action appends DYLD_LIBRARY_PATH and LD_LIBRARY_PATH with /usr/lib first to GITHUB_ENV, and the PHP of
# setup-php then loads the libsqlite3 of the system and aborts; the recipe and its sub-makes run with both empty, and the
# build reads LLVM through LLVM_ROOT alone.
ci-assets-php: DYLD_LIBRARY_PATH :=
ci-assets-php: LD_LIBRARY_PATH :=
ci-assets-php:
	@[ -n "$(PHP_MINOR)" ] || { echo "ci-assets-php needs PHP_MINOR, the PHP minor of the job: make ci-assets-php PHP_MINOR=8.4" >&2; exit 2; }
	$(MAKE) --no-print-directory json-install-rust-packages
	$(MAKE) --no-print-directory release-recipes
	$(MAKE) --no-print-directory ci-targets CI_REPORT=$(CI_ASSETS_REPORT) TARGETS="$(CI_RELEASE_CHECK) release-php-ext" PHP=php EXPECTED_PHP_MINOR=$(PHP_MINOR) $(if $(LLVM_PATH),LLVM_ROOT=$(LLVM_PATH))
ci-assets-npm:
	$(MAKE) --no-print-directory json-install-rust-packages
	$(MAKE) --no-print-directory release-recipes
	$(MAKE) --no-print-directory install-wasm-bindgen
	$(MAKE) --no-print-directory ci-targets CI_REPORT=$(CI_ASSETS_REPORT) TARGETS="$(CI_RELEASE_CHECK) release-npm"

# ---- Release: the steps of .github/workflows/release.yml, in its order (config/release.json) ---------------------------------
.PHONY: release-prepare release-tools release-tools-path release-tag release-tag-output release-assets release-candidate-assets release-publish release-undraft
# The release builds the released versions, so its Go runs without the go.work that link writes.
release-prepare release-tools release-tag release-assets release-candidate-assets release-publish release-undraft release-coverage: export GOWORK := off
# release-prepare: the Composer package of config/release.json, the PHP extension of packages/php-ext, requires no package, and
# release-assets packs it from the tagged commit with git archive, so the release installs nothing before release-tools.
release-prepare:
	@:
release-tools:
	$(ONLINE) $(NODE) $(KIT)/release-tools.mjs
# release-tools-path puts var/tools/bin and the shims on GITHUB_PATH and the environment of mise on GITHUB_ENV for the steps after it.
release-tools-path:
	@echo "$(KIT_TOOLS)/mise/shims" >> "$$GITHUB_PATH"
	@echo "$(KIT_TOOLS)/bin" >> "$$GITHUB_PATH"
	@for name in $(MISE_ENVIRONMENT); do echo "$$name=$$(printenv $$name)"; done >> "$$GITHUB_ENV"
# The jobs of .github/workflows/release.yml, one run step each (tests/scripts/workflow-rules.test.mts). ci-tag tags the commit of
# the CI run RUN, with AUTO=1 when a workflow_run started the release (GITHUB_EVENT_NAME, which the runner sets), and gives
# the later jobs the TAG and VERSION that release-tag wrote to GITHUB_ENV, through GITHUB_OUTPUT; both are empty when the run
# releases nothing.
.PHONY: ci-tag ci-release
ci-tag:
	$(MAKE) --no-print-directory release-tag $(if $(filter workflow_run,$(GITHUB_EVENT_NAME)),AUTO=1)
	@test -n "$$GITHUB_OUTPUT" || { echo 'ci-tag: GITHUB_OUTPUT is not set; run it in the release workflow' >&2; exit 2; }
	{ grep -E '^TAG=' "$$GITHUB_ENV" | tail -n 1 | sed 's/^TAG=/tag=/'; grep -E '^VERSION=' "$$GITHUB_ENV" | tail -n 1 | sed 's/^VERSION=/version=/'; } >> "$$GITHUB_OUTPUT"
# ci-release releases TAG in the order of config/release.json. The job downloads the assets of each platform into
# var/release/platform-assets before its run step, and the recipe merges them into var/release/assets after release-assets
# built the archives of the tag. The tools of var/tools are on the PATH that this Makefile exports, so no step puts them on
# GITHUB_PATH; binding makes the commit of the Go module with the identity of the actor of the run (GITHUB_ACTOR), as the tags
# of release-tag are.
ci-release:
	@command -v zip >/dev/null || { echo 'Info-ZIP is required for Composer release archives; install the zip package on the Ubuntu runner' >&2; exit 1; }
	@test -n "$$TAG" || { echo 'ci-release: TAG is required, for example make ci-release TAG=v0.0.1' >&2; exit 2; }
	$(MAKE) --no-print-directory release-prepare
	$(MAKE) --no-print-directory release-tools
	$(MAKE) --no-print-directory release-assets
	cp -R var/release/platform-assets/. var/release/assets/
	$(MAKE) --no-print-directory json-install-rust-packages
	$(MAKE) --no-print-directory install-tools TOOLS=go
	$(MAKE) --no-print-directory release-recipes
	GIT_AUTHOR_NAME="$$GITHUB_ACTOR" GIT_AUTHOR_EMAIL="$$GITHUB_ACTOR@users.noreply.github.com" GIT_COMMITTER_NAME="$$GITHUB_ACTOR" \
	GIT_COMMITTER_EMAIL="$$GITHUB_ACTOR@users.noreply.github.com" $(MAKE) --no-print-directory release-go-module
	$(MAKE) --no-print-directory release-publish
	$(MAKE) --no-print-directory release-platform-assets
	$(MAKE) --no-print-directory release-undraft TAG="$$TAG"
# release-tag tags the commit of the successful CI run RUN; AUTO=1 releases only the version commit of the top version.
release-tag:
	RELEASE_MAIN=origin/main $(NODE) $(KIT)/release-run.mjs tag "$$RUN"$(if $(AUTO), --auto)
# release-tag-output gives the later jobs of the release workflow the tag and the version that release-tag wrote into the
# environment of its job (TAG, VERSION), through the outputs of the step (GITHUB_OUTPUT); both are empty when the run releases
# nothing.
release-tag-output:
	@test -n "$$GITHUB_OUTPUT" || { echo 'release-tag-output: GITHUB_OUTPUT is not set; run it in the release workflow' >&2; exit 2; }
	printf 'tag=%s\nversion=%s\n' "$$TAG" "$$VERSION" >> "$$GITHUB_OUTPUT"
# release-assets builds into var/release/assets the zip polyspec-json-php-ext-X.Y.Z.zip of the Composer package of
# config/release.json, git archive of packages/php-ext at the tag, and packages.json, the Composer repository from which PIE
# installs polyspec/json; the assets of each platform join them from the job assets.
release-assets:
	@test -n "$$TAG" || { echo 'release-assets: TAG is required, for example make release-assets TAG=v0.0.1' >&2; exit 2; }
	RELEASE_ASSETS=var/release/assets $(ONLINE) $(NODE) $(KIT)/release.mjs assets "$$TAG"
# release-candidate-assets builds the same files from the committed HEAD at VERSION, without a tag, into var/release/assets.
release-candidate-assets:
	@test -n "$(VERSION)" || { echo 'release-candidate-assets: VERSION is required, for example make release-candidate-assets VERSION=0.0.1' >&2; exit 2; }
	RELEASE_ASSETS=var/release/assets $(NODE) $(KIT)/release.mjs candidate-assets "$(VERSION)"
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
# The hooks of json are its own files under .githooks, which HOOK_DECLARATION lists: commit-msg runs commit-msg-hook. make hooks
# points core.hooksPath at .githooks, makes each listed hook executable and declares the merge drivers of the changelogs and the
# checklists, which git runs as make twin-merge; make hooks-check fails while one of them is not installed (kit K1099).
.PHONY: hooks hooks-check commit-msg-hook
TWIN_MERGE_DRIVER := make --no-print-directory twin-merge MERGE="%O %A %B %P"
HOOK_DECLARATION := --hooks-path .githooks --hook commit-msg --merge 'CHANGELOG.md=kit-changelog' --merge 'CHANGELOG.ko.md=kit-twin' \
	--merge 'docs/plans/*/checklist.md=kit-checklist' --merge 'docs/plans/*/checklist.ko.md=kit-twin' \
	--driver 'kit-twin=$(TWIN_MERGE_DRIVER)' --driver 'kit-changelog=$(TWIN_MERGE_DRIVER)' --driver 'kit-checklist=$(TWIN_MERGE_DRIVER)'
hooks:
	$(NODE) $(KIT)/git-hooks.mjs install $(HOOK_DECLARATION)
hooks-check:
	$(NODE) $(KIT)/git-hooks.mjs check $(HOOK_DECLARATION)
# commit-msg-hook refuses a commit message with the footer or the identity of an AI tool; the hook commit-msg runs it.
commit-msg-hook:
	$(NODE) $(KIT)/check-commits.mjs --message $(MESSAGE) --rules commit-ai-footer,commit-ai-identity
# twin-merge is the merge driver of a Korean twin, a changelog and a checklist that git config names (merge.kit-*.driver).
twin-merge:
	@$(NODE) $(KIT)/twin-merge.mjs $(MERGE)
