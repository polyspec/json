<!-- doc-id: installation -->
# Installation and execution

[한국어](installation.ko.md)

<a id="requirements"></a>
## Requirements and identifiers

| Component | Declared requirement | Current identifier | Metadata |
| --- | --- | --- | --- |
| JavaScript | Node.js >= 20, ESM | `@polyspec/ordered-json` | [package.json](https://github.com/polyspec/json/blob/main/packages/js/package.json) |
| Rust | Rust >= 1.71, edition 2021 | `polyspec-json` | [Cargo.toml](https://github.com/polyspec/json/blob/main/packages/rust/Cargo.toml) |
| Go | Go >= 1.22 | `github.com/polyspec/ordered-json/packages/go` module, `orderedjson` package | [go.mod](https://github.com/polyspec/json/blob/main/packages/go/go.mod) |
| PHP | PHP >= 8.4 and PIE | the binding extension `polyspec_json` of the PIE package `polyspec/json`, `Polyspec\Json` namespace | [composer.json](https://github.com/polyspec/json/blob/main/packages/php-ext/composer.json) |
| Python | Python >= 3.14 | `polyspec-ordered-json`, `polyspec.ordered_json` import | [pyproject.toml](https://github.com/polyspec/json/blob/main/packages/python/pyproject.toml) |
| Repository checks | The pinned Python, Node.js, Rust, Go and npm releases, Git, make, PHP above | `make install`, `make check` | [verification](validation.md) |

The repository checks run with the exact releases that tracked files pin: Rust in `rust-toolchain.toml`, Node.js, Go and Python at the pins of `@polyspec/kit` in `mise.toml`, with Composer, uv and the tools of the lints and the dependency review, each locked by its digests in `mise.lock` (the `go` line of `legacy/packages/go/go.mod` names the same Go exactly), PHP by its minor release in `.php-version`, and npm at the version of `devEngines.packageManager` in `package.json`, with the digest of its tarball in `mise.lock`. A new checkout first runs `make bootstrap`, which installs `package-lock.json`, `@polyspec/kit` included, with the npm release of `devEngines.packageManager`, run by `npm exec` outside the checkout, because the bootstrap of `make install-tools TOOLS=npm` is a file of the installed kit and an npm of another release refuses the checkout (`EBADDEVENGINES`). It then runs `make install-tools TOOLS=npm`, which installs mise, the Node.js of `mise.toml` and that npm into `var/tools`, and `make install-packages`, which installs `package-lock.json` with it, the package `@polyspec/kit` of the shared tools included. `make install` then installs that Rust toolchain with rustup, and the tools of `mise.lock` with `mise install --locked` into `var/tools/mise` of the checkout (`make install-tools`, which runs the installer of `@polyspec/kit`), which Git ignores and whose shims the Makefile puts first on `PATH`; no tool of the machine is used or changed. `make install-tools` installs every tool at its declaration, every target that runs a tool depends on it, and it fails with the expected and the actual version of each tool that differs. `GOTOOLCHAIN=local` and `RUSTUP_AUTO_INSTALL=0` keep go and rustup from downloading or installing another toolchain during a run, and every cargo command uses `--locked`.

The table lists declared minimum versions, not a claim that every minimum version was tested. Actual versions are recorded in the [records](validation.md#records) of the run that verifies a commit. JavaScript, Rust, Go and Python have no external runtime library dependencies.

<a id="checkout"></a>
## Source checkout

~~~sh
git clone https://github.com/polyspec/json.git
cd json
~~~

The clone contains every implementation package. Use the package directory or a published package when available. Registry installation and publication are not verified; see [distribution](distribution.md).

- JavaScript: import from `legacy/packages/js/index.js`. TypeScript declarations are in `legacy/packages/js/index.d.ts`.
- Rust: set a local Cargo dependency with `path` pointing to `packages/rust/`.
- Go: use a local `replace` for module `github.com/polyspec/ordered-json/packages/go` pointing to `legacy/packages/go/`.
- PHP: install the binding extension with PIE, `pie install polyspec/json`, which takes the pre-packaged binary of a release for the PHP minor and platform ([native PHP](#native-php)).
- Python: install the wheel asset of a release with pip, or put `legacy/packages/python/src` on the import path.

~~~sh
pip install "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec_ordered_json-X.Y.Z-py3-none-any.whl"
~~~

<a id="release-assets"></a>
## Release assets

The asset workflow builds non-PHP assets once on each native platform. Its independent PHP job covers every native platform and supported minor, selects one runtime, and runs `make ci-assets-php PHP_MINOR=${{ matrix.php }}`, whose recipe invokes `make release-php-ext PHP=php EXPECTED_PHP_MINOR=$(PHP_MINOR)` once. Artifacts `assets-${{ matrix.platform }}` and `assets-php-${{ matrix.platform }}-${{ matrix.php }}` remain distinct when release collects `assets-*`. Source assertions verify this wiring; native selection and full CI remain unverified until the expected-minor gate is published in binding, release recipes are regenerated and the native jobs pass.

A GitHub Release from v0.0.27 carries the assets of the binding packages of each platform: the npm package and its platform packages, the abi3 wheel, and the PHP extension of each platform for each PHP minor that `phpExtension.minors` of `config/toolchain.json` names, from the lower bound of the PHP range of `packages/php-ext/composer.json` ([transition](../spec/json-contract.md#transition)). From v0.0.29 it also carries `polyspec-json-php-ext-X.Y.Z.zip`, the Composer package `polyspec/json` of `packages/php-ext`, and `packages.json`, the Composer repository of the release. PIE installs the extension from that repository and downloads the build of its platform and PHP minor from the same release:

~~~sh
pie repository:add composer https://github.com/polyspec/json/releases/download/vX.Y.Z/packages.json
pie install polyspec/json:X.Y.Z
~~~
 Each GitHub Release `vX.Y.Z` up to v0.0.25 carries `polyspec-ordered-json-X.Y.Z.tgz`, `polyspec-ordered-json-php-X.Y.Z.zip`, `polyspec-ordered-json-php-ext-X.Y.Z.zip` and the wheel `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`. Each archive carries the manifest of its package unchanged: `package.json` of `legacy/packages/js/` and `composer.json` of `legacy/packages/php/` and `legacy/packages/php-ext/`, each with `version` X.Y.Z, without `repositories` and without `@dev`. The Python package ships only its wheel: pip installs the wheel asset URL shown in the install section above, and no git tag installs it.

npm installs the tarball by its path:

~~~sh
mkdir app && cd app
npm init -y
npm install ./polyspec-ordered-json-X.Y.Z.tgz
~~~

Composer installs the zips from an artifact repository, a directory that holds them. With the zips in `assets/` next to `composer.json`:

~~~json
{
  "repositories": [
    {"type": "artifact", "url": "assets"},
    {"packagist.org": false}
  ],
  "require": {"polyspec/ordered-json": "X.Y.Z"}
}
~~~

~~~sh
composer install
~~~

Composer reads both zips. It does not install `polyspec/ordered-json-php-ext`, a package of the type `php-ext`; PIE builds and installs it ([native PHP](#native-php)).

The packages of this repository depend on no other package, so the repository has no npm workspaces. The root `package.json` declares the same package as `legacy/packages/js/` for an install from a checkout, with the same `version` and no `repositories`, and the root `composer.json` is the private development manifest `polyspec/json-development`, which installs PHPUnit for the PHP tests (T3.25-3). A consumer installs a release outside a checkout with its package manager: npm installs the release tarball `polyspec-ordered-json-X.Y.Z.tgz`, and Composer requires the PHP packages from the release zips of an artifact repository.

<a id="native-php"></a>
## Native PHP

A consumer installs the binding extension with PIE, which takes the pre-packaged binary that the release built for the PHP minor, the platform and the thread-safety configuration of the PHP that runs it:

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
