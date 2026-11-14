<!-- doc-id: development -->
<!-- source-sha256: 6de8b26923ed09aef679a4146b5200328bd89c9999e7de5277fde00254a8b24b -->
# Development procedure

[English](AGENTS.md)

모든 polyspec 저장소의 작업 원칙은 [PRINCIPLES.ko.md](PRINCIPLES.ko.md)에 있습니다. 이 문서는 이 저장소의 규칙만 정하며, 각 규칙은 `Enforced by:` 줄이 붙은 목록 항목입니다.

<a id="workflow"></a>
## Required workflow

- Own: 수정 전에 [documentation management](docs/operations/documentation-plan.ko.md), 관련 [specification](docs/spec/json-contract.ko.md), [feature state](docs/features.ko.md)를 읽습니다. 동작을 변경하기 전에 명세를 갱신합니다. 코드 변경에는 관련 문서, 기능 상태, 변경 기록을 함께 포함합니다.
  Enforced by: `make docs-check`
- Own: 개인 선호, 대화 맥락, credential, backup 위치는 Git 밖에 둡니다.
  Enforced by: none, 추적 파일이 개인 선호를 담는지는 판단 사항입니다.

<a id="feature-state"></a>
## Feature state

- Own: [Feature state](docs/features.ko.md)는 이 저장소의 기능 기록입니다. 각 기능 행의 Implementation 칸은 상태 하나를 가집니다: `implemented`(나열된 동작이 존재함), `partial`(구현 진행 중), `planned`(구현 시작 전), `shared-suite`(공통 JSON 테스트), `package-tests`(구현 자체의 테스트), `docs-tests`(문서 검사 테스트), `benchmark`(벤치마크 절차와 커밋된 결과), `source-only`(확인된 배포) 또는 `published`(행이 이름을 적은 release tag와 asset).
  Enforced by: `make evidence-check`
- Own: 상태는 Implementation 칸에서만 유효합니다. `scripts/check-evidence.mts`는 `docs/features.md`나 그 번역의 다른 곳에 적힌 상태를 실패로 처리하고, 기능 표가 없는 기록과 ID가 `F-...` 기능 ID가 아닌 행을 거부합니다.
  Enforced by: `make evidence-check`
