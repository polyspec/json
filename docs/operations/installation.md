<!-- doc-id: installation -->
# Installation and execution

[한국어](installation.ko.md)

<a id="requirements"></a>
## Requirements and identifiers

| Component | Declared requirement | Current identifier | Metadata |
| --- | --- | --- | --- |
| JavaScript | Node.js >= 20, ESM | `@polyspec/ordered-json` | [package.json](https://github.com/polyspec/ordered-json/blob/main/packages/js/package.json) |
| Rust | Rust >= 1.71, edition 2021 | `polyspec-ordered-json` | [Cargo.toml](https://github.com/polyspec/ordered-json/blob/main/packages/rust/Cargo.toml) |
| Go | Go >= 1.22 | `github.com/polyspec/ordered-json/packages/go` module, `orderedjson` package | [go.mod](https://github.com/polyspec/ordered-json/blob/main/packages/go/go.mod) |
| PHP | PHP >= 8.2, JSON and PCRE extensions | `polyspec/ordered-json`, `Polyspec\OrderedJson` namespace | [composer.json](https://github.com/polyspec/ordered-json/blob/main/packages/php/composer.json) |
| Python | Python >= 3.14 | `polyspec-ordered-json`, `polyspec.ordered_json` import | [pyproject.toml](https://github.com/polyspec/ordered-json/blob/main/packages/python/pyproject.toml) |
| Native PHP | Matching PHP development headers, C compiler, phpize, make | `polyspec_ordered_json` extension | [extension source](https://github.com/polyspec/ordered-json/blob/main/packages/php-ext/src/ordered_json.c) |
| Repository checks | The pinned Python, Node.js, Rust, Go and npm releases, Git, make, PHP above | `make install`, `make check` | [verification](validation.md) |

The repository checks run with the exact releases that tracked files pin: Rust in `rust-toolchain.toml`, Node.js, Go and Python at the pins of `@polyspec/kit` in `mise.toml`, with Composer, uv and the tools of the lints and the dependency review, each locked by its digests in `mise.lock` (the `go` line of `packages/go/go.mod` names the same Go exactly), PHP by its minor release in `.php-version`, and npm at the version of `devEngines.packageManager` in `package.json`, with the digest of its tarball in `mise.lock`. A new checkout first runs `make install-tools TOOLS=npm`, which installs mise, the Node.js of `mise.toml` and that npm into `var/tools`, and `make install-packages`, which installs `package-lock.json` with it, the package `@polyspec/kit` of the shared tools included. `make install` then installs that Rust toolchain with rustup, and the tools of `mise.lock` with `mise install --locked` into `var/tools/mise` of the checkout (`make install-tools` of `@polyspec/kit`), which Git ignores and whose shims the Makefile puts first on `PATH`; no tool of the machine is used or changed. `make install-tools` installs every tool at its declaration, every target that runs a tool depends on it, and it fails with the expected and the actual version of each tool that differs. `GOTOOLCHAIN=local` and `RUSTUP_AUTO_INSTALL=0` keep go and rustup from downloading or installing another toolchain during a run, and every cargo command uses `--locked`.

The table lists declared minimum versions, not a claim that every minimum version was tested. Actual versions are recorded in the [records](validation.md#records) of the run that verifies a commit. JavaScript, Rust, Go and Python have no external runtime library dependencies.

<a id="checkout"></a>
## Source checkout

~~~sh
git clone https://github.com/polyspec/ordered-json.git
cd ordered-json
~~~

The clone contains every implementation package. Use the package directory or a published package when available. Registry installation and publication are not verified; see [distribution](distribution.md).

- JavaScript: import from `packages/js/index.js`. TypeScript declarations are in `packages/js/index.d.ts`.
- Rust: set a local Cargo dependency with `path` pointing to `packages/rust/`.
- Go: use a local `replace` for module `github.com/polyspec/ordered-json/packages/go` pointing to `packages/go/`.
- PHP: use `packages/php/` as a Composer path repository; Composer loads its classes by PSR-4 and its functions by `files`.
- Python: install the wheel asset of a release with pip, or put `packages/python/src` on the import path.

~~~sh
pip install "https://github.com/polyspec/ordered-json/releases/download/vX.Y.Z/polyspec_ordered_json-X.Y.Z-py3-none-any.whl"
~~~

<a id="release-assets"></a>
## Release assets

Each GitHub Release `vX.Y.Z` carries `polyspec-ordered-json-X.Y.Z.tgz`, `polyspec-ordered-json-php-X.Y.Z.zip`, `polyspec-ordered-json-php-ext-X.Y.Z.zip` and the wheel `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`. Each archive carries the manifest of its package unchanged: `package.json` of `packages/js/` and `composer.json` of `packages/php/` and `packages/php-ext/`, each with `version` X.Y.Z, without `repositories` and without `@dev`. The Python package ships only its wheel: pip installs the wheel asset URL shown in the install section above, and no git tag installs it.

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

The packages of this repository depend on no other package, so the repository has no npm workspaces and no private development manifest: the root `package.json` and `composer.json` declare the same packages as `packages/js/` and `packages/php/` for an install from a checkout, with the same `version` and no `repositories`. A consumer installs a release outside a checkout with its package manager: npm installs the release tarball `polyspec-ordered-json-X.Y.Z.tgz`, and Composer requires the PHP packages from the release zips of an artifact repository.

<a id="native-php"></a>
## Native PHP

Build against the PHP runtime that will load the extension, from the repository root:

~~~sh
make build-php-ext
~~~

`make build-php-ext` of kit builds the extension in a copy of `packages/php-ext` with phpize, after checking that the arginfo header, which `make php-ext-arginfo` writes from the stub, is that of the stub, and publishes `var/php-ext/polyspec_ordered_json.so`. A consumer builds and installs it with PIE (`polyspec/ordered-json-php-ext`). To load the module:

~~~sh
php -n -d extension="$PWD/var/php-ext/polyspec_ordered_json.so" script.php
~~~

`script.php` is any PHP script that uses the extension. `php -n` ignores php.ini; required built-in JSON and PCRE support must still be available. The source includes `config.w32`, but Windows and ZTS builds have not been verified. PIE requires its build tools, including `pkg-config`; on macOS the Homebrew package is `pkgconf`. See the [PIE artifact check](validation.md#pie) for the reproducible PIE build and shared verification procedure.

On macOS, configure preserves an explicit `MACOSX_DEPLOYMENT_TARGET` or derives the missing value from the active C compiler, including target flags in `CFLAGS`. The loadable bundle uses dynamic symbol lookup for modern targets and omits the unused dynamic-library single-module flag check.

The common PHP API and backend selection rules are defined in the [API contract](api.md#php). Rebuild the module after native source or PHP build configuration changes.
