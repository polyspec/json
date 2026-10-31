<!-- doc-id: validation -->
<!-- source-sha256: 5a9478a2598ae93b3a4bee9fd68a7374ad09364a70ca2a5f17825f7d75915e03 -->
# 검증

[English](validation.md)

<a id="repository-check"></a>
## 통합 검사

개발 중에는 unit test만 실행합니다(`make ordered-json-test-scripts`). 통합 검사, PIE 산출물 검사, owner 검사는 [hosted CI](#ci)가 push마다 실행하는 end-to-end 검사입니다. 어떤 규칙도 commit이나 push 전에 로컬 실행을 요구하지 않으며, pre-push hook은 체크리스트만 읽습니다. 그래도 로컬에서 통합 검사를 실행하려면 [필수 도구](installation.ko.md#requirements)를 설치하고 저장소 루트에서 실행합니다.

~~~sh
make install
make check
~~~

`make check`는 `@polyspec/kit`의 full-run으로 `CHECK_TARGETS`의 target을 실행합니다. 그 target `verify-all`은 `config/parity.json`의 모든 구현을 빌드하고, 각 구현의 probe에 공통 JSON 사례를 보내고, 통합 기록 `var/records/verification.json`을 생성한 뒤 체크아웃의 [기록](#records)과 함께 근거 검사를 실행합니다(`scripts/verify.mts --record`). 통합 기록에는 추적된 모든 파일의 소스 해시가 포함됩니다. 각 구현의 패키지 테스트는 `make parity-check`에서 그 언어의 native runner로, 도구 test는 `make ordered-json-test-scripts`에서 실행합니다.

각 빌드 단계는 시작 줄, 도착하는 대로의 출력, 종료 상태와 경과 시간을 출력합니다. 빌드 단계와 PIE 명령에는 시간 한도가 없으며, 종료 상태와 출력이 결과를 결정합니다. 각 probe는 공통 사례를 한 번에 하나씩 받고, 검증기는 사례와 그 응답의 경과 시간을 출력합니다. 응답마다 60 s가 주어지며, 이를 넘긴 probe는 종료되고 해당 사례 이름이 보고됩니다. 실행 전체에는 한도를 두지 않습니다. 빌드 단계나 probe가 끝나면 검증기는 그 process group을 종료하므로, 그것이 background에서 시작한 process는 그보다 오래 남거나 그 출력을 열어 두지 않습니다. 실패는 실행도 다른 언어도 끝내지 않습니다. 각 언어의 빌드와 모든 probe의 모든 공통 사례는 끝까지 실행되고, 실패한 빌드는 자기 언어의 이후 단계만 건너뛰며, 실행은 그 뒤 모든 실패를 나열하고 기록을 쓰지 않은 채 status 1로 끝납니다. fixture와 추가 사례의 기대 결과는 독립 참조(`scripts/reference.mts`)에서 옵니다. 참조는 바이트를 엄격한 UTF-8로 디코딩하고, 모든 member를 원본 범위와 함께 순서대로 유지하는 JSON parser인 momoa로 파싱하며, escape되지 않은 제어 문자와 중첩 한도는 그 token에서 검사합니다.

<a id="records"></a>
## 기록

commit의 근거는 그것을 검증하는 실행입니다. `make pie-check`는 PIE 기록 `var/records/pie-verification.json`을, `make verify-all`은 통합 기록 `var/records/verification.json`을 씁니다. Git은 `var/`를 무시하므로 어떤 기록도 커밋하지 않습니다. 기록은 `benchmarks/results.json`을 뺀 모든 추적 파일을 해시하므로, 커밋된 기록은 다음 commit에서 오래된 기록이 되고 변경마다 로컬 기계에서 전체 실행을 강요합니다. `--records`가 있으면 `make verify-all` 마지막의 근거 검사는 같은 체크아웃의 통합 기록과, 있으면 PIE 기록을 현재 소스와 대조하므로, 두 기록을 모두 쓰는 실행은 두 기록을 모두 검사합니다.

통합 기록에는 소스 해시, 패키지 파일 기록, 실제 런타임 버전, 실행 중인 Node.js release, 사례 수, 결과, 빌드 경고, 추가 입력 개정본이 포함됩니다. PHP 버전과 확장 버전은 별도 필드입니다. 입력이 변경되면 현재 검증 근거로 유효하지 않습니다. 실행 중 변경과 불완전한 구현 결과는 거부합니다. 이 기록은 게시 근거가 아닙니다. 모든 기록과 보고서(`var/records/verification.json`, `var/records/pie-verification.json`, `benchmarks/results.json`, 실패한 benchmark의 검토용 사본)는 Git이 무시하고 어떤 manifest도 읽지 않는 `var/`의 파일에 끝까지 쓴 뒤 그 경로 위로 이름을 바꾸므로, 읽는 쪽은 이전 파일이나 새 파일을 보며 파일의 일부를 보지 않습니다.

<a id="supplementary"></a>
## 추가 입력

~~~sh
make install
make check JSON_TEST_SUITE=.cache/JSONTestSuite
~~~

`make install`는 [외부 입력](../../external-inputs.json)이 고정한 nst/JSONTestSuite 개정본을 `.cache/JSONTestSuite`로 가져오고, 개정본, 사례 수, 입력 해시가 고정값과 다른 체크아웃은 각 필드의 기대값과 실제값을 밝히며 거부합니다.

추가 입력 사용 여부를 기록합니다. `i_` 사례에는 공통 UTF-8·깊이 정책을 적용합니다. 공식 입력과 기대값은 저장소 루트에만 있으며 probe에 독립 기대값을 추가하지 않습니다.

[외부 입력](../../external-inputs.json)이 그 개정본과 사례 해시를 고정하며, 다른 체크아웃으로 측정한 기록은 문서 검사를 통과하지 못합니다. `make check`와 `make pie-check`는 어떤 작업보다 먼저 추가 사례를 그 고정값과 비교하고, `make pie-check`는 PHAR의 해시도 PIE 고정값과 비교합니다. 다른 필드마다 빌드를 시작하기 전에 기대값과 실제값을 밝히며 명령이 실패합니다.

<a id="individual"></a>
## 개별 구현

공통 체크아웃에서 선택한 검사는 정의된 probe를 빌드하고 실행합니다. 통합 기록은 갱신하지 않습니다.

~~~sh
make verify-js
make verify-rust
make verify-go
make verify-php verify-php-extension
~~~

독립 체크아웃은 다음과 같이 검사합니다.

~~~sh
git clone https://github.com/polyspec/ordered-json.git
cd ordered-json
make check
~~~

각 패키지는 독립 빌드 대상으로 유지하지만 공유 빌드·probe·런타임 명령은 `config/parity.json`의 구현에 대해 검증기(`scripts/registry.mts`)가 정의합니다. 네이티브 확장은 그 패키지에서 Git이 추적하는 소스 파일을 실행의 임시 디렉터리에 복사해 빌드하며 같은 체크아웃의 형제 PHP 패키지와 함께 검사합니다. 각 실행은 실행 디렉터리를 출력하고 끝날 때 제거하므로, 한 체크아웃의 실행들은 빌드 출력을 공유하지 않습니다. 실행의 모든 cargo 명령과 benchmark의 `cargo run`은 `CARGO_TARGET_DIR`를 그 실행 안의 디렉터리로 설정하므로, 환경이 지정하거나 다른 체크아웃이 채운 target 디렉터리가 Rust probe나 benchmark binary를 제공하지 않습니다.

추가 입력은 `make check JSON_TEST_SUITE=/path/to/JSONTestSuite`로 검사합니다.

<a id="pie"></a>
## PIE 산출물 검사

`make install`는 [외부 입력](../../external-inputs.json)이 고정한 PIE 릴리스를 [공식 릴리스](https://github.com/php/pie/releases)에서 `make pie-check`의 기본 `PIE`인 `.cache/pie/pie.phar`로 내려받고, SHA-256이 고정값과 다른 파일은 두 해시를 밝히며 거부합니다. 출처는 `gh attestation verify --owner php .cache/pie/pie.phar`로 확인할 수 있습니다. 공통 루트에서 실행합니다.

~~~sh
make pie-check JSON_TEST_SUITE=.cache/JSONTestSuite
~~~

[PIE 검사기](../../scripts/check-pie.mts)는 확장의 추적 소스 파일을 임시 실행 디렉터리에 복사하고, 그 디렉터리에 PIE 설정을 격리하고, 복사본을 경로 저장소로 등록하고, 패키지 인식을 확인하고, PIE로 빌드합니다. 같은 공통 probe와 기대값으로 해당 산출물을 직접 검사합니다. 중간에 일반 네이티브 빌드를 실행하지 않습니다.

PIE 기록 `var/records/pie-verification.json`은 PIE 버전과 PHAR 해시, 실행 디렉터리 기준의 선언된 산출물 경로, 명령, 소스 해시, PHP·확장 버전, 사례 결과를 기록합니다. PHAR 해시와 추가 입력 개정본은 고정값과 일치해야 합니다. 빌드된 모듈은 경로로만 명시합니다. 링크 시점에 새 식별자와 서명이 들어가므로 그 해시는 한 번의 실행만 가리키며, 검사기는 해시를 담은 기록을 거부합니다. 빌드 오류, 빌드 도구 누락, probe 경고, 검사 중 변경은 검증 실패로 처리합니다. 컴파일 경고는 기록에 유지합니다. 이 검사는 모듈을 설치하거나 패키지를 게시하지 않습니다. 기록은 `benchmarks/results.json`을 뺀 모든 추적 파일을 해시하며, 같은 체크아웃에서 `make pie-check` 뒤에 실행하는 `make check`의 문서 검사는 PIE 기록이 현재 소스와 맞지 않으면 거부합니다.

<a id="ci"></a>
## Hosted CI

`.github/workflows/ci.yml`은 모든 pull request, `main` push와 수동 dispatch에서 실행됩니다. 여섯 language job은 native package test와 해당 lint를 병렬 실행합니다. 독립 `parity` job은 모든 구현을 설치·빌드하고 `verify-all`로 shared case를, `parity-check`로 선언된 모든 unit과 public symbol을 검증합니다. language job을 기다리지 않고, language job이 실패해도 취소되지 않습니다. PHP extension artifact proof는 `php-ext`가 맡습니다. 각 job은 서로 다른 report artifact를 가집니다.

| Job | Targets |
| --- | --- |
| `parity` | `test-markers-check verify-all parity-check` |
| `js` | `test-js` |
| `rust` | `test-rust lint-rust` |
| `go` | `test-go lint-go` |
| `php` | `test-php lint-php` |
| `php-ext` | `lint-php-ext test-php-ext pie-check` |
| `python` | `test-python lint-python` |

~~~sh
make install-tools TOOLS=npm
make install-packages
make install-tools TOOLS="go rust php composer python uv"
make kit-install-symbols EXTRACTORS="go php"
make kit-install-php-arginfo
make ordered-json-install-parity
make ci-targets TARGETS="test-markers-check verify-all parity-check"
~~~

canonical locked-package bootstrap 뒤에 모든 job은 pin된 npm과 잠긴 package를 설치합니다. 각 language job은 Kit `make install-tools TOOLS="..."`로 도구를 요청하고 잠긴 Rust, Composer, Python 의존성을 위해 product package installer를 재사용합니다. parity job은 같은 package installer로 자기 checkout에 비교에 필요한 전체 환경을 준비합니다. Kit 0.0.61이 선택 설치를 제공합니다. parity는 Kit target으로 Go/PHP symbol extractor와 PHP arginfo를 명시적으로 설치하고 extension job은 PHP arginfo만 설치합니다. 잠긴 PIE와 supplementary input은 product install target에서 native mise로 다운로드합니다. 여기서는 custom tool installer를 유지하지 않으며 측정 전 속도 향상을 주장하지 않습니다. `docs` job은 `make install-tools`로 repository 검사와 TypeScript lint를 실행하고 Git hook을 준비합니다. push gate는 `push-gate-commit`, `docs-check`, `evidence-check`, `commits-check`를 유지합니다. release와 gates workflow는 계속 kit가 관리합니다.

`CHECK_TARGETS`의 모든 target은 `ci.yml`과 `push-gate.yml`의 job 하나에서만 실행됩니다. parity 안의 native test는 선언된 언어 간 coverage를 유지합니다. 각 check step은 `if: !cancelled()`로 실패 뒤에도 실행됩니다. `make ci-targets`는 모든 target을 끝까지 실행하고 상태, exit code, 시간과 출력을 `var/report/ci-targets/`에 기록합니다. 실패 뒤에도 report를 upload합니다. 각 job은 `ubuntu-24.04`와 잠긴 toolchain을 사용하고 실제 PHP patch release를 기록합니다. 전체 job deadline은 두지 않습니다.

`ci.yml`의 마지막 job `ci-passed`는 release workflow가 tag된 commit에 요구하는 이 workflow의 check입니다. workflow의 다른 모든 job을 need로 가지고, 그중 하나가 실패하거나 skip되거나 취소되어도 그 모든 job 뒤에 실행되며(`if: ${{ always() }}`), `make ci-passed RESULTS='${{ toJSON(needs) }}'`를 실행합니다. `@polyspec/kit`의 ci-passed는 need로 가진 모든 job의 결과를 출력하고, 하나라도 `success`가 아니면 실패합니다. `ci.yml`에 추가한 job은 `needs`에 넣으므로 필수 check가 그 job을 포함합니다. `tests/scripts/workflow-rules.test.mts`는 `ci-passed`가 없거나, 마지막 job이 아니거나, `if: ${{ always() }}`가 없거나, 다른 모든 job을 need로 가지지 않거나, 다른 runner에서 실행되거나, 다른 step을 실행하면 실패합니다.

저장소 소유 CI와 push-gate workflow의 각 job은 workspace 루트에 이 저장소를 checkout합니다. 첫 make 명령 전에 canonical bootstrap이 devEngines.packageManager에 선언된 npm 버전으로 잠긴 kit 패키지를 설치합니다. Makefile은 설치된 패키지 bootstrap을 include하며 형제 checkout은 필요하지 않습니다. 개발용 소스 link는 선택적인 native 패키지 관리자 상태로 유지합니다.


docs job은 tool 설치 후 Git hook을 준비합니다. language와 parity installer는 오프라인 lint 전에 설치된 kit Rust checker crate를 다운로드합니다. 다운로드는 설치 단계로 유지하며 어떤 검사도 네트워크 접근을 활성화하지 않습니다.


Kit가 관리하는 provider gate는 [config/ci.json](../../config/ci.json)을 읽습니다. 전체 parity 경로는 필수로 유지합니다. setup은 Kit의 native runtime 기본값, PEP 751 lock 모델을 위한 저장소 Python editable installer, pin된 PHP arginfo installer를 재사용합니다. shared metadata 검사는 Go, PHP, Python prerequisite를 명시합니다. 앱 recipe는 Kit gate를 대체하지 않습니다.

<a id="publish"></a>
## main 게시

0.x 버전 동안 체크리스트 작업의 변경은 로컬에 commit하고, 체크리스트의 모든 행이 `[o]`일 때 `main`에 한 번 push합니다([AGENTS](../../AGENTS.ko.md)). push 전에 pre-push hook `.githooks/pre-push`가 push gate를 실행합니다:

~~~sh
git push origin HEAD:main
~~~

이 push는 `ci.yml`을 실행하며, 그 job `ci-passed`는 release workflow가 tag된 commit에 요구하는 check입니다. 그 뒤에 버전 올림 commit을 `main`에 넣고, `ci-passed`가 성공으로 끝난 commit에만 tag `vX.Y.Z`를 붙입니다([tag release](distribution.ko.md#tag-release)).

<a id="documentation-checks"></a>
## 문서 검사

~~~sh
make docs-check
make evidence-check
~~~

`make docs-check`는 [config/documents.json](../../config/documents.json)이 선택한 문서(공통 문서와 패키지 문서 모두)에 `@polyspec/kit`의 check-documents를 실행합니다. 번역 쌍과 개정 해시, 저장소에서 자기 주제를 한 번만 가리키는 문서별 `doc-id` 표지, 절과 코드 블록 일치, 링크와 앵커, 로컬 홈 디렉터리 경로, 체크리스트 `docs/plans/execution-checklist.md`와 그 번역, `docs/features.md`의 기능 표 값, `CHANGELOG.md`의 section을 검사합니다. `make evidence-check`는 [scripts/check-evidence.mts](../../scripts/check-evidence.mts)를 실행합니다. 기능 행을 그것이 가리키는 근거와 대조하고, 배포 관측, 벤치마크 결과, `docs/`의 JSON 보고서를 검사합니다. `make verify-all`이 통합 기록을 쓴 뒤 붙이는 `--records`가 있으면 체크아웃의 [기록](#records)이 현재 소스와 일치하는지도 검사합니다. `make evidence-check`는 그 비교를 생략합니다. `make commits-check`는 commit의 메시지를 `@polyspec/kit`의 commit 규칙(check-commits의 `COMMIT_RULES`)에 대해 검사합니다.

한국어 `source-sha256`을 갱신하기 전에 코드·테스트와 영어·한국어 내용을 비교합니다. 해시 일치는 번역 정확성을 증명하지 않습니다. 외부 링크는 문법만 검사하며 접속하지 않습니다. [hosted CI](#ci)가 모든 pull request와 모든 merge group에서 이 검사들을 실행합니다.

<a id="limits"></a>
## 한계

사례 모음은 파서 허용 여부와 [인수 계약](../spec/json-contract.ko.md#acceptance)을 검사합니다. 모든 API 인수, 기본값이 아닌 모든 깊이 설정, 선언된 모든 최소 런타임, 모든 플랫폼, 모든 호스트 인코더 연동을 검증하지는 않습니다. Windows와 ZTS 네이티브 빌드는 검증되지 않았습니다.

실패한 검사와 컴파일 경고를 직접 보고합니다. 입력이 변경되면 이전 결과를 사용하지 않습니다. JSON 기록 생성 후 문서 검사가 실패할 수 있으므로 완료 전에 전체 검사가 성공해야 합니다.