- Own: 각 상태는 그것을 뒷받침하는 기록을 이름으로 가리킵니다. `shared-suite`, `package-tests`, `docs-tests`는 commit을 검증한 실행의 [records](docs/operations/validation.ko.md#records)이고, `benchmark`는 [benchmark result](benchmarks/results.json)입니다. 벤치마크 결과는 workload가 선언한 절차와 입력으로 clean checkout에서 측정했을 때에만 근거가 됩니다.
  Enforced by: `make evidence-check`

<a id="generated-files"></a>
## Generated files

- Own: 생성 파일은 Git에 추적하지 않습니다. 여기에는 의존성 설치(`node_modules/`, `vendor/`, virtual environment), 빌드 산출물(`dist/`, `target/`, `*.tsbuildinfo`), 캐시(`.cache/`, `__pycache__/`, `.pytest_cache/`), 테스트 실행 산출물(`test-results/`, `playwright-report/`, PHPUnit 캐시)과 도구 다운로드(`var/`)가 포함됩니다. 각 `.gitignore`가 이 경로를 덮으며, 새 generator는 같은 commit에서 ignore 항목을 추가합니다.
  Enforced by: `make layout-check`
- Own: 생성 파일 가운데 추적하는 것은 다음뿐입니다: lock 파일(`package-lock.json`, `composer.lock`, `Cargo.lock`, uv lock, `mise.lock`), 이 파일이 이름을 적은 commit된 생성 문서, 그리고 테스트 fixture.
  Enforced by: `make layout-check`

<a id="checklist"></a>
## Execution checklist

- Own: [실행 체크리스트](docs/plans/execution/checklist.ko.md)는 검사, 도구, CI처럼 제품 기능이 아닌 이 저장소의 작업을 추적합니다. 각 작업은 ID `T<wave>.<task>`를 가진 행입니다. 새 문제는 새 작업을 받고, 완료된 작업과 관련된 문제는 다음 파생 ID(`T1.1-1`)를 가진 하위 항목을 받습니다.
  Enforced by: `make docs-check`
- Own: push는 `[~]` 작업이 없을 때만 합니다.
  Enforced by: none, 검토에서 판단합니다.
- Own: `make check`는 kit의 ci-targets로 `CHECK_TARGETS`의 모든 target을 실패 뒤에도 끝까지 실행하고, 각 전체 실행의 report를 `var/report/full-run`에 씁니다.
  Enforced by: `make check`

<a id="verification"></a>
## Required checks

- Own: 개발 중에는 unit test만 실행합니다. 바뀐 패키지의 native test나, `make json-test-scripts TESTS=<file>`의 tool test를 실행합니다. `make verify-<language>`는 한 구현을 빌드하고 공통 사례를 그 probe에 보내며, 기록을 쓰지 않습니다.
  Enforced by: none, review에서 판단합니다.
- Own: 전체 suite(`make check`)와 end-to-end 검사(`make pie-check`, `make owner-check`, adapter suite, 보충 suite)는 모든 pull request와 `main`에 대한 모든 push마다 hosted CI가 실행합니다. commit이나 push 전 로컬 실행을 요구하는 규칙은 없으며, 수정할 때마다 더 넓은 검사를 다시 실행하라는 규칙도 없습니다.
  Enforced by: `make ci-targets`
- Own: 모든 commit은 `.githooks`의 commit-msg hook을 실행하며, 이 hook은 AI 도구의 footer나 identity를 담은 message를 거부합니다. commit message는 commit하는 사람 외에 어떤 도구나 작성자도 적지 않기 때문입니다. `make hooks`는 `core.hooksPath`를 `.githooks`로 지정하고, hook을 실행 가능하게 만들며, changelog와 checklist의 merge driver를 선언합니다. checkout은 첫 설치 뒤에 그것을 한 번 실행합니다.
  Enforced by: none, review에서 판단합니다. checkout의 hook은 CI job이 보지 못하는 그 checkout의 로컬 Git 설정이며, `make hooks-check`는 hook이 없는 checkout을 알려 줍니다.
- Own: 모든 추적 경로는 [config/owner-checks.json](config/owner-checks.json)의 규칙이 소유합니다. `make owner-validate`는 어떤 규칙도 맞지 않는 경로, 어떤 path도 맞지 않는 glob, 존재하지 않는 owner가 있으면 실패합니다. 새 파일은 같은 commit에서 매핑합니다.
  Enforced by: `make layout-check`
- Own: 다른 target의 기록을 읽는 target은 그 target을 prerequisite로 적어 자기 tree의 기록만 읽습니다. `make verify-all`은 `make pie-check`의 PIE 기록을 검사하므로 그것을 먼저 실행하고, `pie-check`는 `CHECK_TARGETS`의 독립 target이 아닙니다.
  Enforced by: `make json-test-scripts`
- Own: Makefile의 `CHECK_TARGETS`의 각 target은 `.github/workflows/ci-pipeline.yml`의 정확히 한 job의 target(`kit-gates-static`, `kit-gates-verify`, `kit-gates-runtime-<runtime>`)의 prerequisite이며, 그 job은 이 target을 이름으로 `make ci-targets`로 실패 뒤에도 끝까지 실행하고 보고서를 업로드합니다.
  Enforced by: `make json-test-scripts`
- Own: 각 언어의 lint가 통과합니다: `make lint-rust`(`-D warnings`의 clippy), `make lint-go`(`.golangci.yml`의 golangci-lint와 deadcode), `make lint-php`(`phpcs.xml.dist`의 phpcs와 PHPStan), `make lint-python`(`ruff.toml`의 ruff와 vulture).
  Enforced by: `make ci-targets`
- Own: PHP extension은 native 코드가 바뀌면 다시 빌드합니다. 오래된 binary나 이전 실행의 결과를 바뀐 코드의 검증으로 취급하지 않습니다.
  Enforced by: `make test-php-ext`
- Own: 검증 결과나 source hash를 검사를 통과시키려고 편집하지 않습니다. `var/records/`의 기록은 그것을 검증한 실행이 쓰며 commit하지 않습니다.
  Enforced by: `make layout-check`

<a id="implementations"></a>
## Implementations and shared cases

- Own: [config/implementations.json](config/implementations.json)은 구현을 선언하며, 이 저장소의 언어 집합에 대한 단일 출처입니다. 각 구현의 디렉터리도 여기에 적습니다. 새 언어는 공통 JSON 비교 알고리즘을 바꾸지 않고 `config/implementations.json`, `scripts/registry.mts`의 명령, 패키지 디렉터리에 추가합니다.
  Enforced by: `make json-test-scripts`
- Own: 각 구현은 자기 언어의 native runner로 자기 패키지 테스트를 실행합니다: `make test-js`, `make test-rust`, `make test-go`, `make test-php`, `make test-php-ext`, `make test-python`.
  Enforced by: `make ci-targets`
- Own: 한 패키지만 제공하는 API는 그 패키지에서 테스트합니다. 공통 사례는 JSON 계약을 검사하며 언어별 API에 닿을 수 없습니다.
  Enforced by: none, 검토에서 판단합니다. 공통 사례는 JSON 계약에만 닿습니다.
- Own: 모든 언어 probe는 [official.json](examples/official.json)과 [scripts/verify.mts](scripts/verify.mts)를 사용합니다. 공통 사례는 그 파일이나 `contracts/fixtures/` 아래에 추가합니다. 언어별 예제나 기대 결과는 만들지 않습니다.
  Enforced by: `make verify-all`
- Own: 계약 변경은 하나의 저장소 revision에서 verifier와 영향받는 패키지를 함께 갱신합니다. [repository contract](docs/operations/repositories.ko.md)를 참조합니다.
  Enforced by: `make verify-all`

<a id="release"></a>
## Release

- Own: release는 `main`의 commit에 붙인 tag이며, 그 commit의 `ci` workflow 실행은 job `kit / required`가 통과한 성공으로 끝났어야 합니다. tag는 release workflow가 만들며, 손으로 tag를 만들거나 옮기거나 push하지 않습니다.
  Enforced by: `make release-tag`
- Own: version-bump commit `Release X.Y.Z`는 저장소의 모든 manifest에 version을 설정하며, 각 changelog의 `## Unreleased`를 `## X.Y.Z`로 바꿉니다.
  Enforced by: none; 검토에서 판단합니다.
- Own: Go tag `legacy/packages/go/vX.Y.Z`는 같은 commit에 `vX.Y.Z`와 함께 만들어집니다.
  Enforced by: `make release-tag`
- Own: `main`에서 `ci` workflow 실행이 성공하면 `.github/workflows/release.yml`이 실행되며, 이 workflow는 그 실행의 commit이 version commit이거나, version에 tag가 없고 `## Unreleased`가 비어 있는 그 뒤의 commit일 때 그 commit에 최상위 `## X.Y.Z`를 릴리스합니다.
  Enforced by: `make release-tag`
- Own: tag push 뒤 모든 manifest에 tag의 version이 있고 `CHANGELOG.md`에 `## X.Y.Z` 절이 있으며, 그다음 release.yml이 archive와 Python wheel을 빌드하고 GitHub Release를 만듭니다.
  Enforced by: none, 검토에서 판단합니다.
- Own: 다른 저장소의 패키지를 고정하는 패키지는 GitHub에 실제로 존재하는 tag만 이름으로 적습니다. 고정은 그 tag를 push한 뒤에 씁니다.
  Enforced by: none, 검토에서 판단합니다.
- Own: release 뒤 저장소에는 로컬과 원격 모두 branch `main`만 있습니다. `v1/rust-core` 같은 개발 line은 그 release를 위해 `main`에 병합된 뒤 그 worktree, 그리고 `main` 곁의 다른 모든 branch와 함께 지워집니다. release 뒤에 남은 branch는 어떤 release도, `main`의 어떤 CI 실행도 다루지 않는 commit을 담기 때문입니다.
  Enforced by: none, 검토에서 판단합니다.

<a id="tools"></a>
## Shared tools

- Own: 모든 polyspec 저장소가 공유하는 도구는 `package-lock.json`에 고정된 devDependency 패키지 `@polyspec/kit`입니다. Makefile은 이 저장소의 모든 recipe를 가지며, 설치된 패키지의 유틸리티(`node_modules/@polyspec/kit/dist`)를 명시적 인자로 실행합니다. kit의 recipe는 include하지 않습니다. 도구의 설정은 각 도구의 파일에 있습니다: `.npmrc`, `mise.toml`의 `[settings]`와 `[env]`, root의 lint 설정, root `Cargo.toml`의 `[workspace.lints]`. `PRINCIPLES.md`, `.github/workflows`의 workflow, `.github/actions/kit-bootstrap/action.yml`, `config/layout.kit.yml`은 kit에서 가져온 이 저장소의 파일이며, kit은 사본을 쓰지 않습니다(kit docs/spec/utilities-and-recipes.md).
  Enforced by: none, review에서 판단합니다: kit은 저장소의 recipe나 파일을 검사하지 않습니다.
- Own: 이 저장소의 폴더 배치는 `config/layout.yml`이며, 이는 이 저장소의 폴더로 `config/layout.kit.yml`을 확장합니다.
  Enforced by: `make layout-check`

<a id="dependencies"></a>
## Dependencies

- Own: polyspec 버전이 0.0.x인 동안 개발 checkout은 kit `docs/plans/local-links.md`가 설명하는 대로 설치된 polyspec 패키지를 원본에 link합니다. link는 commit하지 않습니다.
  Enforced by: none, 개발 link는 무시되는 `node_modules/`에 있어 Git 밖에 남고, 어떤 도구도 개발 checkout을 판단하지 않습니다.

<a id="idempotency"></a>
## Idempotency

- Own: 같은 tree는 언제, 어느 기계에서든 같은 결과를 냅니다. 이 목록의 각 규칙은 이 저장소가 그 규칙을 어떻게 지키는지를 적습니다.
  Enforced by: none, 결과가 기계에 따라 달라지는지는 어떤 도구도 판단할 수 없는 판단 사항입니다.
- Own: 검사는 시간에 따라 결과가 달라지는 registry 질의를 하지 않습니다. latest 조회, `@latest`, version 범위 해석, 오래된 패키지 질의가 없습니다. lock이 정확한 version과 integrity hash로 고정한 것을 설치하는 것은 허용되며, `npm ci`와 `composer install`이 그렇듯 허용됩니다.
  Enforced by: none, 검토에서 판단합니다.
- Own: 어떤 명령도 도구를 필요할 때 설치하지 않습니다. Node.js, Rust, Go, Python, PHP, npm은 추적 파일이 고정합니다. Go, Python, Composer와 mise가 설치하는 다른 도구는 `mise.toml`의 정확한 release이며 `mise.lock`의 digest로 잠깁니다. PHP는 `.php-version`의 minor release로 고정합니다. install target을 제외한 모든 명령은 cargo, go, npm, Composer를 offline으로 실행하므로, 누락된 다운로드는 `make install`을 실행하라는 메시지와 함께 실패합니다.
  Enforced by: none, 검토에서 판단합니다: kit 0.0.77이 toolchain check를 제거했고(K854), mise.toml과 mise.lock의 고정은 install-tools가 읽습니다.
- Own: 다운로드하는 것은 `make install-tools TOOLS=npm`, `make install-packages`, `make install`뿐입니다. 첫 번째는 npm을, 두 번째는 `package-lock.json`의 패키지를 설치하며, `make install`은 `mise.lock`의 도구, Rust toolchain, root `Cargo.lock`의 crate를 설치하며, PIE PHAR와 보충 suite는 `mise.toml`의 tool `http:pie`와 `http:jsontestsuite`입니다.
  Enforced by: none, 검토에서 판단합니다: Cargo.lock의 crate는 cargo의 상태이며, make target은 그것을 lock과 비교할 수 없습니다(K864).
- Own: 테스트는 자기가 만든 출력만 읽고 추적되지 않은 상태에 의존하지 않습니다. record, 문서 검사, 공통 사례, build copy는 Git이 추적하는 파일을 읽으며, 각 실행은 자기 run directory와 자기 `CARGO_TARGET_DIR`로 빌드합니다.
  Enforced by: `make json-test-scripts`
- Own: 공유 출력은 원자적으로 게시합니다. 파일을 `var/` 아래에 완전히 쓴 뒤 그 경로로 rename합니다(`write_record`).
  Enforced by: `make json-test-scripts`
- Own: 검사는 사용자의 locale로 된 메시지를 판단하지 않습니다. 출력 텍스트를 비교하는 명령은 `LC_ALL=C`로 실행합니다(`scripts/registry.mts`가 `git ls-files`를 실행하는 것처럼).
  Enforced by: `make json-test-scripts`

<a id="completion"></a>
## Completion

- Own: 배포 상태는 관측한 근거로만 갱신하며, 배포의 확인은 테스트와 별도로 합니다.
  Enforced by: `make evidence-check`
- Own: 문서의 정확성을 확인하려면 코드와 테스트를 검토합니다. 자동 링크, 개정, 상태 검사는 산문의 정확성을 증명하지 않습니다.
  Enforced by: none, 산문의 정확성은 어떤 도구도 판단할 수 없는 판단 사항입니다.
- Own: Git 메시지는 사실에 맞고 간결하게 쓰며, 관계없는 변경은 따로 commit합니다.
  Enforced by: none, 검토에서 판단합니다.

<a id="package-npm"></a>
## 패키지 npm (legacy/packages/js)

- Own: 패키지 `@polyspec/ordered-json`은 `make json-js-check`로 이 패키지만 검사합니다. 이 target은 `make verify-js`(`scripts/verify.mts --only js`)를 실행해 어댑터를 공통 사례와 비교하며 기록을 쓰지 않습니다. 패키지 테스트는 `make test-js`가 실행하는 native node:test 파일입니다.
  Enforced by: `make test-js`
- Own: 패키지는 독립 기대값을 두지 않습니다. 공식 사례와 기대 결과는 저장소 루트에 있으며, 동작을 바꿀 때는 패키지보다 먼저 공통 명세를 고칩니다.
  Enforced by: `make verify-all`
- Own: 패키지의 변경은 [CHANGELOG.ko.md](CHANGELOG.ko.md)의 이 패키지 절에 적고, 문서는 다른 문서와 함께 검사합니다.
  Enforced by: `make docs-check`

<a id="package-rust"></a>
## 패키지 rust (packages/rust)

- Own: crate는 `make lint-rust`(`-D warnings`를 붙인 clippy)가 lint합니다.
  Enforced by: `make lint-rust`
- Own: binding package를 포함한 workspace의 모든 crate는 rustfmt의 꼴을 따릅니다. 그 꼴은 리뷰가 읽어서 판정할 수 없기 때문입니다.
  Enforced by: `make fmt-check`
- Own: crate는 `make json-rust-check`로 이 패키지만 검사하며, 이 target은 `make verify-rust`를 실행합니다.
  Enforced by: none, 검토에서 판단합니다: workflow, Git hook, Claude Code hook 어디도 이 target을 실행하지 않습니다.
- Own: crate는 root `Cargo.lock`에 고정된 버전이며, `make install`이 내려받고 검사는 내려받지 않습니다.
  Enforced by: none, 검토에서 판단합니다: Cargo.lock의 crate는 cargo의 상태이며, make target은 그것을 lock과 비교할 수 없습니다(K864).
- Own: 패키지 테스트는 `make test-rust`가 실행하는 crate의 native 테스트입니다.
  Enforced by: `make test-rust`
- Own: crate의 변경은 [CHANGELOG.ko.md](CHANGELOG.ko.md)의 이 패키지 절에 적습니다.
  Enforced by: `make docs-check`

<a id="package-go"></a>
## 패키지 go (legacy/packages/go)

- Own: module은 `make lint-go`(`.golangci.yml`을 쓰는 golangci-lint와 deadcode)가 lint합니다.
  Enforced by: `make lint-go`
- Own: module은 `make json-go-check`로 이 패키지만 검사하며, 이 target은 `make verify-go`를 실행합니다.
  Enforced by: none, 검토에서 판단합니다: workflow, Git hook, Claude Code hook 어디도 이 target을 실행하지 않습니다.
- Own: `GOTOOLCHAIN`은 `local`이며, module은 `mise.toml`의 Go release를 요구합니다.
  Enforced by: none, 검토에서 판단합니다: kit 0.0.77이 toolchain check를 제거했고(K854), mise.toml과 mise.lock의 고정은 install-tools가 읽습니다.
- Own: 패키지 테스트는 `make test-go`가 실행하는 코드 옆의 Go 테스트입니다.
  Enforced by: `make test-go`
- Own: module의 변경은 [CHANGELOG.ko.md](CHANGELOG.ko.md)의 이 패키지 절에 적습니다.
  Enforced by: `make docs-check`

<a id="package-php"></a>
## 패키지 php (legacy/packages/php)

- Own: Composer 패키지는 `make lint-php`(phpcs와 PHPStan)가 lint합니다.
  Enforced by: `make lint-php`
- Own: Composer 패키지는 `make json-php-check`로 이 패키지만 검사하며, 이 target은 `make verify-php`를 실행합니다.
  Enforced by: none, 검토에서 판단합니다: workflow, Git hook, Claude Code hook 어디도 이 target을 실행하지 않습니다.
- Own: `composer.lock`은 platform `8.4.1`로 잠기고 PHP `>=8.4`를 요구하며, manifest가 바뀌면 `composer update --lock`으로 다시 잠급니다.
  Enforced by: none, 검토에서 판단합니다.
- Own: 패키지 테스트는 `legacy/packages/php/tests`의 PHPUnit 테스트이며, `make install`이 설치하고 `make test-php`가 실행합니다.
  Enforced by: `make test-php`
- Own: 패키지의 변경은 [CHANGELOG.ko.md](CHANGELOG.ko.md)의 이 패키지 절에 적습니다.
  Enforced by: `make docs-check`

<a id="package-php-ext"></a>
## 패키지 php-ext (legacy/packages/php-ext)

- Own: extension은 `make json-php-ext-check`로 이 패키지만 검사하며, 이 target은 `make verify-php-extension`을 실행합니다. kit의 `make build-php-ext`(S10)가 stub과 추적되는 arginfo header(`make php-ext-arginfo`가 씁니다)에서 `var/php-ext/polyspec_ordered_json.so`를 빌드하며, `make verify-php-extension`과 `make test-php-ext`가 이를 불러옵니다.
  Enforced by: `make test-php-ext`
- Own: `composer.lock`은 platform `8.4.1`로 잠기고 PHP `>=8.4`를 요구합니다. PHP 패키지와 같으며, manifest가 바뀌면 `composer update --lock`으로 다시 잠급니다.
  Enforced by: none, 검토에서 판단합니다.
- Own: extension의 변경은 [CHANGELOG.ko.md](CHANGELOG.ko.md)의 이 패키지 절에 적습니다.
  Enforced by: `make docs-check`

<a id="package-python"></a>
## 패키지 python (legacy/packages/python)

- Own: 패키지는 `make json-python-check`로 이 패키지만 검사하며, 이 target은 `make verify-python`을 실행합니다. `make lint-python`(`ruff.toml`을 쓰는 ruff와 `legacy/packages/python/vulture_whitelist.py`를 쓰는 vulture)이 lint합니다. `make install-packages`가 `legacy/packages/python/.venv`에 editable로 설치하며, 테스트가 이를 씁니다.
  Enforced by: `make lint-python`
- Own: 패키지 테스트는 `legacy/packages/python/tests`의 unittest 테스트이며, `make test-python`이 실행합니다.
  Enforced by: `make test-python`
- Own: 패키지의 변경은 [CHANGELOG.ko.md](CHANGELOG.ko.md)의 이 패키지 절에 적습니다.
  Enforced by: `make docs-check`
