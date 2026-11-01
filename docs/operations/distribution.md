<!-- doc-id: distribution -->
# Distribution

[한국어](distribution.ko.md)

<a id="state"></a>
## Observed state

The repository holds the five [implementation packages](repositories.md#ownership) in one revision. The GitHub releases and version tags are listed by `gh release list -R polyspec/ordered-json` and on the Releases page of the repository; no tracked file restates them. A `vX.Y.Z` release attaches the assets listed in [release assets](installation.md#release-assets); a Go module release, `packages/go/vX.Y.Z`, attaches none. A feature row marked `published` names its release tag and asset ([features](../features.md)), and `make evidence-check` checks that form offline.

The repository distributes through three channels: the GitHub release assets of a `vX.Y.Z` release (the npm tarball, the Composer zips of the PHP library and the PHP extension, and the Python wheel), the Rust crate `polyspec-ordered-json` by its git tag in `packages/rust/`, and the Go module `github.com/polyspec/ordered-json/packages/go` by its tag `packages/go/vX.Y.Z`. No release is published to a registry: npm, crates.io, Packagist and PyPI receive none, and no workflow publishes to one. Source checkout is the local distribution. PIE metadata and a passing PIE build establish local build compatibility, not a Packagist publication. The extension package is `polyspec/ordered-json-php-ext`; the PHP library is `polyspec/ordered-json`.

Source version strings do not establish a released artifact. No workflow publishes to a registry; hosted CI runs the full suite and the push gate ([hosted CI](validation.md#ci)), and the push of a tag creates the GitHub Release of the tag ([tag releases](#tag-release)). LICENSE files are not present.

<a id="source-publication"></a>
## Source publication

Run each changed package's required checks and commit the package with the common contract. Every change reaches `main` as a push of the checklist ([publishing main](validation.md#publish)):

~~~sh
git push origin HEAD:main
~~~

Hosted CI runs the gates of kit, the parity check and the tests, lints and PIE check of every runtime on the pull request and on every push to `main`, and a successful run of `ci` on `main` starts the release workflow. Verify a clean clone can build every package from the published revision. A shared contract change is published only with its verifier, fixtures, and affected packages in that same revision.

Keep authentication information in the system credential store. Keep publication observations separate from test results.

<a id="tag-release"></a>
## Tag releases

A release is a tag of a commit of `main` ([release procedure](../../AGENTS.md#release)): `vX.Y.Z` releases the npm package of `packages/js/` and the Composer packages of `packages/php/` and `packages/php-ext/` at version X.Y.Z, and the Python wheel of `packages/python/` at version X.Y.Z, and `packages/go/vX.Y.Z` releases the Go module `github.com/polyspec/ordered-json/packages/go`. The Python package is released as its wheel asset `polyspec_ordered_json-X.Y.Z-py3-none-any.whl` (`config/release.json`, kind `wheel`), not as a git tag. The Cargo package of `packages/rust/` is not released as an archive; it is consumed by git tag (`config/release.json`, mode `git-tag`), because `cargo package` rewrites git dependencies into crates.io requirements that do not resolve. The tags `vX.Y.Z` and `packages/go/vX.Y.Z` name the same commit; `make release-tag` creates both. The packages, the manifests with the way a tag releases each one, the manifests that no tag releases and the Go modules are declared in [config/release.json](../../config/release.json); `make release-coverage` requires every package file of the checkout to be classified there, and `make release-config-check` runs the step `versions` for the version that `packages/js/package.json` declares. A successful push run of `ci` on `main` starts `.github/workflows/release.yml` (`on: workflow_run`, permission `contents: write`), whose steps run the release targets of `@polyspec/kit` in this order and stop at the first failure:

~~~sh
make install-tools TOOLS=npm
make install-packages
make release-tag
make release-prepare
make release-tools
make release-tools-path
make release-assets
make release-publish
make release-undraft TAG="$TAG"
~~~

The workflow is the copy of `workflows/release.yml` of `@polyspec/kit`. `make install-tools TOOLS=npm` and `make install-packages` install npm and the package `@polyspec/kit`, whose targets the following steps run. `make release-tools` installs the tools that `config/release.json` needs (npm, the tools of `mise.lock` with the Python build backend, and Rust), and `make release-tools-path` puts `var/tools/bin` and the shims of mise on the `PATH` of the following steps and writes the environment of mise to `GITHUB_ENV`.

1. `make release-tag` requires a completed successful push or dispatch run of `ci` on `main` whose commit is on `origin/main`. Started by that run, the release workflow releases the top `## X.Y.Z` of the change log at the commit of the run when that commit is the version commit, or a later commit whose `## Unreleased` is empty while the version is untagged; `make release-tag` of `@polyspec/kit` decides it: it creates and pushes the tag `vX.Y.Z` and the tag `packages/go/vX.Y.Z` of the Go module at that commit. A version already tagged on the line of that commit releases nothing, and one tagged off it fails the run. It runs no test again.
2. The version is set by the version-bump commit `Release X.Y.Z`, which sets X.Y.Z in every manifest of `config/release.json` and renames `## Unreleased` of each changelog to `## X.Y.Z`; no make target checks it, and review judges it, as the [release procedure](../../AGENTS.md#release) states.
3. `make release-assets` builds `var/release/assets`: `polyspec-ordered-json-X.Y.Z.tgz` (`npm pack` of `packages/js/`), `polyspec-ordered-json-php-X.Y.Z.zip` and `polyspec-ordered-json-php-ext-X.Y.Z.zip` (`git archive` of `packages/php/` and `packages/php-ext/` of the tagged commit) and `polyspec_ordered_json-X.Y.Z-py3-none-any.whl` (the PEP 427 wheel of `packages/python/`, built with the pinned build backend of `pythonBackend` in `config/toolchain.json`, whose `Requires-Dist` holds only `name==version`): the release assets are npm tarballs, Composer zips and the wheel. The npm tarball keeps the name that `npm pack` gives it, a Composer zip is named by the label of its package, `<vendor>-<product>-<runtime>-<version>.zip` (PRINCIPLES P39), and the wheel keeps its PEP 427 name. Before it packs, every published manifest of the tagged commit must be in the standard form: a `composer.json` declares the version of the tag and no `repositories`, no constraint holds `@dev`, a `package.json` declares no `overrides` and no `file:`, `link:`, `workspace:`, URL or git dependency, and a dependency on a package of the same scope is one exact version. A zip has stored entries and the time of the tagged commit and is written with `TZ=UTC`, so the zip of a tree has the same bytes on every machine and at every time. After it packs, the manifest of each archive must equal the manifest of the tagged commit byte for byte; no step rewrites a manifest. A Go tag builds and attaches nothing.
4. `make release-publish` runs `gh release create <tag> --verify-tag --draft --title <tag> --notes-file <notes>` with the archives, so the release is a draft. GitHub refuses a release body over 125000 characters, so the notes are the section `## X.Y.Z` of `CHANGELOG.md` when it has at most 125000 characters, and otherwise the one line `The changes of X.Y.Z are listed in [CHANGELOG.md](https://github.com/polyspec/ordered-json/blob/<tag>/CHANGELOG.md#<anchor>).`, with the tag URL-encoded per path segment and the `<a id>` anchor of the section, or the version without its dots when the section has none.
5. `make release-undraft TAG="$TAG"` makes the release public after `make release-publish`; a failed step leaves the release a draft.

A consumer installs a release outside the repository with its package manager: npm installs the release tarball `polyspec-ordered-json-X.Y.Z.tgz`, and Composer requires the PHP packages from the release zips of an artifact repository. The Cargo package is installed by its git tag, the Python wheel from the release assets, and the Go module by its tag.

A successful push run of `ci` on `main` starts the workflow by itself; the maintainer can start it for a successful run of `ci` with `gh workflow run release.yml -f run=<run id>`. The tag reaches the steps through the environment variable `TAG`, which `make release-tag` writes.

<a id="releases"></a>
## Registry and release records

No release is published to a registry. Before recording a release, verify its package name, version, included files, channel, artifact, and tested source revision. Name the release asset in the feature row.

Update English and Korean distribution documents, feature distribution state, and the changelog when publication state changes. Do not infer publication from a test, version declaration, planned tag, or source push.
