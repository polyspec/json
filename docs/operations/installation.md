<!-- doc-id: installation -->
# Installation and execution

[한국어](installation.ko.md)

<a id="requirements"></a>
## Requirements and identifiers

| Component | Declared requirement | Current identifier | Metadata |
| --- | --- | --- | --- |
| JavaScript | Node.js, ESM and CommonJS; `package.json` declares no `engines`, and the releases are tested with the Node.js of `mise.toml` | `@polyspec/json` and the platform package of the machine | [package.json](https://github.com/polyspec/json/blob/main/packages/ts/package.json) |
| Rust | Rust >= 1.71, edition 2021 | `polyspec-json` | [Cargo.toml](https://github.com/polyspec/json/blob/main/packages/rust/Cargo.toml) |
| Go | Go >= 1.27.3 and cgo | the binding module `github.com/polyspec/json/packages/go`, released by the tag `packages/go/vX.Y.Z` | [go.mod](https://github.com/polyspec/json/blob/main/packages/go/go.mod) |
| PHP | PHP >= 8.4 and PIE | the binding extension `polyspec_json` of the PIE package `polyspec/json`, `Polyspec\Json` namespace | [composer.json](https://github.com/polyspec/json/blob/main/packages/php-ext/composer.json) |
| Python | Python >= 3.14 | `polyspec-json`, `polyspec.json` import | [pyproject.toml](https://github.com/polyspec/json/blob/main/packages/python/pyproject.toml) |
| Repository checks | The pinned Python, Node.js, Rust, Go and npm releases, Git, make, PHP above | `make install`, `make check` | [verification](validation.md) |

The repository checks run with the exact releases that tracked files pin: Rust in `rust-toolchain.toml`, Node.js, Go and Python at the pins of `@polyspec/kit` in `mise.toml`, with Composer, uv and the tools of the lints and the dependency review, each locked by its digests in `mise.lock` (the `go` line of `packages/go/go.mod` names the same Go exactly), PHP by its minor release in `.php-version`, and npm at the version of `devEngines.packageManager` in `package.json`, with the digest of its tarball in `mise.lock`. A new checkout first runs `make bootstrap`, which installs `package-lock.json`, `@polyspec/kit` included, with the npm release of `devEngines.packageManager`, run by `npm exec` outside the checkout, because the bootstrap of `make install-tools TOOLS=npm` is a file of the installed kit and an npm of another release refuses the checkout (`EBADDEVENGINES`). It then runs `make install-tools TOOLS=npm`, which installs mise, the Node.js of `mise.toml` and that npm into `var/tools`, and `make install-packages`, which installs `package-lock.json` with it, the package `@polyspec/kit` of the shared tools included. `make install` then installs that Rust toolchain with rustup, and the tools of `mise.lock` with `mise install --locked` into `var/tools/mise` of the checkout (`make install-tools`, which runs the installer of `@polyspec/kit`), which Git ignores and whose shims the Makefile puts first on `PATH`; no tool of the machine is used or changed. `make install-tools` installs every tool at its declaration, every target that runs a tool depends on it, and it fails with the expected and the actual version of each tool that differs. `GOTOOLCHAIN=local` and `RUSTUP_AUTO_INSTALL=0` keep go and rustup from downloading or installing another toolchain during a run, and every cargo command uses `--locked`.

The table lists declared minimum versions, not a claim that every minimum version was tested. Actual versions are recorded in the [records](validation.md#records) of the run that verifies a commit. JavaScript, Rust, Go and Python have no external runtime library dependencies.

<a id="checkout"></a>
## Source checkout

~~~sh
git clone https://github.com/polyspec/json.git
cd json
~~~

The clone contains every implementation package. Use the package directory or a published package when available. Registry installation and publication are not verified; see [distribution](distribution.md).

- JavaScript: `make binding-node-addon` builds the Node addon of the checkout beside `packages/ts/generated/index.cjs`, which loads it there; the package tests and the probe of the shared verifier take `@polyspec/json` from `packages/ts`. The legacy package `legacy/packages/js/` stays in the checkout until it is removed ([transition](../spec/json-contract.md#transition)).
- Rust: set a local Cargo dependency with `path` pointing to `packages/rust/`.
- Go: `make binding-go-library` builds the static library that the binding module `packages/go` links; the probe of the shared verifier, `packages/go/tests/probe`, links it, and the benchmark program `packages/go/tests/benchmark` links the release library of `make binding-go-release-library`; `make test-go` runs the package tests of `packages/go/tests` against the binding (T3.25-6).
- PHP: install the binding extension with PIE, `pie install polyspec/json`, which takes the pre-packaged binary of a release for the PHP minor and platform ([native PHP](#native-php)).
- Python: `make binding-python-package` builds the wheel of the binding and installs it in the venv `var/bindings/venv`. A consumer installs the wheel asset of a release for its platform with pip ([release assets](#release-assets)). The legacy package `legacy/packages/python/` stays in the checkout until it is removed.

~~~sh
pip install "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec_json-X.Y.Z-cp314-abi3-macosx_11_0_arm64.whl"
~~~

<a id="release-assets"></a>
## Release assets

The asset workflow builds non-PHP assets once on each native platform. Its independent PHP job covers every native platform and supported minor, selects one runtime, and runs `make ci-assets-php PHP_MINOR=${{ matrix.php }}`, whose recipe invokes `make release-php-ext PHP=php EXPECTED_PHP_MINOR=$(PHP_MINOR)` once. Artifacts `assets-${{ matrix.platform }}` and `assets-php-${{ matrix.platform }}-${{ matrix.php }}` remain distinct when release collects `assets-*`. Source assertions verify this wiring; native selection and full CI remain unverified until the expected-minor gate is published in binding, release recipes are regenerated and the native jobs pass.

A GitHub Release from v0.0.27 carries the assets of the binding packages of each platform: the npm package and its platform packages, the abi3 wheel, and the PHP extension of each platform for each PHP minor that `phpExtension.minors` of `config/toolchain.json` names, from the lower bound of the PHP range of `packages/php-ext/composer.json` ([transition](../spec/json-contract.md#transition)). From v0.0.29 it also carries `polyspec-json-php-ext-X.Y.Z.zip`, the Composer package `polyspec/json` of `packages/php-ext`, and `packages.json`, the Composer repository of the release. PIE installs the extension from that repository and downloads the build of its platform and PHP minor from the same release:

~~~sh
pie repository:add composer https://github.com/polyspec/json/releases/download/vX.Y.Z/packages.json
pie install polyspec/json:X.Y.Z
~~~

The three installs below were run against v0.0.35 on macOS arm64. No release is published to a registry, so each names the URL of a release asset.

npm (run with Node.js 26.12.0 and npm 12.2.0): the `package.json` of the consumer names `@polyspec/json` by the URL of its tarball and each platform package by its own. The manifest of `@polyspec/json` names no platform package, so without one `require("@polyspec/json")` fails with `Cannot find module './json.darwin-arm64.node'`; npm installs only the platform package of the `os` and `cpu` of the machine. Both `require` and `import` load the package.

~~~json
{
  "dependencies": {
    "@polyspec/json": "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec-json-X.Y.Z.tgz"
  },
  "optionalDependencies": {
    "@polyspec/json-darwin-arm64": "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec-json-darwin-arm64-X.Y.Z.tgz",
    "@polyspec/json-linux-arm64-gnu": "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec-json-linux-arm64-gnu-X.Y.Z.tgz",
    "@polyspec/json-linux-x64-gnu": "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec-json-linux-x64-gnu-X.Y.Z.tgz"
  }
}
~~~

npm 12 refuses a dependency of a URL with `EALLOWREMOTE` (`Fetching packages of type "remote" have been disabled`) unless the `.npmrc` of the project allows it:

~~~ini
allow-remote=root
~~~

npm 11 and older and the two Linux platform packages have not been verified.

Python (run with Python 3.14.8 and pip 26.2.1): pip installs the wheel of the platform by its URL, and the code imports `polyspec.json`. A release carries the wheels `cp314-abi3` of `macosx_11_0_arm64`, `manylinux_2_34_aarch64` and `manylinux_2_34_x86_64`; the consumer names the URL of its platform. The two `manylinux` wheels and an install with uv have not been verified.

~~~sh
pip install "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec_json-X.Y.Z-cp314-abi3-macosx_11_0_arm64.whl"
~~~

PIE (run with PIE 1.4.10): the two commands above. A release carries six binaries of the extension, PHP 8.4 and 8.5 for `arm64-darwin`, `arm64-linux-glibc` and `x86_64-linux-glibc`, each NTS; it carries none for ZTS, musl, `x86_64-darwin` or Windows. `pie download`, which `make release-pie-check` runs, took the binary of PHP 8.4.27 and of PHP 8.5.10 on macOS arm64, and PHP loaded each; `pie install` itself and the Linux binaries have not been verified.

The releases up to v0.0.25 carried the archives of the legacy packages, `polyspec-ordered-json-X.Y.Z.tgz`, `polyspec-ordered-json-php-X.Y.Z.zip`, `polyspec-ordered-json-php-ext-X.Y.Z.zip` and the wheel `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`; json has no pure PHP library since the removal of `legacy/packages/php` (T3.25-3).


The packages of this repository depend on no other package, so the repository has no npm workspaces. The root `package.json` declares the same package as `legacy/packages/js/` for an install from a checkout, with the same `version` and no `repositories`, and the root `composer.json` is the private development manifest `polyspec/json-development`, which installs PHPUnit for the PHP tests (T3.25-3). A consumer installs a release outside a checkout from the assets of the release, as this section shows.

<a id="native-php"></a>
## Native PHP

A consumer installs the binding extension with PIE, which takes the pre-packaged binary that the release built for the PHP minor, the platform and the thread-safety configuration of the PHP that runs it ([release assets](#release-assets) names the repository of a release and its binaries):

~~~sh
pie install polyspec/json
~~~

From a checkout, build the library of the extension against the PHP on `PATH`, from the repository root, and load it:

~~~sh
make binding-php-ext-library
php -n -d extension="$PWD/target/debug/libpolyspec_json.dylib" script.php
~~~

`script.php` is any PHP script that uses the extension; on Linux the library is `libpolyspec_json.so`. `make binding-php-ext-library` builds with the test features of the binding, as the tests load it; `make binding-php-ext-release-library` builds the release library under `target/release`. Windows and ZTS builds have not been verified.

The common PHP API and backend selection rules are defined in the [API contract](api.md#php). Rebuild the module after native source or PHP build configuration changes.
