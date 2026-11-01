<!-- doc-id: distribution -->
<!-- source-sha256: 20c3d8280cb1ecece424ce47f92de8d8049b324b39c7f183b976b45ea756f895 -->
# 배포

[English](distribution.md)

<a id="state"></a>
## 확인된 상태

저장소는 다섯 [구현 패키지](repositories.ko.md#ownership)를 하나의 리비전에 담습니다. GitHub 릴리스와 버전 태그는 `gh release list -R polyspec/ordered-json`과 저장소의 Releases 페이지에 나열되며, 추적 파일은 이를 다시 적지 않습니다. `vX.Y.Z` 릴리스는 [릴리스 asset](installation.ko.md#release-assets)에 나열된 asset을 첨부하고, Go 모듈 릴리스 `packages/go/vX.Y.Z`는 asset을 첨부하지 않습니다. `published`로 표시한 기능 행은 릴리스 tag와 asset 이름을 적으며([기능](../features.ko.md)), 그 형식은 `make evidence-check`가 오프라인으로 검사합니다.

이 저장소는 세 채널로 배포합니다. `vX.Y.Z` release의 GitHub release asset(npm tarball, PHP 라이브러리와 PHP 확장의 Composer zip, Python wheel), `packages/rust/`의 Rust 크레이트 `polyspec-ordered-json`을 git tag로, Go 모듈 `github.com/polyspec/ordered-json/packages/go`를 tag `packages/go/vX.Y.Z`로 배포합니다. 어떤 release도 레지스트리에 게시하지 않습니다. npm, crates.io, Packagist, PyPI는 release를 받지 않으며, 어떤 workflow도 레지스트리에 게시하지 않습니다. 확인된 로컬 배포는 소스 체크아웃입니다. PIE 메타데이터와 성공한 PIE 빌드는 로컬 빌드 호환성을 확인하며 Packagist 게시 근거는 아닙니다. 확장 패키지는 `polyspec/ordered-json-php-ext`, PHP 라이브러리는 `polyspec/ordered-json`입니다.

소스 버전 문자열은 릴리스된 산출물의 근거가 아닙니다. 어떤 workflow도 레지스트리에 게시하지 않고, 호스팅 CI는 전체 suite와 push gate를 실행하며([호스팅 CI](validation.ko.md#ci)), tag의 push는 그 tag의 GitHub Release를 만듭니다([tag 릴리스](#tag-release)). LICENSE 파일은 없습니다.

<a id="source-publication"></a>
## 소스 게시

변경한 패키지의 필수 검사를 실행하고 공통 계약과 함께 커밋합니다. 모든 변경은 체크리스트가 모두 `[o]`일 때의 push로 `main`에 들어갑니다([main 게시](validation.ko.md#publish)).

~~~sh
git push origin HEAD:main
~~~

호스팅 CI가 pull request와 모든 push to `main`에서 kit의 gate, parity 검사, 모든 runtime의 test, lint, PIE 검사를 실행하고, `main`에서 성공한 `ci` 실행이 release workflow를 시작합니다. 깨끗한 복제가 게시된 리비전에서 모든 패키지를 빌드하는지 확인합니다. 공통 계약 변경은 검증기, fixture와 관련 패키지를 같은 리비전으로 게시합니다.

인증 정보는 시스템 인증 저장소에서 관리합니다. 게시 관측과 테스트 결과를 구분합니다.

<a id="tag-release"></a>
## Tag 릴리스

릴리스는 `main`의 commit에 붙인 tag입니다([릴리스 절차](../../AGENTS.ko.md#release)). `vX.Y.Z`는 `packages/js/`의 npm 패키지와 `packages/php/`, `packages/php-ext/`의 Composer 패키지를 버전 X.Y.Z로 릴리스하고, `packages/python/`의 Python wheel을 버전 X.Y.Z로 릴리스하고, `packages/go/vX.Y.Z`는 Go 모듈 `github.com/polyspec/ordered-json/packages/go`를 릴리스합니다. Python 패키지는 wheel asset `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`로 릴리스하며(`config/release.json`, kind `wheel`), git tag로 사용하지 않습니다. `packages/rust/`의 Cargo 패키지는 archive로 릴리스하지 않고 git tag로 사용합니다(`config/release.json`, mode `git-tag`). `cargo package`는 git 의존성을 해석되지 않는 crates.io 요구로 바꾸기 때문입니다. tag `vX.Y.Z`와 `packages/go/vX.Y.Z`는 같은 commit을 가리키며, `make release-tag`가 둘 다 만듭니다. 패키지, tag가 각 manifest를 릴리스하는 방식, 어떤 tag도 릴리스하지 않는 manifest, Go 모듈은 [config/release.json](../../config/release.json)에 선언합니다. `make release-coverage`는 checkout의 모든 package 파일이 그곳에 분류되도록 요구합니다. `main`에서 성공한 `ci`의 push 실행이 `.github/workflows/release.yml`(`on: workflow_run`, 권한 `contents: write`)을 시작하며, 그 step은 다음 순서로 `@polyspec/kit`의 release target을 실행하고 첫 실패에서 멈춥니다.

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

workflow는 `@polyspec/kit`의 `workflows/release.yml`의 사본입니다. `make install-tools TOOLS=npm`과 `make install-packages`는 npm과 package `@polyspec/kit`을 설치하며, 이어지는 step이 그 target을 실행합니다. `make release-tools`는 `config/release.json`이 필요로 하는 도구(npm, `mise.lock`의 도구와 Python build backend, Rust)를 설치하고, `make release-tools-path`는 이어지는 step의 `PATH`에 `var/tools/bin`과 mise의 shim을 넣고 mise의 환경을 `GITHUB_ENV`에 씁니다.

1. `make release-tag`는 commit이 `origin/main`에 있는 `main`의 `ci` push 또는 dispatch 실행이 성공으로 완료되었는지 요구합니다. 그 실행이 시작하면 release workflow는 그 실행의 commit이 version commit이거나, version에 tag가 없고 `## Unreleased`가 비어 있는 그 뒤의 commit일 때 그 commit에 change log 최상위 `## X.Y.Z`를 릴리스합니다. 판단은 `@polyspec/kit`의 `make release-tag`가 합니다. 그 commit에 tag `vX.Y.Z`와 Go 모듈의 tag `packages/go/vX.Y.Z`를 만들어 push합니다. 그 commit의 계보에 이미 tag된 version은 아무것도 릴리스하지 않고, 계보 밖에 tag된 version은 실행을 실패시킵니다. 테스트를 다시 실행하지 않습니다.
2. version은 version 올림 commit `Release X.Y.Z`가 `config/release.json`의 모든 manifest에 X.Y.Z를 설정하고 각 changelog의 `## Unreleased`를 `## X.Y.Z`로 바꾸며, 어떤 make target도 검사하지 않고 검토에서 판단합니다([릴리스 절차](../../AGENTS.ko.md#release)).
3. `make release-assets`는 `var/release/assets`를 만듭니다. `polyspec-ordered-json-X.Y.Z.tgz`(`packages/js/`의 `npm pack`), `polyspec-ordered-json-php-X.Y.Z.zip`과 `polyspec-ordered-json-php-ext-X.Y.Z.zip`(tag된 commit의 `packages/php/`와 `packages/php-ext/`의 `git archive`)과 `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`(`packages/python/`의 PEP 427 wheel이며, `config/toolchain.json`의 `pythonBackend`에 고정한 build backend로 만들고 `Requires-Dist`는 `name==version`만 가집니다)입니다. 릴리스 asset은 npm tarball, Composer zip과 wheel입니다. npm tarball은 `npm pack`이 준 이름을 그대로 쓰고, Composer zip은 자기 package의 label인 `<vendor>-<product>-<runtime>-<version>.zip`(PRINCIPLES P39)으로 이름 짓고, wheel은 PEP 427 이름을 씁니다. 압축 전에 tag된 commit의 모든 공개 manifest는 표준 형식이어야 합니다. `composer.json`은 tag의 버전을 선언하고 `repositories`가 없으며, 어떤 제약에도 `@dev`가 없고, `package.json`에는 `overrides`와 `file:`, `link:`, `workspace:`, URL, git 의존성이 없으며, 같은 scope의 package 의존성은 정확한 버전 하나입니다. zip은 압축하지 않은 entry와 tag된 commit의 시각을 가지며 `TZ=UTC`로 만들므로, 한 tree의 zip은 어느 기계에서 언제 만들어도 같은 byte입니다. 압축 후 각 archive의 manifest는 tag된 commit의 manifest와 byte 단위로 같아야 하며, 어떤 단계도 manifest를 다시 쓰지 않습니다. Go tag는 아무것도 만들거나 첨부하지 않습니다.
4. `make release-publish`는 archive와 함께 `gh release create <tag> --verify-tag --draft --title <tag> --notes-file <notes>`를 실행하므로 릴리스는 draft입니다. GitHub는 125000자를 넘는 릴리스 본문을 거부하므로, notes는 `CHANGELOG.md`의 section `## X.Y.Z`가 125000자 이하이면 그 section이고, 그렇지 않으면 한 줄 `The changes of X.Y.Z are listed in [CHANGELOG.md](https://github.com/polyspec/ordered-json/blob/<tag>/CHANGELOG.md#<anchor>).`입니다. tag는 경로 segment별로 URL 인코딩되고, anchor는 section의 `<a id>` anchor이며 없으면 점을 뺀 버전입니다.
5. `make release-undraft TAG="$TAG"`는 `make release-publish` 뒤에 릴리스를 공개합니다. 실패한 단계는 릴리스를 draft로 남깁니다.

consumer는 저장소 밖에서 release를 패키지 관리자로 설치합니다. npm은 release tarball `polyspec-ordered-json-X.Y.Z.tgz`를 설치하고, Composer는 PHP 패키지를 release zip의 artifact repository에서 require합니다. Cargo 패키지는 git tag로, Python wheel은 release asset에서, Go 모듈은 tag로 설치합니다.

`main`에서 성공한 `ci`의 push 실행이 workflow를 스스로 시작하며, maintainer는 성공한 `ci` 실행에 대해 `gh workflow run release.yml -f run=<run id>`로 시작할 수 있습니다. tag는 `make release-tag`가 기록하는 환경 변수 `TAG`로 step에 전달됩니다.

<a id="releases"></a>
## 레지스트리와 릴리스 기록

어떤 release도 레지스트리에 게시되지 않습니다. 릴리스를 기록하기 전에 패키지 이름, 버전, 포함 파일, 배포 채널, 산출물, 검사한 소스 개정본을 확인합니다. 기능 행에 릴리스 asset을 적습니다.

게시 상태가 변경되면 영어·한국어 배포 문서, 기능 배포 상태, 변경 기록을 갱신합니다. 테스트, 버전 선언, 계획된 태그, 소스 푸시만으로 게시를 추정하지 않습니다.
