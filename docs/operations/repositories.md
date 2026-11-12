<!-- doc-id: repositories -->
# Repository contract

[한국어](repositories.ko.md)

<a id="ownership"></a>
## Ownership

The repository owns the JSON specification, official inputs and expected results, shared verifier, implementation declaration `config/implementations.json`, aggregate verification records, and all implementation source. Each package directory owns its source, adapter, package metadata, documentation, and package build configuration within the same Git revision. The package directories are `packages/ordered-json-<language>`, with the language `npm`, `php`, `php-ext`, `python`, `rust` or `go`, in the same layout as the other polyspec repositories.

| Package | Checkout path | Implementation |
| --- | --- | --- |
| common | . | Contract, fixtures, verification and implementation declaration |
| javascript | legacy/packages/js | JavaScript |
| rust | packages/rust | Rust |
| go | legacy/packages/go | Go |
| php | legacy/packages/php | Pure PHP and the PHP Value API |
| php-extension | legacy/packages/php-ext | Native PHP extension |
| python | legacy/packages/python | Python |

The repository records one revision for the common contract and all implementations. The implementation directories do not contain nested Git repositories. Pure PHP and the extension retain separate package metadata and build processes, but their source changes are reviewed and verified in the same repository revision. The native implementation is tested against the PHP Value API in that same revision.

<a id="verification"></a>
## Shared verification

Official inputs and expected results exist only at the repository root. Probes return the shared reporting protocol and contain no independent goldens. `config/implementations.json` declares the implementations with their package directories, and the verifier (`scripts/registry.mts`) holds the build, probe and runtime version commands of each; every tool of the repository takes the directory of a package from that declaration. Shared cases verify the JSON contract through the probes and do not reach language-specific APIs, which their own package tests cover. Each implementation runs its own package tests with the native runner of its language (`make test-<language>`). Adding a language must not require changing the JSON comparison algorithm.

Every value a verification record carries must have something to compare it with: the repository's current state, or an expected value the repository declares. Source and package hashes are compared with the working tree. Inputs that come from outside, the PIE tool and the supplementary suite, are pinned in [external inputs](../../external-inputs.json), and a record that names one must match its pin. A value with neither comparison is not evidence and is not recorded. A linked module carries a fresh identifier and signature, so no rebuild reproduces its hash; the record names the artifact the registry declares by path alone.

Each package check runs against the verifier and fixtures in the same checkout. The aggregate record identifies the repository revision, implementation paths, runtimes, and results. The aggregate check verifies every implementation of `config/implementations.json` from the same working tree and rejects an incomplete package or missing declared build command.

Each verification run, aggregate check, selected check, PIE check, benchmark, or comparison, builds in its own temporary run directory and removes it when the run ends. Built probes are written to that directory. An implementation that declares `buildInCopy` is built from a copy of its package directory's tracked and unignored source files in that directory, and its commands use the copy; the copy rejects a symbolic link. Two runs of one checkout therefore never clean, configure, or replace each other's build output, and a build leaves no output in the checkout. A record names the declared artifact by its path relative to the run directory, which has the repository layout.

<a id="documents"></a>
## Documents and changes

Each package has its own English documents and Korean translations. Shared contracts and aggregate feature state are referenced from implementation documents. `config/documents.json` selects the documents of the common root and of every package, and `make docs-check` checks them together.

For a shared contract change, update the verifier, affected implementations, and conformance fixtures in one change, run package and aggregate checks, then publish the resulting repository revision. Test success and source or package publication remain separate observations.

<a id="php-extension"></a>
## PHP extension package

The PHP library uses Composer package `polyspec/ordered-json`. The extension uses the distinct PIE package `polyspec/ordered-json-php-ext`, type `php-ext`, extension name `polyspec_ordered_json`, and build path `src`. Its configuration enables a standalone extension build by default. The PHP library is a test dependency, not a native build or PIE package dependency.

On macOS, configure preserves an explicit `MACOSX_DEPLOYMENT_TARGET` or obtains the missing value from the active C compiler's deployment target. The extension is a loadable bundle; configure uses Libtool's `LT_MULTI_MODULE` option to omit the unnecessary dynamic-library single-module flag check. Modern macOS targets use dynamic symbol lookup. Ordinary and PIE builds must complete without the obsolete `-single_module` and `-undefined suppress` warnings.

PIE package recognition, a local PIE build, and the shared JSON check against the PIE-built artifact must succeed before recording PIE compatibility. A local build does not establish Packagist publication, a released version, Windows binary availability, or installation into a user's PHP configuration. The [PIE maintainer contract](https://github.com/php/pie/blob/1.4.10/docs/extension-maintainers.md) defines package metadata and build behavior.

<a id="state"></a>
## Implementation state

The six implementation packages are maintained in this repository. [Feature state](../features.md) records completion and evidence separately from this contract.
