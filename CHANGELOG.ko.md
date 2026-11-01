<!-- doc-id: changelog -->
<!-- source-sha256: 2d7bb8b547a18667fdb41caa9a09ace76d4025c9b182cd90664f2140af9787c3 -->
# 변경 기록

[English](CHANGELOG.md)

<a id="unreleased"></a>
## Unreleased

- T2.130: ordered-json이 kit 0.0.88을 채택합니다: ci.yml은 job kit이 kit의 ci-pipeline.yml을 호출하는 하나의 pipeline이며, 이 pipeline은 kit-gates의 gate를 한 번, config/ci.json이 선언한 target을 실행합니다(PRINCIPLES S12). 테스트는 전체 suite의 모든 target이 그 안에서 실행되는지 확인합니다(T2.130).

## 0.0.17

- ordered-json 0.0.17은 kit 0.0.87을 채택하며(T2.128), 그 release는 polyspec-ordered-json-0.0.17.tgz, polyspec-ordered-json-php-0.0.17.zip, polyspec-ordered-json-php-ext-0.0.17.zip과 wheel을 첨부한다 (T2.129)

- T2.128: ordered-json은 kit 0.0.87을 채택한다. 모든 CI job은 kit-sync가 복사하는 kit-bootstrap action으로 bootstrap하고(K992), pack된 kit으로 시작한 make install은 link 뒤에 link된 kit을 따른다(K993) (T2.128)

## 0.0.16

- ordered-json 0.0.16은 kit 0.0.86을 채택하며(T2.126), 그 release는 polyspec-ordered-json-0.0.16.tgz, polyspec-ordered-json-php-0.0.16.zip, polyspec-ordered-json-php-ext-0.0.16.zip과 wheel을 첨부한다 (T2.127)

- T2.126: ordered-json은 kit 0.0.86을 채택하며, 그 release는 Composer zip을 package의 P39 label(polyspec-ordered-json-php-X.Y.Z.zip, polyspec-ordered-json-php-ext-X.Y.Z.zip)로 이름 짓고 version commit의 CI run이 성공하면 스스로 시작한다 (T2.126)

## 0.0.15

- T2.120: ordered-json은 kit 0.0.85가 정의하지 않는 kit-install-php-arginfo를 호출하지 않으며, 커밋된 arginfo 헤더는 kit이 검사한다 (T2.120)

- T2.111: kit 링크 선언 .links를 로컬 exclude만이 아니라 .gitignore가 무시한다 (K869) (T2.111)

- T2.112: Python 패키지 테스트가 값 트리와 재구성 헬퍼를 한 모듈로 공유하며, 중복 검사가 테스트 폴더를 더 이상 제외하지 않는다 (P34) (T2.112)

- T2.113: AGENTS.md는 기계가 검사할 수 있는 규칙마다 기존 검사를 Enforced by에 명시하고(make lint-rust, make lint-go, make lint-php, make release-verify), 판단만 남는 규칙은 none으로 둔다 (T2.113)

- T2.114: AGENTS.md는 kit이 삭제한 dependency-review, release-consumer-lock, release-consumer와 config/dependency-policy.json을 더 이상 이름으로 들지 않으며, lock은 패키지 관리자가 소유합니다 (T2.114)

- T2.115: distribution과 installation은 consumer가 release를 패키지 관리자로 설치한다고 설명하며, locked kit이 정의하지 않는 make release-consumer와 release-consumer-lock을 쓰지 않습니다 (T2.115)

- T2.116: distribution은 locked kit이 정의하지 않는 make release-versions와 release-proof를 빼고, 실제 릴리스 step을 설명합니다 (T2.116)

- T2.117: ordered-json은 kit 0.0.85를 채택한다. package.json과 lock은 polyspec-kit-0.0.85.tgz를 가리키고, devEngines와 mise가 npm 12.2.0을 고정하며, 복사본은 kit을 따르고, config/release.json은 패키지마다 product와 runtime을 선언하며, kit 0.0.85가 정의하지 않는 checks 키는 제거한다 (T2.117)

- T2.118: ci.yml의 아홉 부트스트랩 단계는 kit과 같이(K938-1) devEngines의 npm을 RUNNER_TEMP에서 --prefix로 실행하여, 러너의 npm 11.20.0이 devEngines를 거부하지 않는다 (T2.118)

- T2.122: ci.yml의 부트스트랩 단계 각각은 kit 0.0.85의 정규 텍스트를, 첫 주석 줄까지 포함하여, 가진다 (T2.122)

- T2.123: workflow 규칙 테스트는 정규 부트스트랩을 kit 복사본이 아닌 저장소의 텍스트에서 읽고, 저장소 워크플로가 닿을 수 없는 release.yml 기대치를 없앤다 (T2.123)

- T2.121: workflow 규칙 테스트는 kit 워크플로 목록을 설치된 kit 패키지의 복사본에서 읽어, ci-pipeline.yml을 저장소 워크플로가 아닌 kit의 것으로 본다 (T2.121)

- T2.124: workflow 규칙 테스트의 태그 push 규칙은 kit 0.0.85가 정의하지 않는 config/release.json의 checks를 읽지 않으며, 태그로 시작하는 workflow는 없다 (T2.124)

- T2.125: package.json은 npm을 devEngines.packageManager에만 선언한다(K938). packageManager 필드, 그 단언과 이를 적은 문서를 제거한다 (T2.125)

- T2.119: ordered-json의 Python 설치는 kit 체크아웃을 요구하는 link 대신 var/tools의 node로 실행하는 install-link로 패키지를 연결한다 (T2.119)

## 0.0.14
- T2.110: ordered-json 0.0.14 릴리스: config/release.json의 모든 manifest와 lock의 버전이 0.0.14이며 changelog가 이를 기록한다 (T2.110)
- T2.108: kit 0.0.77이 더 제공하지 않는 prepare-commit-msg 훅 파일을 제거한다 (K892) (T2.108)
## 0.0.13
- T2.109: kit 0.0.77이 제거한 검사 이름을 Makefile, ci.yml, 테스트와 문서에서 지웠다. deps-rust는 Cargo.lock의 crate를 받는다 (T2.109)
- T2.107: @polyspec/kit을 0.0.77 asset으로 고정하고 lock을 갱신한다. 링크, owner 검사와 훅 제거는 kit 0.0.77을 따른다 (T2.107)
- T2.106: @polyspec/kit을 0.0.76 asset으로 고정하고 lock을 갱신한다 (kit K896, K897 포함 릴리스) (T2.106)
- T2.105: docs 잡이 check 대상 전에 PHP 심볼 추출기를 설치하여 divergence-check가 충돌하지 않는다 (T2.105)
- T2.104: python JSONEncoder와 JSONEncoder.default를 모듈 polyspec.ordered_json으로 이름 짓는다 (T2.102와 같은 이름) (T2.104)
- T2.103: @polyspec/kit을 0.0.75 asset으로 고정하고 lock을 갱신한다 (kit K883, K888 포함 릴리스) (T2.103)
- T2.102: python 패리티 심볼을 extractor가 읽는 모듈 polyspec.ordered_json으로 적는다 (T2.102)
- T2.101: PHP 값 테스트가 두 실행에서 같은 단언을 하며 extension에 따라 분기하지 않는다 (T2.101)
- T2.100: ordered-json 0.0.13 릴리스: config/release.json의 모든 manifest와 lock의 버전이 0.0.13이며 changelog가 이를 기록한다 (T2.100)
- T2.99: @polyspec/kit을 0.0.74 asset으로 고정하고 lock을 갱신한다 (kit K873 포함 릴리스) (T2.99)
- T2.98: 사용자 측 parse, stringify 함수와 MAX_DEPTH를 가드하여, extension이 로드되면 extension이 우선하고 패키지와 extension을 함께 올려도 PHP가 시작한다 (T2.98)
- T2.97: release-config-check를 제거한다. kit 0.0.73이 삭제한 release versions를 불렀고, kit의 tag workflow가 version을 검사한다 (T2.97)
- T2.95: @polyspec/kit을 0.0.73 asset으로 고정하고 lock을 갱신한다 (kit K826, K827, K830) (T2.95)
- T2.94: @polyspec/kit을 0.0.72 asset으로 고정하고 lock을 갱신하며, CI는 make link와 link-state-check를 실행하지 않는다 (T2.94)
- T2.93: @polyspec/kit을 0.0.70 asset으로 고정하고 lock을 갱신하며, make kit-sync로 kit 사본을 갱신한다 (T2.93)
- T2.92: kit K804, K805, K798을 채택한다: pre-commit hook, pre-push와 pre-merge-commit hook, commit-identity, commits-check, push-gate, release consumer와 proof, check-commit-records를 제거한다 (T2.92)
- T2.91: rules-check가 지적한 kit 사본을 make kit-sync로 갱신한다 (T2.91)

- T2.89: kit K788이 삭제하는 toolchain의 pythonBackend를 config/toolchain.json에서 제거한다 (T2.89)
- T2.90: kit K801이 삭제한 main 쓰기 훅을 제거한다 (T2.90)
- T2.88: kit K789가 삭제한 wheel polyspec 소비자를 config/release.json에서 제거한다 (T2.88)
- T2.87: kit K784이 삭제한 dependency-policy-check 참조와 그 게이트만 읽던 설정 파일을 제거한다 (T2.87)
- T2.86: 공유 워크플로는 kit-sync 사본이며 kit-check가 통과한다 (T2.86)

<a id="v0012"></a>

## 0.0.12

- Go no-test-package 및 clean bootstrap 공통 수정을 포함한 공개 Kit 0.0.63을 채택한다. 수정하지 않은 native test-go suite, 독립 언어 간 검증과 canonical provider gate를 유지하고 native consumer lock 및 dependency review로 0.0.12를 준비한다(T2.85) (T2.85-1).

- 앱별 Go package 선택을 제거하고 수정하지 않은 Kit test-go target을 복원한다. 다음 release는 Kit issue #5의 공통 실행기 수정과 전체 CI 성공을 요구한다(T2.83-3-2).

<a id="v0011"></a>
## 0.0.11

- native runner의 tool selector 인자는 허용하면서 shell 명령 위치의 고정 executable을 검사한다. 회귀 검증은 직접 호출과 연결된 bare executable 호출을 계속 거부한다(T2.83-3-1).

- documentation job의 설치 범위를 넓히는 대신 Python과 Rust를 명시적으로 준비하는 parity에서 언어 간 test marker와 release metadata를 검사한다(T2.83-4).

- native Go unit test는 library package에서 실행하고 helper command 빌드는 유지한다. 모든 추적된 Go test가 선택한 package에 속하는지 검증해 새로운 test 누락을 방지한다(T2.83-3).

- 독립 PHP job의 autoload lint 전에 잠긴 PHP symbol parser를 명시적으로 준비하고 native test와 lint 기준을 유지한다(T2.83-2).

- Kit 0.0.61, 독립 language CI와 native release consumer lock으로 OrderedJSON 0.0.11을 준비한다(T2.84).

- 선택적 locked tool 설치를 지원하는 공개 Kit 0.0.61을 채택하고 PHPT coverage 임시 directory 보안 권고를 제거하도록 PHPUnit을 13.4.5로 갱신한다(T2.83-1).

- 여섯 native language 검사 job을 병렬 실행하고 shared contract와 parity 검증은 독립 job으로 유지한다. ci-passed가 모든 job을 요구하며 정확한 target coverage와 개별 실패 report를 유지한다(T2.83).

<a id="v0010"></a>
## 0.0.10

- kit 0.0.58의 다중 심벌 binding으로 기존 host 직렬화 API 단위에 Python 공개 JSONEncoder class와 default callback을 함께 선언합니다. 선언한 모든 심벌을 검사하고 모든 공개 심벌의 coverage를 유지합니다. (T2.82)

- 기능 기록을 Rust Value의 native Serde 통합 및 여섯 구현 모두의 중복 키 거부와 맞춘다. Benchmark 프로토콜은 구현된 상태로 유지하되 T2.48의 신뢰할 수 있는 재측정 전까지 검증을 미확인으로 기록하며 timing data는 바꾸지 않는다 (T1.60-2).

- 조건부 철회한 T2.80의 CI 작업을 현재 실행 계획에 따라 재검토한다. Kit K614-1, K614-1-1 및 K614-1-2 통합을 명시적으로 추적하고 artifact consumer proof를 유지하며 유휴 benchmark와 최종 hosted 증거 조건을 문서화한다 (T2.80-1).

- 릴리스 준비 단계에서 T2.66을 재검토한다. npm tarball consumer를 유지하고 이를 개발 소스로 대체하라는 요구는 철회한다. Artifact 설치는 배포 절차와 kit K438이 요구하는 consumer proof이며 소스 link는 배포 tarball을 검증하지 않는다. Consumer manifest와 lock은 이미 0.0.10을 가리킨다 (T2.66).

- 릴리스 준비 단계에서 T2.65를 재검토한다. Composer archive consumer를 유지하고 이를 개발 소스로 대체하라는 요구는 철회한다. Artifact 설치는 배포 절차와 kit K438이 요구하는 consumer proof이며 소스 설치는 배포 ZIP을 검증하지 않는다. Consumer manifest와 lock은 이미 0.0.10을 가리킨다 (T2.65).

- Workflow report 경로 기록을 Makefile이 사용하는 형제 kit.mk와 T1.60-1에서 반영한 구현에 맞춘다. 소유 workflow unit test 20개가 모두 통과한다 (T2.79).

- docs gate 전에 Git hook 설정과 workspace link를 준비하고 오프라인 suite lint 전에 형제 Rust checker crate를 다운로드한다 (T1.60-1-2). 새 setup 순서 회귀 테스트는 이전 workflow에서 실패하고 설치 단계를 추가한 뒤 통과한다.

- CI가 형제 Go symbol extractor를 빌드할 수 있도록 Go toolchain과 module을 1.27.3으로 맞추고 네 플랫폼의 toolchain lock을 다시 생성하며 검사 전에 형제 kit을 빌드하고 native npm 설치로 연결한다 (T1.60-1-1). 소유 workflow 테스트는 더 오래된 compiler를 거부하며 19개 case가 모두 통과하고 Go symbol extractor 설치가 성공한다.

- 완료한 CI bootstrap 수정이 소유 workflow unit test 18개와 TypeScript 컴파일을 통과한다 (T1.60-1).

- 저장소가 소유한 CI 및 push-gate job에서 모든 프로젝트 make target보다 먼저 형제 kit을 checkout하고 설치한다 (T1.60-1). 프로젝트 폴더에서 명령을 실행하고 workflow workspace 기준으로 setup 및 artifact 경로를 해석하며 선언된 CI 검사에 suppression-check를 포함한다. Workflow unit test가 checkout 및 bootstrap 순서를 검사한다.

- 모든 패키지 manifest에 릴리스 0.0.10을 준비하고 npm 및 Composer consumer lock을 다시 생성한다 (T1.60). 잠긴 fast-uri를 3.1.9, markdown-it을 14.3.3으로 갱신하여 보안 권고 세 건을 해결하고, 오래된 sprintf-js 보안 예외를 제거하며, Python build backend와 검증된 wheel digest를 setuptools 84.2.1로 맞춘다. dependency review에는 알려진 보안 권고가 없으며, dependency policy와 버전 검사가 통과하고, Python wheel이 오프라인으로 빌드되며, JavaScript 및 Python public API unit test가 통과한다.
- T2.79: 행을 완료로 기록한다. 변경은 main의 f343462에 있다 (T2.79)
- T2.76: 행을 완료로 기록한다. 삭제는 main에 refactor로 착지했다 (T2.76)
- T2.76: 행을 main 체크아웃에서 완료로 기록한다 (T2.76)
- T2.76: 행을 완료로 기록한다. 착지한 변경은 이 커밋 앞의 커밋이다 (T2.76)
- T2.74: K614 배치: kit-sync 사본을 지우고, 부트스트랩은 ../kit을 include하며, 공유 루트 파일은 ../kit 링크다 (T2.74)
- T2.73: 행을 완료로 기록한다. 착지한 변경은 이 커밋 앞의 커밋이다 (T2.73)
- T2.73: 추적되는 훅이 kit과 같다: K603에서 게이트를 뺀 pre-commit, prepare-commit-msg, reference-transaction을 커밋한다 (T2.73)
- T2.72: make hooks가 PRINCIPLES.md가 명명하는 .githooks/pre-merge-commit을 쓰고, rules-check가 통과한다 (T2.72)
- T2.71: ParseError는 KINDS에 없는 메시지를 빈 kind 대신 LogicException으로 거부한다 (T2.71)
- T2.70: packages/js/index.js의 UTF-8 decode catch는 오류를 바인딩하고 디코더의 TypeError로 좁히며, 다른 오류는 다시 던진다 (K561) (T2.70)
- make kit-sync가 install-mise.mts(kit K532)를 가져오고, owner 규칙이 각 언어의 source를 그 lint와 duplication-check로 보내며(kit K534) 지워진 파일을 이름 붙이지 않는다. red: make kit-check와 make owner-validate가 실패했고, 변경 뒤 green(T2.69).
- make kit-sync가 K514 이후 kit이 자기 패키지에서 읽는 lint 설정을 지우고, CHECK_TARGETS가 suppression-check를 실행한다. red: make kit-check가 낡은 사본에 15개 finding을 보고했다(T2.68).
- T2.64: package-lock.json은 GitHub 릴리스 tarball 대신 make npm-install DIR=.로 형제 체크아웃의 @polyspec/kit을 연결하며, ordered-json은 make kit-sync가 쓰는 kit 0.0.54의 복사본을 받는다. red: make link-state-check가 체크아웃의 mise trusted-configs를 신뢰하지 않는다는 finding으로 exit 2였고, green: make install-tools 후 make npm-install DIR=.와 make link-state-check가 exit 0. (T2.64)
- T1.59: changelog는 외부 구현과의 비교를 이름으로 적지 않는다. 그 비교는 외부 벤치마킹이므로 저장소에 두지 않는다 (T1.59).
- T2.60: ordered-json은 kit 8813c04a의 복사본(K354 K394 K386 K348-1 K360-2 K349-2 K392-1 K393)을 받는다. 복사본은 make kit-sync와 make hooks가 쓴다. red: make kit-check가 exit 2였고 scripts/kit/kit-bootstrap.mk와 scripts/kit/bootstrap/install-mise.mts가 @polyspec/kit 0.0.54와 달랐으며 config/commit-identity.json이 없었다. green: make kit-check와 make link-check가 exit 0. (T2.60)
- T2.59: ordered-json은 kit f9eb43dd의 복사본을 받는다. make kit-sync가 scripts/kit/kit-bootstrap.mk와 config/layout.kit.yml을 쓰고, make hooks가 .githooks/commit-msg를 쓴다. red: make kit-check가 설치된 kit과 다른 복사본 두 개로 exit 2였고, green: make kit-check가 exit 0. (T2.59)
- T2.58: 영문 CHANGELOG.md와 kit-standard 체크리스트의 한국어 쌍이 영문 원문의 source-sha256을 다시 기록한다. red: make docs-check가 67cd062 이후 두 marker가 낡았다고 보고했고, green: 통과한다. (T2.58)

- T2.57: Go package는 errcheck gate가 찾은 모든 오류를 처리한다(P8). `orderedjson.go`는 `Compact`의 오류를 panic하거나(`String`) 반환하고(`Array`, `Object`), literal은 `mustBuild`로 만들며, 이 함수는 내부 literal이 parse되지 않을 때만 panic한다. `api_test.go`는 test helper `must`로 각 호출을 확인한다. `internal/benchmark/main.go`는 Rust benchmark와 같은 방식으로 설정을 읽고(변수가 없으면 기본값, 양의 정수가 아니면 실행을 멈춤), `strconv`와 `json.Marshal`의 오류를 확인한다. `internal/probe/main.go`는 `StringUnits`의 오류를 확인한다. red: `make lint-go`가 exit 2, errcheck finding 33개(orderedjson.go 7, api_test.go 21, benchmark 3, probe 2)를 보고했고, green: `make lint-go`가 exit 0, issue 0개, deadcode passed, `make test-go CASES=Official` 18 passed, api test 29 passed. T2.56은 이 row로 합쳐졌다. (T2.57)
- T2.55: Rust 벤치마크 예제는 설정을 명시된 규칙으로 읽는다. 변수가 없으면 기본값을 쓰고, 양의 정수가 아닌 값이면 기본값으로 바꾸지 않고 실행을 멈춘다(P8, 삼킨 parse 오류 없음). red: `make lint-rust`가 exit 2, `examples/benchmark.rs`에서 `Result::ok` finding 4개를 보고했고, green: `make lint-rust`가 exit 0, `make test-rust CASES=api`가 1 passed. (T2.55)
- T2.54: PRINCIPLES.md, PRINCIPLES.ko.md, .golangci.yml, ruff.toml, scripts/kit/kit-bootstrap.mk는 로컬 수정이 아니라 @polyspec/kit 0.0.54의 K334와 K349 kit copy다. red: `make kit-check`가 exit 2, finding 5개(다섯 copy가 설치된 kit과 다름)를 보고했고, green: exit 0. (T2.54)
- T2.53: .gitignore가 link가 consumer에 쓰는 packages/go/go.work와 go.work.sum을 무시한다. red: git check-ignore가 두 파일 모두 무시하지 않는다고 보고했고, green: 두 파일 모두 무시한다고 보고한다. (T2.53)
- T2.52: config/owner-checks.json은 kit 복사본인 Rust lint 설정 clippy.toml에 kit 복사본의 소유 규칙을 준다. red: owner-validate가 clippy.toml을 어떤 소유자와도 맞지 않는 경로로 보고했고, green: 추적되는 모든 경로가 소유된다고 보고한다. (T2.52)
- 고정된 외부 입력은 mise의 tool입니다 (T2.7): `mise.toml`이 `http:pie`(release 1.4.10의 PHAR와 sha256)와 `http:jsontestsuite`(고정된 revision의 archive와 sha256)를 선언하고, `mise.lock`이 둘을 모든 platform에서 pin하며 `make install-tools`가 `var/tools/mise/installs`에 설치합니다. `scripts/external-inputs.mts`, 그 test, target `ordered-json-install-external`, 변수 `PIE`, `.cache` 사본은 없어졌습니다. `scripts/records.mts`의 `externalPins`는 release, PHAR hash, revision을 `mise.toml`에서 읽고 `external-inputs.json`은 suite archive의 사실(case 318개와 그 입력의 digest)만 둡니다. Red: K327 전에는 `make toolchain-lock`이 `http:pie`를 거부했고 `scripts/external-inputs.mts`는 이 항목이 대체한다고 분류됐음; green: `make rebuild-check`, `toolchain-check`, `dependency-policy-check`, `divergence-check`, `lint-ts` exit 0, 설치된 suite는 고정된 case 318개와 digest를 가짐, `scripts/verify.mts --suite`가 js에서 416 case passed, `make pie-check`가 설치된 PIE로 확장을 빌드하고 통과, evidence와 environment test passed.
- 어느 구현의 code나 test도 다른 구현에 따라 갈라지지 않습니다 (T2.51): PHP 라이브러리는 source를 무조건 올리고(`src/bootstrap.php`와 그 `extension_loaded` guard는 없어짐), verifier의 probe와 PHP benchmark는 실행이 올린 것을 그대로 쓰고(순수 라이브러리는 Composer autoloader의 `auto_prepend_file`, 확장은 아무것도 없음) backend를 단정하지 않으며, `packages/php/phpunit.xml`은 `bootstrap`을 버려 kit의 확장 실행(K329)이 라이브러리 source를 올리지 않고, `config/duplication.json`과 `config/parity.json`의 예외 이유 둘은 kit이 정의한 종류(`test:`, `harness:`)로 시작하며, `divergence-check`가 `CHECK_TARGETS`와 `ci.yml`의 첫 job에 들어갑니다. Red: `make divergence-check` exit 2, divergence 4건(이유 2건, `bootstrap.php:7`, `probe.php:15`)과 guard를 없애면 `make test-php-ext`가 `Cannot redeclare function parse()`로 fatal; green: `make divergence-check` exit 0, `make test-php-ext CASES=Test` test 45개 assertion 202개(`make test-php`와 같음), php와 php-extension의 `scripts/verify.mts` passed, `make typecheck`, `make lint-php` passed.
- PRINCIPLES 사본은 `make kit-sync`가 쓴 설치된 kit의 것과 같습니다 (T2.50). Red: `make kit-check` exit 2, 2건; green: exit 0.
- Python test는 package입니다 (T2.25): `packages/python/tests/__init__.py`로 `make test-python`이 case를 고르고, kit K324가 package 환경의 interpreter로 실행하므로 설치된 package를 import할 수 있습니다(S3). editable install의 build 디렉터리는 ignore합니다. Red: `make test-python CASES=public_api`가 디렉터리를 거부하고 이어서 `ModuleNotFoundError: polyspec`로 실패; green: `make test-python CASES=depth_limit` 1 passed, `CASES=public_api` 1 passed.
- PRINCIPLES 사본은 `make kit-sync`가 쓴 설치된 kit의 것과 같습니다 (T2.49). Red: `make kit-check` exit 2, 2건; green: exit 0.
- benchmark는 `make build-php-ext`가 게시한 확장(registry의 `builtExtension`)을 올리고, Go zero-copy 파싱, PHP 확장, 이 계획의 Rust와 Go 변경 뒤 clean checkout에서 `benchmarks/results.json`을 다시 측정합니다 (T2.47). Red: `make benchmark`가 PIE 경로를 읽어 `the PHP extension of the benchmark was not built`로 멈춤; green: `make benchmark` exit 0, `source.dirty` false, 비교는 `not-comparable`(환경이 commit된 baseline과 다름); `make typecheck` passed.
- PRINCIPLES 사본은 `make kit-sync`가 쓴 설치된 kit의 것과 같습니다 (T2.46). Red: `make kit-check` exit 2, 2건; green: exit 0.
- `CHECK_TARGETS`와 `ci.yml`의 첫 job이 `bypass-check`를 실행합니다 (T2.45). test, script, Makefile이 CI를 흉내 내거나 gate를 최신으로 가정하거나 hook을 건너뛰면 실패하는 kit의 gate입니다. Red: `make kit-check` exit 2, `CHECK_TARGETS runs no bypass-check`; green: exit 0, workflow-rules test passed.
- PRINCIPLES 사본은 `make kit-sync`가 쓴 설치된 kit의 것과 같습니다 (T2.44). Red: `make kit-check` exit 2, 2건; green: exit 0.
- php-lint 사본은 `make kit-sync`가 쓴 설치된 kit의 것과 같습니다 (T2.43). Red: `make kit-check` exit 2, 2건(`config/php-lint/composer.json`과 `composer.lock`이 다름); green: exit 0.
- Rust에는 `Value`의 Serde trait 구현만 있습니다 (T2.42): 자체 serializer, `to_string`, `from_str`, `from_slice`, `Error`를 가진 `serde` 모듈(`serde_json`의 사본, S1)을 test, fixture 2개, 의존성 `serde_ignored`와 함께 없앱니다. `serde_json`이 값을 담은 모든 구조를 contract bytes로 인코딩하고 디코딩하며 `Deserialize`는 Go `UnmarshalJSON`처럼 일반 문법으로 파싱합니다. Red: 명세(T2.40)와 Go 쪽에는 typed codec이 없는데 Rust는 여전히 내보냄(`serde` 아래 공개 symbol 13개, 456줄); green: cargo test 24 + 2 + 17 + 3 passed, `scripts/verify.mts --only rust`, `make lint-rust`, `make parity-declarations-check`, `make dependency-policy-check` exit 0.
- Go `Value`는 `json.Marshaler`와 함께 `json.Unmarshaler`를 구현하고 (T2.41), `encoding/json`의 사본인 package의 typed `Marshal`(S1)은 test 13개, fuzz test, interface `Marshaler`와 함께 없앱니다. `encoding/json`이 값을 담은 모든 구조를 contract bytes로 인코딩하고 디코딩합니다. API unit `api-host-typed-*`와 `api-host-error`는 `api-host-deserialization`으로 대체하고 `api-host-serialization`은 Rust에 `Value::compact`를 선언합니다. Red: `make test-go CASES=HostDeserialization` 실패(`UnmarshalJSON` 없음); green: `Host`, `Parse`, `Stringify` go test 7개 passed, `scripts/verify.mts --only go` passed, `make lint-go` passed, `make parity-declarations-check` exit 0.
- 명세는 native JSON 통합만 말합니다 (T2.40): Go `Value`는 `json.Marshaler`와 `json.Unmarshaler`를, Rust `Value`는 Serde `Serialize`와 `Deserialize`를 구현하며, `encoding/json`과 `serde_json`을 중복하던 Go의 typed `Marshal`과 Rust의 `serde` 모듈은 명세에서 뺍니다(S1). 코드는 T2.41과 T2.42에서 따릅니다. Red: 명세가 두 typed 인코더를 설명했음; green: `make docs-check` passed.
- Rust의 `string_value()`는 문자열의 WTF-8 바이트(`Vec<u8>`)를 반환하므로 (T2.39) 이스케이프된 짝 없는 surrogate는 거부되지 않고 Go, PHP, JavaScript, Python처럼 유지됩니다. Red: `b"a\xed\xa0\x80"`를 기대하는 test가 `String`에 대해 compile되지 않음; green: cargo test api 24개와 official 17개 passed, `scripts/verify.mts --only rust` passed, `make lint-rust` passed.
- 명세는 RQ-009를 모든 구현에서 성립시킵니다 (T2.38): `docs/operations/api.md`(.ko)는 더 이상 Rust가 짝 없는 surrogate의 `string_value()`를 거부하게 두지 않으며 Go, PHP, Rust는 그 WTF-8 바이트를 반환합니다(Rust는 `Vec<u8>`). Red: 명세가 Rust의 예외를 적었음; green: `make docs-check` passed; 코드는 T2.39에서 따릅니다.
- `config/parity.json`의 모든 unit은 모든 구현에서 성립하고 test가 이름으로 적은 requirement를 인용합니다 (T2.4): profile, `nativeOnly`, `exclusions`는 없어졌고(S6), 하위 항목 T2.4-1부터 T2.4-4가 R1, R2, R13, R15 결과를 닫았으며, 여섯 구현의 extractor는 어느 unit도 선언하지 않은 공개 symbol을 나열하지 않습니다. Red: `make parity-declarations-check` exit 2, schema 결과 98건에 이어 R1, R2, R13, R15 결과 432건; green: exit 0, `every declaration holds`.
- 모든 unit의 모든 feature는 모든 구현에 binding이 있습니다 (T2.4-2): R2 결과(missing binding 172건: php 35, python 31, js 31, rust 29, php-extension 25, go 21)는 기존 동작의 binding(T2.26, T2.27, T2.28), 라이브러리를 따르는 PHP와 확장 test(T2.15-3, T2.22), 중립 host 직렬화 unit(T2.37), 없앤 unit만 인용하던 requirement(RQ-003, RQ-010, RQ-011)의 unit으로 닫았습니다. Red: `make parity-declarations-check` R2 172건; green: `every declaration holds`.
- 모든 API unit은 모든 구현의 symbol을 선언합니다 (T2.4-1): R1 결과(missing implementation 84건: php-extension 41, php 15, python 14, js 14)는 확장의 구현(T2.15-3), `Kind` 열거형(T2.35), 중립 object entry, byte 입력, 오류, host 인터페이스 unit(T2.34, T2.37), Go zero-copy 파싱 제거(T2.33)로 닫았습니다. Red: `make parity-declarations-check` R1 84건; green: `every declaration holds`이며 여섯 구현의 extractor가 선언 없는 공개 symbol을 나열하지 않음.
- 모든 언어의 host JSON 인터페이스를 중립 unit으로 binding합니다 (T2.37): `host_serialization_boundary`(host 인코더를 거친 값: Rust `serde_json::to_string`, Go `json.Marshal`, JavaScript, PHP, Python의 거부)와 새 `host_serialization_embeds_values`(값을 담은 native 구조). typed 형태의 unit 20개(`serde_*`, `marshal_*`)는 이들로 대체하고 그 test는 package test로 남깁니다(`packages/go/marshal_test.go`와 fuzz test는 `api_test.go`로 들어감). Python에 `ordered_json.JSONEncoder`를 두어 `default`가 `Value`를 거부하고 `stringify`를 가리키게 하며, Go는 자체 `Marshaler` 대신 표준 라이브러리의 `json.Marshaler`를 쓰고, Rust `serde::Error`는 variant를 숨깁니다. API unit 11개가 typed 형태와 남은 accessor를 각 언어의 symbol과 짝짓고, unit `arrays_and_objects_stay_distinct`(RQ-003), `number_tokens_are_kept_exactly`(RQ-010), `serialization_is_idempotent`(RQ-011)는 없앤 unit만 인용하던 requirement를 test합니다. Red: `make parity-declarations-check` R2 99건(5개 언어에서 host unit 20개 없음)과 extractor가 읽은 선언 없는 공개 symbol 38개; green: `every declaration holds`, 여섯 구현 모두 R1과 R11 없음; 모든 test passed, 여섯 구현의 `scripts/verify.mts` passed, lint passed.
- 명세는 RQ-020을 하나의 규칙으로 말합니다 (T2.36): 모든 언어는 값을 표준 JSON 직렬화 인터페이스와 통합하며, 그 인터페이스는 contract bytes를 쓰거나(Go `encoding/json`, Rust serde, native 구조 안에서도) 거부하며 라이브러리 직렬화기를 가리킵니다(JavaScript, PHP, Python). `docs/operations/api.md`(.ko)는 각 언어의 인터페이스를 이름 붙이고 Go의 typed `Marshal`과 Rust의 `serde::to_string`을 그 규칙을 native 구조 전체로 넓힌 확장으로 제시합니다. Red: RQ-020은 호스트 인코더가 거부하고 typed Go 인코더가 표준과 일치한다고 말해 Rust와 다른 언어가 binding할 수 없었음; green: `make docs-check` 문서 쌍 30개 passed.
- 종류 이름은 모든 구현의 열거형 `Kind`입니다 (T2.35): `packages/js/index.d.ts`의 TypeScript enum과 `index.js`의 frozen 객체 `Kind`, Python의 `StrEnum` `Kind`(`Value.kind`는 문자열과 같은 그 멤버를 반환), PHP의 backed enum `Polyspec\\OrderedJson\\Kind`(확장도 stub에서 등록하며 Reflection이 userland enum을 final로 보고하므로 final로 표시); `docs/operations/api.md`(.ko)가 열거형을 명세하고 `api-kind-*` unit 7개가 각 구현의 symbol을 선언합니다. Red: `make parity-declarations-check` R1 28건(js, php, php-extension, python의 kind unit); green: R1 0건. 확장 유무의 PHPUnit test 41개 assertion 188개 passed, unittest passed, `scripts/verify.mts` probe 4개 passed, `make lint-ts`, `lint-php`, `lint-python`, `lint-php-ext`, `typecheck` passed.
- object entry, byte 입력, 오류 message는 중립 API unit입니다 (T2.34): `api-ordered-map*`는 Rust와 Go의 `OrderedMap`과 함께 JavaScript, PHP, Python, php-extension의 `Value` members, get, object를 선언하고, `api-parse-bytes`는 PHP의 byte 입력으로 `parse`를, `api-parse-error-message`는 표준 예외 message를 가진 `ParseError` class를 선언하며, `ordered_map_rejects_non_string_key`는 PHP와 확장에 `testOrderedMapRejectsNonStringKey`를 binding합니다(PHP 배열 키는 문자열 또는 정수이므로 다른 키는 객체에 닿지 않음). `docs/operations/api.md`(.ko)의 Go 문장은 더 이상 `ParseBytesBorrowed`를 말하지 않습니다. Red: `make parity-declarations-check` R1 58건, R2 101건; green: R1 28건(Kind unit), R2 99건. PHPUnit `NonStringKey`는 확장 유무와 관계없이 통과합니다.
- Go에는 zero-copy 파싱이 없습니다 (T2.33): `ParseBytesBorrowed`, 그 `flagBorrowed` 처리, test, unit `borrowed_input_is_copied_on_access`는 contract 밖이므로(S6은 native 전용 symbol을 허용하지 않음) 없애며 Go benchmark는 `ParseBytes`로 파싱합니다. benchmark README와 API 표도 더 이상 이를 적지 않습니다. Red: `make parity-declarations-check` R2 missing-binding이 `borrowed_input_is_copied_on_access`에서 5개 구현; green: 그 5건이 없어짐; go test 6 passed, `scripts/verify.mts --only go` passed, `make lint-go` passed. commit된 Go benchmark 결과는 이 변경보다 앞서므로 다른 것과 함께 다시 측정합니다.
- `CHECK_TARGETS`와 CI job은 kit-gates의 모든 gate를 실행합니다 (T2.21): parity 선언이 profile을 잃은 뒤(T2.4) schema 결과 98건이 없어졌습니다. Green: `make kit-check` exit 0, `tests/scripts/workflow-rules.test.mts` 17 passed.
- `CHECK_TARGETS`와 `ci.yml`의 첫 job이 `link-state-check`를 실행합니다 (T2.32). 설치된 0.0.x polyspec package가 link 사이의 사본이면 실패하는 kit K305의 gate입니다. Red: `make kit-check` exit 2, `CHECK_TARGETS runs no link-state-check`; green: exit 0, workflow-rules test passed.
- PRINCIPLES 사본은 K304부터 K307 뒤 `make kit-sync`가 쓴 설치된 kit의 것과 같습니다 (T2.31). Red: `make kit-check` exit 2, 2건; green: exit 0.
- 확장은 확장을 올리고 실행한 `packages/php`의 PHPUnit 파일로 test합니다 (T2.19): `packages/php-ext`에는 그 사본, `phpunit.xml`, `autoload-dev`, `packages/php`로 향하는 상대 경로가 없으며(T2.15-3에서 없앰), `config/parity.json`은 php-extension 구현을 `packages/php/tests`에 binding합니다. Red: 확장이 자체 하위 class `OfficialTest`와 `ValueApiTest`, `composer.json`의 `../php/` 경로를 가졌고 `make test-php-ext`를 빌드할 수 없었음; green: `make test-php-ext CASES=Test` test 40개 assertion 185개 passed.
- PHP 확장은 PHP 라이브러리의 class와 함수를 같은 이름과 signature로 등록합니다 (T2.15): 명세, 라이브러리의 비공개 내부, C 구현은 하위 항목 T2.15-1부터 T2.15-3입니다. `make lint-php-ext` exit 0이며 `make test-php-ext`의 Reflection 비교를 통과했습니다.
- 확장은 PHP 라이브러리를 C로 구현합니다 (T2.15-3): `Polyspec\OrderedJson\Value`(그 node들이 공유하는 참조 횟수 tape 위의 Zend object), `ParseError`, 함수 `parse`와 `stringify`, 상수 `MAX_DEPTH`를 stub과 arginfo header에서 `packages/php`의 이름과 signature로 등록합니다(라이브러리는 stub이 쓸 수 없는 `self` 대신 `Value`를 반환). descriptor 함수 `ordered_json_scan`, `ordered_json_hydrate`, `ordered_json_compact_node`, `NativeParseError`, 상수 `ORDERED_JSON_VERSION`, 이를 test하던 unit 10개, RQ-021, `packages/php-ext`의 test는 없앴습니다: 확장은 `packages/php`의 PHPUnit 파일을 확장을 올리고 실행해 test하며 `config/parity.json`이 php-extension 구현을 그 파일에 binding하고 symbol을 선언합니다. `packages/php-ext`는 package를 잠그지 않습니다. Red: `make test-php-ext`가 `NativeParseError`, `ordered_json_compact_node`, `ordered_json_hydrate`, `ordered_json_scan`을 라이브러리 선언 없이 등록되었다고 나열; green: `make lint-php-ext` exit 0, Reflection 비교 통과, `make test-php-ext CASES=Test` test 40개 assertion 185개(`make test-php`와 같음), `scripts/verify.mts --only php-extension` 공식 예제 17 + 공유 case 98 passed.
- PHP test는 더 이상 확장이 로드되지 않았음을 단정하지 않습니다 (T2.22): `packages/php/tests`의 `OfficialTest`와 `ValueApiTest`가 test class 자체이며(abstract `*TestCase` class와 backend만 단정하던 하위 class는 없앴음), `make test-php`가 순수 PHP 라이브러리에서, `make test-php-ext`가 같은 파일을 확장을 올리고 실행합니다(S10). Red: 확장을 올리면 모든 case가 `these tests cover the pure PHP backend; run them without the polyspec_ordered_json extension`로 실패; green: `make test-php CASES=Test` 40 passed, assertion 185개(확장 실행은 T2.15-3에 포함).
- PHP 라이브러리는 내부를 비공개로 둡니다 (T2.15-2): `Parser`, `Tape`와 helper 함수 10개는 더 이상 공개 symbol이 아닙니다. scanner는 `Value`의 private static method이고 tape 상수와 UTF-8 helper도 그 private static method이므로 공개 symbol은 `Value`, `ParseError`, `parse`, `stringify`, `MAX_DEPTH`입니다. Composer `files` 항목인 `src/bootstrap.php`는 확장이 같은 상수와 함수를 등록하므로 확장이 없을 때만 `src/OrderedJson.php`를 require하며, test는 더 이상 라이브러리 helper를 호출하지 않습니다(`ProbeTree::units`). Red: kit의 symbol extractor가 읽은 `packages/php/src`의 공개 symbol 56개(API 밖 26개); green: 30개로 API와 정확히 같음; PHPUnit `Value` 24, `Official` 17 passed, `scripts/verify.mts --only php` passed, `make lint-php` passed.
- 명세는 확장이 PHP 라이브러리를 구현한다고 말합니다 (T2.15-1): scan descriptor에 관한 RQ-021을 `docs/spec/json-contract.md`(.ko)에서 없애고, `docs/operations/api.md`(.ko)는 PHP 라이브러리의 공개 symbol(`Value`, `ParseError`, `parse`, `stringify`, `MAX_DEPTH`)을 나열하며 확장이 이를 같은 이름과 signature로 등록하고(S10) 자기 package의 version을 보고한다고 말하고, `docs/operations/installation.md`(.ko)는 `make build-php-ext`로 빌드하며 더 이상 package의 version을 적지 않습니다. Red: 명세가 `ordered_json_scan`, `ordered_json_hydrate`, `ordered_json_compact_node`를 설명했고 표가 0.0.9인 package에 0.0.3을 적었음; green: `make docs-check` 문서 쌍 30개 passed.
- `AGENTS.md`의 모든 규칙은 `Own:`으로 시작합니다 (T2.30): 62개 규칙은 이 저장소 자신의 용어를 말하며, 외부 생태계의 표준 도구에 관한 원칙(P14)을 되풀이하던 규칙은 한국어 쌍과 함께 제거했습니다. Red: `make rules-check` exit 2, 91건(그중 62건이 `begins with neither Own: nor Refines`); green: exit 0, `every rule names its check; 13 rules are enforced by no tool`.
- PRINCIPLES 사본은 K299부터 K303 뒤 `make kit-sync`가 쓴 설치된 kit의 것과 다시 같습니다 (T2.29)(원칙은 P1…, S1… id를 가짐). Red: `make kit-check` exit 2, 2건; green: exit 0.
- Rust, Go, PHP는 UTF-8과 surrogate unit을 binding합니다 (T2.28): PHP의 `bytes_input_is_validated`(string이 byte 입력), Rust, Go, PHP의 `text_input_rejects_lone_surrogates`(text의 짝 없는 surrogate 원문의 WTF-8 byte는 문법 전에 surrogate 위치에서 invalid UTF-8로 거부), Rust, Go, PHP의 `string_value_keeps_an_unpaired_surrogate`. 이스케이프된 짝 없는 surrogate의 string value는 거부하지 않고 library 형태로 유지합니다: Go(`StringValue`)와 PHP(`stringValue`, `tokenText`는 flag를 잃음)는 WTF-8이고, String이 담을 수 없는 Rust는 `string_units`를 가리키며 여전히 거부합니다. `docs/operations/api.md`(.ko)에 규칙을 명세했습니다. Red: Go `StringValue() = "", unpaired surrogate; use StringUnits`, PHP `UnexpectedValueException: Unpaired surrogate`; parity R2 172건; green: go test 4 passed, PHPUnit 5 passed, cargo test 4 passed, `scripts/verify.mts --only go,php` passed, lint-go, lint-php, lint-rust passed, R2 158건.
- Go package는 요청 시 반복된 decode된 object key를 거부합니다 (T2.27): `ParseRejectDuplicates(source)`는 어느 깊이든 두 번째 key token의 첫 byte에 `duplicate object key`(kind `duplicate_object_key`)를 보고하며 이스케이프로 쓴 같은 key도 포함합니다. `Parse`는 공통 동작을 유지합니다. Go binding은 `docs/operations/api.md`(.ko)에 명세하고, unit `strict_parse_rejects_duplicate_keys`와 `strict_parse_accepts_unique_keys`가 `TestStrictParse*`를 binding하며, API unit `api-parse-reject-duplicates`가 모든 구현의 symbol을 선언합니다. Red: `make test-go CASES=StrictParse` build error `undefined: ParseRejectDuplicates`, parity R2 172건(go 2건); green: 2 passed, `scripts/verify.mts --only go` passed, `make lint-go` passed, R2 168건(R1 85건: 새 unit에 php-extension symbol이 없음, T2.15 항목).
- Rust API는 type이 본질적으로 보장하는 contract 동작을 test합니다 (T2.26): `values_come_only_from_the_library`(RQ-012: parser와 factory만이 생성자이며 각각 검증함)와 `returned_collections_are_immutable`(RQ-013: members와 items는 공유 참조이고 바꾼 사본은 원래 값을 그대로 둠)이며 둘 다 `packages/rust/tests/api.rs`에 binding합니다. Red: `make parity-declarations-check` R2 missing-binding 172건 중 이 unit의 rust 2건; green: R2 170건. `cargo test --test api` 2 passed, `make lint-rust` passed.
- 각 test는 parity unit이 인용한 requirement를 이름으로 적습니다 (T2.4-4): 모든 binding(js, rust, go, python, php, php-extension case)의 test 위에 `Requirements: RQ-nnn` 주석을 두고, 하위 class가 상속한 case를 실행하는 곳에는 class 문서를 둡니다. Red: `make parity-declarations-check` R15 unnamed-requirement 178건; green: R15 0건(R1 84건과 R2 172건은 T2.4-1과 T2.4-2 항목에 남음). T2.4-3 test의 서식도 함께 고쳤습니다: `make lint-php`, `make lint-python`, `cargo fmt --check` 통과.
- 확장은 자기 package의 version을 보고합니다 (T2.16): `config.m4`가 `../composer.json`(package, PIE build, kit의 build 모두에서 `src/` 옆에 있음, K295)에서 `PHP_POLYSPEC_ORDERED_JSON_VERSION`을 정의하고, `ordered_json.c`가 이를 쓰며, 상수 `ORDERED_JSON_VERSION = 0.0.1`은 없앴고, verifier의 `extension_version` runtime 검사는 같은 C 파일의 상수가 아니라 `composer.json`의 version과 `phpversion('polyspec_ordered_json')`을 비교합니다. Red: `runtimeVersions(['php-extension'])`가 `phpversion('polyspec_ordered_json') '0.0.1' differs from the version 0.0.9 of composer.json`으로 실패; green: `{ php: '8.4.26', extension_version: '0.0.9' }`, `scripts/verify.mts --only php-extension` passed, registry test 7 passed, `make release-versions TAG=v0.0.9` passed.
- PHP 확장은 S10을 따릅니다 (T2.8): 이름 `polyspec/ordered-json-php-ext`와 `polyspec_ordered_json`, `@generate-function-entries`를 가진 stub 하나, `make php-ext-arginfo`가 쓰고 손으로 쓴 arginfo와 function table 대신 `ordered_json.c`가 include하는 추적되는 arginfo header, 그리고 `var/php-ext/polyspec_ordered_json.so`를 빌드하는 `make build-php-ext`이며, verifier(`scripts/registry.mts`), PIE 검사, `config/parity.json`, `make parity-check`가 이를 불러옵니다. 제자리 빌드인 `make php-extension`은 없앴습니다. Red: `make lint-php-ext` exit 2(arginfo header 없음, K290 전에는 `make php-ext-arginfo`가 kit에서 실패); green: `make lint-php-ext` exit 0, `make build-php-ext`가 library를 빌드, `scripts/verify.mts --only php-extension` 공식 예제 17 + 공유 case 98 passed, registry test 7 passed.
- 의존성 review 기록은 manifest 및 lock과 일치하고 모든 registry 의존성이 최신 stable release입니다 (T2.20): PHPUnit 13.4.3, ruff 0.17.1, setuptools 84.2.0(kit K296 뒤 `make dependency-review UPDATE=1`이 pin). Red: `make dependency-policy-check` exit 2, 4건(2026-10-15 review 뒤의 lock), 이어서 1건(setuptools); green: exit 0.
- PRINCIPLES 사본은 K282부터 K297의 반영 뒤 `make kit-sync`가 다시 쓴 설치된 kit의 것과 같습니다 (T2.24). Red: `make kit-check` exit 2, 2건(PRINCIPLES.md와 PRINCIPLES.ko.md가 다름); green: exit 0.
- `config/rebuild.json`은 `paths`를 두지 않고, kit이 layout으로 찾은 모든 tool이 class를 가집니다 (T2.18): benchmark tool 6개는 이유와 함께 `policy`이고, kit(K294)은 vendor된 사본을 더 이상 보고하지 않습니다. Red: `make rebuild-check` exit 2(`paths`, 이어서 미분류 사본 9건); green: exit 0, `every tool that config/rebuild.json selects has its class`.
- 언어마다 손으로 쓴 parser는 남기고, 그 생태계 reader가 실패하는 contract case를 적은 rebuild 기록을 둡니다 (T2.23): `docs/rebuild/json-js.md`(JSON.parse: 115개 중 106, RQ-001 정수 모양 key 순서), `json-go.md`(encoding/json Token: 102, RQ-009와 RQ-007), `json-python.md`(json.loads: 114, RQ-004와 RQ-006), `json-php.md`(json_decode: 99, RQ-010과 RQ-009), `json-rust.md`(serde_json: 105, RQ-010과 RQ-009)이며 각각 `config/rebuild.json`에서 `record`로 분류합니다. Red: case를 적은 기록이 없었음; green: `make rebuild-check` exit 0, `make docs-check` 문서 쌍 30개 passed.
- RQ-023과 RQ-024처럼 어느 unit도 인용하지 않던 requirement를 두 feature unit이 test합니다 (T2.4-3): `public_api_exports_the_entry_points`(RQ-023: parse, serialization, factory, accessor 함수)와 `parse_error_exposes_kind_offset_and_message`(RQ-024)이며, js, rust, go, php, python과 php-extension binding(상속한 PHP test case 실행)에 각각 test가 있습니다. Red: `make parity-declarations-check` R13 untraced-requirement 2건(RQ-023, RQ-024); green: R13 0건. Test: node:test 2 passed, cargo test 2 passed, go test 2 passed, PHPUnit 2 passed, unittest 2 passed; 확장 실행은 T2.8을 기다립니다.
- PRINCIPLES 사본은 설치된 kit 0.0.54의 것과 같습니다 (T2.17). `make kit-sync`가 씁니다. Red: `make kit-check` exit 2, 101건 중 `PRINCIPLES.md`와 `PRINCIPLES.ko.md`가 다르다는 2건; green: 99건, PRINCIPLES에 관한 것은 없음(남은 것은 parity와 rebuild 설정이며 T2.4와 T2.18 항목).
- `config/duplication.json`은 `packages/*/tests/**`를 제외합니다 (T2.14). 이유는 kit이 자신의 test에 쓴 것과 같습니다: test는 case를 온전히 적습니다. Red: `make duplication-check` exit 2, package test에만 3건; green: exit 0, `no piece of code exists twice`.
- `config/dependency-policy.json`의 Composer platform은 PHP 8.4.1입니다 (T2.13). 세 manifest와 lock의 값이며 PHPUnit 13.4.2가 필요로 합니다(kit K259). Red: `make dependency-policy-check` exit 2, 10건 중 규칙 `platform` 6건; green: 4건, `platform`은 없음; 남은 4건은 2026-10-15 review 뒤에 바뀐 lock이며 kit K283 뒤에 `make dependency-review RECORD=1`로 기록합니다.
- Rust serializer는 각 코드 조각을 한 번만 적습니다 (T2.12). `Writer::float`가 float를 검사하고 쓰며, `Writer::variant`가 tuple 또는 struct variant의 object를 열고, `Compound::raw_field`가 raw JSON field를 받으며, 매크로 `compound_elements`와 `compound_fields`가 compound의 동일한 trait 구현을 만들고, 동작은 바뀌지 않습니다. Red: `make duplication-check` exit 2, 9건 중 `packages/rust/src/serde.rs`에 6건; green: 3건, `packages/rust`에는 없음; `cargo test --locked --offline` 41 tests ok, `scripts/verify.mts --only rust` 통과, `make lint-rust` 통과.
- Python parser는 member와 item의 scalar value를 하나의 method로 만듭니다 (T2.11). `_nested_scalar`가 인라인된 두 사본을 대신하고 그것만 쓰던 지역 변수는 사라지며, 동작은 바뀌지 않습니다. Red: `make duplication-check` exit 2, 10건 중 `packages/python/src`에 1건; green: 9건, `packages/python/src`에는 없음; `packages/python/tests`의 unittest 39 tests OK, `scripts/verify.mts --only python` 통과, `make lint-python` 통과; `benchmarks/python-parse/run.py` 비율은 이후 2.57~2.90(한도 3.0), 이전 2.40~2.99.
- PHP 패키지는 code point의 UTF-8 인코딩을 하나의 함수로 적습니다 (T2.10). `codePointToUtf8`이 `unitsToUtf8`과 `tokenText`를 돕고, 동작은 바뀌지 않습니다. Red: `make duplication-check` exit 2, 11건 중 `packages/php/src`에 1건; green: 10건, `packages/php/src`에는 없음; `packages/php`의 PHPUnit 35 tests OK, `scripts/verify.mts --only php` 통과, `make lint-php` 통과.
- Go 패키지는 각 코드 조각을 한 번만 적습니다 (T2.9). `marshalList`가 slice와 array의 요소를 쓰고, `writeShortEscape`가 `writeString`과 `StringFromUnits`를 위해 JSON string의 escape를 쓰며, 동작은 바뀌지 않습니다. Red: `make duplication-check` exit 2, 13건 중 `packages/go`에 2건; green: 11건, `packages/go`에는 없음; `go test ./...` ok, `scripts/verify.mts --only go` official 예제 17개 + 공유 case 98개 통과, `make lint-go` 통과.
- PHP 확장은 S10 표준의 이름을 따릅니다 (T2.8). PIE 패키지는 `polyspec/ordered-json-php-ext`(release asset `polyspec-ordered-json-php-ext-php-X.Y.Z.zip`), 확장과 module은 `polyspec_ordered_json`이며 `PHP_NEW_EXTENSION`과 `--enable-polyspec-ordered-json`이 따르고, stub은 `src/polyspec_ordered_json.stub.php`이며, 라이브러리, test, verifier와 parity 선언은 `polyspec_ordered_json`을 로드합니다. arginfo header는 열려 있습니다: `make php-ext-arginfo`가 kit에서 실패합니다. Red: `make lint-php-ext` exit 2, 4건; 공유 probe가 이름을 바꾸지 않은 `extension_loaded('ordered_json')`을 거부했습니다(`Unexpected PHP parser backend`, 115 case 중 1건); green: `scripts/verify.mts --only php-extension` official 예제 17개 + 공유 case 98개 통과, registry와 evidence test 17 passed, `make lint-php-ext`는 1건(arginfo header)만 남습니다.
- `config/rebuild.json`은 `scripts/*.mts`의 각 tool의 class를 선언합니다 (T2.6). mdast, PIE, ajv, momoa는 ecosystem, verifier와 그 registry, records, `present`는 policy, `external-inputs.mts`는 replaced이며 T2.7이 이를 mise의 http backend로 옮깁니다. Red: `make rebuild-check` exit 2, `config/rebuild.json does not exist`; green: exit 0, `every tool that config/rebuild.json selects has its class`.
- kit-standard 체크리스트의 한국어 문서는 영어 원본의 revision을 담습니다 (T2.5). 번역을 영어 행과 비교해 일치함을 확인한 뒤 `make documents-stamp`가 source-sha256을 썼습니다. Red: `make docs-check` exit 2, `1 findings in 25 document pairs`(revision); green: exit 0.
- parity unit은 JSON 계약의 요구사항 RQ-001부터 RQ-024까지를 인용하고(kit K273), JavaScript probe는 폴더를 옮긴 뒤의 `packages/js/tests/probe.mjs`에서 실행하며, workflow 검사는 kit이 vendor하는 workflow를 제외합니다(T2.3).
- 패키지는 AGENTS, CHANGELOG와 Makefile을 두지 않습니다 (T2.2). 각 패키지는 루트 `AGENTS.md`와 `CHANGELOG.md`에 절을 가지며, 검사와 테스트는 루트 Makefile의 target(`ordered-json-<package>-check`와 `ordered-json-<package>-test`)입니다. `config/layout.yml`의 layout 예외는 제거되었습니다. 모든 Composer manifest의 PHP platform은 8.4.1이며 Composer lock을 다시 잠갔습니다. T2.1에서 Makefile이 잃은 recipe를 되돌렸습니다 (`verify-*`, `verify-all`, `typecheck`, `evidence-check`, `release-config-check`, `pie-check`, `benchmark`, `benchmark-check`, `ordered-json-test-scripts`와 `ordered-json-install-external`). 체크리스트에는 상위 행 T1.29가 있으며, 비교 대상 제품명은 변경 기록과 체크리스트에서 더 이상 적지 않습니다.
- 저장소는 kit 표준 0.0.54를 따릅니다 (T2.1): 실행 체크리스트를 `docs/plans/execution/`으로 옮기고, 문서와 테스트 폴더를 layout의 폴더로 옮기며 (`docs/operations/documentation-plan.md`, `docs/operations/proposals.md`, `packages/js/tests`), `install`은 kit의 bootstrap `install-kit`을 `ordered-json-install`보다 먼저 실행하고, workflow `.github/workflows/gates.yml`을 kit에서 vendor하며, 다른 프로젝트와의 비교 도구와 그 보고서를 제거합니다.
- T1.58: AGENTS는 kit `docs/plans/local-links.md`의 local link를 가리킵니다. polyspec 버전이 0.0.x인 동안 개발 checkout은 설치된 polyspec package를 그 source에 link하며, link는 commit하지 않습니다.
- T1.57: 공유 도구는 `@polyspec/kit` 0.0.53입니다.
- T1.56: 공유 도구는 `@polyspec/kit` 0.0.52입니다. `.php-version`이 모든 workflow가 설정하는 PHP 8.5를 선언하며, release workflow는 모든 release 단계 앞에서 `make kit-check`를 실행합니다(kit K193).
- T1.55: 공유 도구는 `@polyspec/kit` 0.0.50입니다. knip은 script와 테스트가 실행하는 binary를 `config/knip-entries.json`의 `binaries`에서 읽으며(kit K176), `make dependency-policy-check`는 checkout의 모든 Composer manifest를 검사하듯 루트 `composer.json`을 package를 잠그지 않는 커밋된 `composer.lock`과 함께 검사합니다(kit K181).
- T1.54: `packages/php`와 `packages/php-ext`의 Composer lock이 다시 최신입니다. T1.50의 version 0.0.9가 새 lock 없이 두 manifest의 content hash를 바꿨습니다. `config/dependency-policy.json`은 두 Composer project를 PHP 8.5.0으로 선언하므로 `make dependency-policy-check`는 `composer validate --strict`가 오래되었다고 보는 lock에서 실패하고, 그 PHPUnit과 lock을 검토합니다. 두 lock은 모든 package version을 유지합니다.
- T1.53: kit의 ruff와 vulture인 `make lint-python`이 전체 suite와 CI의 docs job에서 실행됩니다. `scripts/comparison`의 비교 probe는 더 이상 `sys.path`를 바꾸지 않으며(S3), 그 환경은 `mise.toml`의 uv로 package를 설치하고 그 Python(`--python`)으로 probe를 실행합니다.
- T1.52: kit의 phpcs와 PHPStan인 `make lint-php`가 전체 suite와 CI의 suite job에서 실행됩니다. `make install-php`는 루트 package를 `vendor/`에 설치하고 PHPStan은 그 autoloader로 `benchmarks/`의 PHP를 읽으며, 패키지·테스트·benchmark의 PHP는 PSR-12를 따르고, 공통 검증기의 probe는 직렬화를 `Polyspec\OrderedJson\Tests\ProbeTree`에서 읽습니다.
- T1.51: 공유 도구는 `@polyspec/kit` 0.0.48입니다. checkout은 `mise.toml`의 Node.js 26.12.0을 `var/tools`에서 실행하고, `.node-version`은 없어졌으며 모든 `engines.node`는 `>=26.12.0`입니다(kit K171). workflow는 각 action을 SHA와 version으로 고정하고(kit K169), script와 test는 JSON을 schema로 읽고 읽은 값을 단언하지 않고 검사합니다(kit K155–K158).

- 공개된 kit 0.0.56과 canonical 사본을 반영했습니다. CI는 형제 checkout 없이 잠긴 설치 패키지를 bootstrap하고 설치 단계에서 오프라인 lint에 필요한 Rust checker 의존성을 다운로드합니다. native 개발용 소스 link는 계속 사용할 수 있습니다. (T2.80-1)

- 릴리즈 전 의존성 검토가 보고한 최신 안정 버전에 맞춰 ruff 도구를 0.17.2로 갱신하고 native toolchain lock 명령으로 플랫폼별 digest를 다시 생성했습니다. (T2.81)

- native ParseError 생성자가 PHP와 같이 알 수 없는 메시지를 LogicException으로 거부합니다. 긴 메시지와 알려진 메시지에 NUL byte를 붙인 경우도 포함하며 생성자 회귀 테스트를 두 backend에 실행합니다. (T2.71-1)

- PHP lint 줄 길이 규칙에 맞춰 생성자 회귀 테스트 assertion을 줄바꿈했습니다. (T2.71-1-1)

- PHP 구현을 중복 로드하지 않는 격리 Composer test autoloader로 확장 parity를 실행하도록 kit 0.0.57을 반영하고 0.0.10 의존성 검토와 native consumer lock을 갱신했습니다. (T2.80-2)

### npm (packages/js)

- 단독 surrogate가 있는 텍스트 입력은 문법을 읽기 전에 surrogate의 위치에서 `unescaped_lone_surrogate`로 거부됩니다. 이전에는 surrogate 다음 단위를 가리켰고, root 뒤의 surrogate는 `trailing_input`이었습니다(T1.39).

### python (packages/python)

- parser는 문서를 compiled `re` pattern의 한 pass로, member, item, root 값마다 match 하나로 읽고, member 이름과
  `string_value()`를 `bytes.decode`와 `json.decoder.scanstring`으로 decode합니다 (T1.41). 평평한 객체 50,000개에서 CPU
  시간은 순수 PHP parser의 4.44배에서 2.34-2.94배로 내려갔으며, 결과와 오류 offset은 같습니다.

- `parse_bytes`는 Python으로 byte마다 검사하지 않고 `bytes.decode('utf-8')`로 UTF-8을 검증합니다 (T1.35). 거부는 이전과 같은 offset인
  `UnicodeDecodeError`의 `start`에서의 `invalid_utf8`이며, `ParseError`는 그 error에서 발생합니다.

- 패키지가 공유 JSON 계약을 구현합니다 (T1.27-2). `parse`와 `parse_bytes`가 text와 UTF-8 byte를 읽고,
  `stringify`와 `Value.compact()`가 직렬화하며, `Value`가 접근자와 factory를 노출하고, `ParseError`가 공유
  rejection kind를 UTF-8 byte offset으로 보고합니다. `max_depth`와 `reject_duplicates`는 JavaScript binding을
  따릅니다. 패키지 test가 표준 사례와 자기 사례를 실행하고, 저장소의 registry, 패키지 test 표준, owner map이
  패키지를 다룹니다.

## 0.0.9

- T2.63: Value::parse가 파싱마다 참조 순환을 남겼다. scanner의 closure들이 서로를 참조로 잡아서 수집기가 돌기 전까지 메모리가 남았고 큰 가져오기가 memory_limit에 닿았다(limepie P-82). 이제 scanner는 반환하거나 파싱 오류를 던질 때 closure 변수를 비워 순환을 남기지 않는다. Red: 수집기를 끈 채 50번 파싱하면 순환 400개가 남아 새 테스트가 실패했다. Green: ValueApiTest가 통과하고 lint-php와 parity 검사가 통과한다 (T2.63). (T2.63).

- T2.61: 바인딩 참조를 docs/spec에서 docs/operations로 옮겼다. 자체 요구사항을 정의하지 않기 때문이다: docs/spec/api.md와 한국어 쌍, 그리고 그것을 가리키는 링크(변경 기록의 링크 포함). Red: 605b7a7에서 make parity-declarations-check가 api.md의 R19로 exit 2; Green: 통과하고 make docs-check와 make layout-check가 통과한다 (T2.61). (T2.61).

- T2.62: 저장소 계약을 docs/spec에서 docs/operations로 옮겼다. 요구사항을 정의하지 않는 배치 문서이기 때문이다: docs/spec/repositories.md와 한국어 쌍, 그리고 그것을 가리키는 링크(parity 선언의 R19). Red: 낡은 경로가 남아 있는 동안 연결 파일마다 make text-absent가 exit 1이고, 115eeea에서 parity가 실패했다. Green: 모든 연결 파일에서 text-absent가 통과하고 make docs-check와 make layout-check가 통과한다 (T2.62). (T2.62).

- T1.49: `packages/php-ext`의 Composer manifest는 `repositories`와 `polyspec/ordered-json`의 개발 요구를 선언하지 않습니다. 그 test는 `autoload-dev`로 `../php/src`의 PHP 라이브러리를 읽으므로, extension의 release zip은 저장소 밖에서 설치되는 manifest를 담습니다.
- T1.48: 공유 도구는 `@polyspec/kit` 0.0.45이며, 그 knip은 pin된 런타임의 binary를 무시합니다(kit K152).
- T1.46: kit의 oxlint와 knip인 `make lint-ts`가 전체 suite와 CI의 docs job에서 실행됩니다. `config/knip-entries.json`은 공통 검증기가 실행하는 JavaScript probe `packages/js/test/probe.mjs`를 knip의 entry로 선언합니다(kit K145).
- T1.47: 공유 도구는 `@polyspec/kit` 0.0.44입니다: `make install-tools`는 CI의 docs job에 없던 `rust-toolchain.toml`의 Rust toolchain을 설치하고, ruff는 cache를 `var/ruff`에 두며, `config/layout.yml`은 kit의 목록을 반복하는 대신 kit의 root 파일에 `composer.json`과 `external-inputs.json`을 더합니다(kit K145, K147, K150, K151).
- T1.45: 공유 도구는 `@polyspec/kit` 0.0.43입니다. parity는 libtest-mimic의 trial과 PHPUnit test method의 data set을 읽고, `no-floating-promises`는 node:test 등록을 허용하며, API Extractor는 더 이상 `ae-missing-release-tag`를 보고하지 않고, knip은 layout에서 entry를 가져옵니다.
- T1.42: 저장소 도구는 TypeScript입니다(S9). 공통 검증기(`scripts/verify.mts`와 그 registry, reference, records), 근거, PIE, 외부 입력, 비교 검사와 benchmark runner는 Node.js로 실행하고 `make typecheck`가 검사하며, 그 테스트는 `tests/scripts`의 node 테스트입니다(`make test-scripts`). 독립 참조는 momoa로 JSON을 읽습니다. 패키지 테스트는 검증기를 떠나 kit parity의 native runner로 옮겼고, kit의 `lint-rust`와 `lint-go`가 `scripts/lint.py`를 대신하며, CI의 job `python`은 없어졌습니다. 패키지 폴더는 `config/parity.json`에서, fixture 폴더는 registry에서 읽으며, 도구에 남은 Python은 이유와 함께 S9 예외인 `scripts/comparison`의 Python 라이브러리 probe뿐입니다.
- T1.39: 모든 unit은 제외 없이 그 profile의 각 구현에서 실행합니다. `ordered_map_rejects_non_string_key`는 JavaScript에서도 실행하며, PHP 배열은 문자열이나 정수로 key를 두므로 byte 입력과 함께 profile `no-php`에 속합니다. `utf8_validation_holds_for_long_multibyte_text`(이전 `utf8_validation_survives_low_pcre_limits`)는 모든 구현에서 실행하며 PHP는 낮은 PCRE 한도에서 실행합니다. `text_input_rejects_lone_surrogates`와 새 `string_value_keeps_an_unpaired_surrogate`는 JavaScript와 Python의 profile `utf16-text`를 이룹니다. 단독 surrogate가 있는 JavaScript 텍스트 입력은 문법보다 먼저, 그 다음 단위가 아니라 surrogate의 위치에서 거부되며, root 뒤의 surrogate는 Python처럼 `trailing_input` 대신 `unescaped_lone_surrogate`입니다.
- T1.43: `config/parity.json`은 모든 API unit을 kit의 TypeScript extractor가 `packages/js/index.d.ts`에서 읽는 JavaScript 공개 symbol에 API 계약의 표가 적는 대로 묶고(compact 출력과 UTF-16 생성 및 조회는 `stringify`, `Value.string`, `get`), JavaScript에만 있는 symbol `Kind`, `ParseOptions`, `rejectDuplicates`, `keys`, `toJSON`, `toString`을 이유와 함께 native-only로 선언합니다.
- T1.38: 패키지 테스트는 kit parity가 실행하는 native runner로 실행하며, 각 테스트는 `config/parity.json`의 unit에 묶입니다. JavaScript는 node:test(`packages/js/test/api.test.mjs`, `official.test.mjs`), Python은 `make install-python`이 만드는 `packages/python/.venv`의 unittest(`tests/test_api.py`, `test_official.py`), PHP는 `make install-php`가 `packages/php`와 `packages/php-ext`에 설치하는 PHPUnit 13.4.2(`ValueApiTestCase`에서 나온 두 backend의 `ValueApiTest`, `DescriptorTest`, `ValueClassTest`)입니다. `make php-extension`은 `make parity-check`를 위해 확장을 제자리에서 빌드합니다. 모든 구현은 공식 예제를 예제마다 case 하나로 native로 실행합니다. JavaScript와 Python은 패키지 테스트로, Go는 `TestOfficial`로, Rust는 `tests/official.rs`의 libtest-mimic 0.8.2 trial(`official::<id>`)로, PHP는 각 backend의 `OfficialTest`가 실행하는 `OfficialTestCase`의 `testCase` data set으로 실행합니다. PHP class `Value`, `ParseError`, `Tape`, `Parser`는 각자의 파일에서 PSR-4로, 함수와 `MAX_DEPTH`는 `files`로 load하며(S2), wheel의 release smoke는 `py.typed` 표시를 요구합니다.
- T1.42: 폴더는 kit layout의 S5를 따릅니다. 패키지와 공유 fixture를 옮겼으며, consumer는 이 release를 넘어설 때 새 경로를 씁니다.
  - `packages/ordered-json-go` → `packages/go`: Go module `github.com/polyspec/ordered-json/packages/ordered-json-go`는 `github.com/polyspec/ordered-json/packages/go`이고, tag는 `packages/ordered-json-go/vX.Y.Z` 대신 `packages/go/vX.Y.Z`입니다.
  - `packages/ordered-json-npm` → `packages/js`. npm package `@polyspec/ordered-json`과 archive 이름은 같습니다.
  - `packages/ordered-json-php` → `packages/php`, `packages/ordered-json-php-ext` → `packages/php-ext`. Composer 이름과 archive 이름은 같습니다.
  - `packages/ordered-json-python` → `packages/python`: Git source는 `subdirectory=packages/python`을 적습니다.
  - `packages/ordered-json-rust` → `packages/rust`.
  - `fixtures/` → `contracts/fixtures/`.
- T1.44: 공유 도구는 `@polyspec/kit` 0.0.42입니다. Go, uv와 함께 Python, Composer, alint, ruff, vulture, golangci-lint, deadcode, govulncheck, cargo-audit는 `mise.toml`의 정확한 release인 도구이며, Go와 Python은 kit의 pin이고, `mise.lock`이 digest로 잠그며 `make install-tools`가 `var/tools/mise`에 설치합니다. `config/toolchain.json`은 mise의 release를 두고, `.python-version`은 제거합니다. CI는 setup-python과 setup-php의 Composer 대신 `make install-tools`로 설치하며, workflow 규칙은 `npm` 이외의 `TOOLS`와 Go나 Python의 setup action을 거부합니다. kit이 가져오는 sprintf-js advisory는 kit이 받아들이는 대로 받아들입니다.
- T1.41: Python parser는 문서를 compiled `re` pattern의 한 pass로, member, item, root 값마다 match 하나로 읽으며, 문법은 scan과 모든 오류 offset에 대해 한 번 정의됩니다. `make python-parse-budget`는 평평한 객체 50,000개에서 그 CPU 시간을 순수 PHP parser와 비교하며, 비율은 4.44에서 2.34-2.94로 내려갔습니다. 모든 vector에서 결과와 오류 offset은 같습니다.
- T1.37: `config/parity.json`은 `@polyspec/kit`의 parity 검사(`make parity-declarations-check`, `make parity-check`)가 읽는, 구현과 그 케이스와 공개 API의 유일한 선언입니다. `implementations.json`과 `package-tests.json`은 제거합니다. 검증기는 구현을 그곳에서 읽고 명령을 `scripts/registry.py`에 두며, 패키지의 케이스·심볼 목록은 제거하고, rejection kind는 JSON 계약에 나열합니다.
- T1.36: 공유 도구는 vendor한 `scripts/kit/`과 `tests/kit/` 대신 package `@polyspec/kit`(release asset으로 고정한 devDependency)입니다. 새 checkout은 먼저 `make install-tools TOOLS=npm`과 `make install-packages`를 실행합니다. `make kit-sync`가 package의 사본을 쓰고, `config/layout.yml`이 `make layout-check`의 폴더 지도이며, toolchain 하한은 kit의 pin인 Node.js 26.11.1, PHP 8.5, Go 1.27.2, Rust 1.99.0입니다.

- T1.35: Python 패키지의 `parse_bytes`는 Python으로 byte마다 검사하지 않고 `bytes.decode('utf-8')`로 UTF-8을 검증하며, 이전과 같은 offset인 `UnicodeDecodeError`의 `start`에서 `invalid_utf8`을 보고합니다. `ParseError`는 그 error에서 발생합니다.

- T1.34-1: job `python`과 `push-gate`는 Python과 함께 uv를 설치하며(`make install-tools TOOLS="uv python"`), workflow 규칙은 uv 없이 python을 설치하는 step을 거부합니다.

- T1.34: vendor된 kit 도구는 v0.0.28입니다(`make kit-sync KIT_TAG=v0.0.28`). `config/toolchain.json`은 `uv` 0.12.24를 선언하고, `make install-tools`는 `pythonBuild`의 Python(3.14.8)을 `uv python install`로 `var/tools/uv-python`에 설치하며 uv가 만드는 symbolic link를 그대로 둡니다. `pythonBuild`는 정확한 version만 선언합니다. Python 패키지는 lock `packages/ordered-json-python/pylock.toml`(의존성 없음)을 가지며, 릴리스 workflow는 draft 릴리스를 증명한 뒤 공개합니다(`make release-proof`, `make release-undraft`).

- T1.33: AGENTS는 기존 외부 도구나 라이브러리를 다시 만들지 않고 있는 그대로 사용한다고 적습니다. 예로 Python interpreter, 환경, lock에는 uv를, PHP 의존성에는 Composer를 들며, 그런 도구가 만드는 symbolic link를 받아들입니다. 또한 이 저장소의 symbolic link와 상대 경로 규칙은 있는 곳에서 이 저장소가 만드는 것을 규율하며, 경로는 선언적으로 또는 명시된 발견 규칙으로 정한다고 적습니다.

- T1.32-6-1: `docs/distribution.json`을 제거합니다. 이 파일은 GitHub release, version tag와 source 공개 여부를 다시 적었으나 어떤 검사도 저장소와 비교하지 않아 release마다 오래되었습니다. `published`로 표시한 기능 행은 release tag와 asset을 적으며, `make evidence-check`가 그 형식을 오프라인으로 검사합니다. `make release-proof TAG=<tag>`가 release의 네트워크 비교입니다.

- T1.32-5: 배포 문서와 루트 `README.md`는 릴리스가 없다거나 첫 release가 게시되지 않았다고 적지 않습니다. 릴리스가 나열되는 곳(`gh release list -R polyspec/ordered-json`과 Releases 페이지)과 `vX.Y.Z` 릴리스가 첨부하는 asset을 적습니다.

- T1.32-4: 배포 문서, 설치 문서와 `AGENTS.md`는 Python 패키지를 git tag가 아니라 wheel asset `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`로 적습니다. Python 패키지 README는 그 wheel asset으로 설치합니다. 릴리스 절차는 Go tag `packages/ordered-json-go/vX.Y.Z`를 같은 commit의 `vX.Y.Z`보다 먼저 push한다고 밝힙니다.

- T1.32-3: kit의 vendored 도구는 v0.0.20입니다(`make kit-sync KIT_TAG=v0.0.20`). `make kit-test`가 vendored test를 모두 통과합니다.

- T1.32-2: Python 패키지는 `requires-python = ">=3.14"`를 선언합니다. 이는 CI가 고정 interpreter로 실행하는 `.python-version`의 minor release입니다. `ci.yml`의 job `python`에는 3.11 matrix 항목과 `PYTHON` 재정의가 없으며, `scripts/tests/test_python_requires.py`가 선언된 범위를 `.python-version`과 비교합니다.

## 0.0.8

- T1.32: Python 패키지는 wheel `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`으로 release하며, `buildBackend`에 고정한 build backend `setuptools==84.0.0`으로 만들고 git tag가 아니라 release asset으로 설치합니다. README와 설치 문서는 wheel URL의 `pip install` 줄을 보여 줍니다.

## 0.0.7

- T1.31: tag의 push는 `push-gate.yml`을 시작하지 않으므로(`push: branches: ['**']`) release는 대기 중인 두 번째 실행 없이 commit의 check `push-gate`를 검증합니다. `test_a_tag_push_starts_none_of_the_workflows_whose_checks_the_release_requires`가 이를 요구합니다.
- T1.29-1: push gate, full-run guard, owner 검사, CI 보고서는 kit v0.0.4의 vendored 도구(`scripts/kit/`, `tests/kit/`, `.kit/kit.lock.json`)이며 `config/checklist.json`과 `config/owner-checks.json`으로 설정합니다. `push_gate.py`, `full_run.py`, `owner_check.py`, `ci_run.py`와 그 test를 제거했습니다. `ci.yml`과 `push-gate.yml`의 job은 `make ci-targets`를 실행하고, `test_workflow_rules`는 `CHECK_TARGETS`의 모든 target이 job 하나에서만 실행되도록 요구합니다. `partial` 기능은 더 이상 push나 전체 실행을 막지 않습니다.
- T1.29-2: release step은 kit 도구 `scripts/kit/release.mjs`이며 `config/release.json`으로 설정합니다. `release.py`, `install_fixtures.py`, `test_release.py`를 제거했습니다. `packages/ordered-json-npm/`의 npm 패키지와 `packages/ordered-json-php/`, `packages/ordered-json-php-ext/`의 Composer 패키지 archive 이름은 `polyspec-ordered-json-npm-X.Y.Z.tgz`, `polyspec-ordered-json-php-X.Y.Z.zip`, `polyspec-ordered-json-extension-php-X.Y.Z.zip`입니다. `make release-coverage`는 모든 package 파일이 분류되도록 요구하고, `make release-config-check`는 `packages/ordered-json-npm/package.json` 버전에 대한 step `versions`를 실행합니다. archive의 consumer project는 `tests/release-consumer`에 있으며, `make release-consumer-lock`이 release commit에서 그 lock을 씁니다. Go 모듈 tag는 `packages/ordered-json-go/vX.Y.Z`이고, `make release-verify`는 이 tag가 `vX.Y.Z`와 같은 commit에 있도록 요구합니다.
- T1.29-3: 문서는 `scripts/kit/check-documents.mjs`(`make documents-check`, `config/documents.json`)가, commit message는 `scripts/kit/check-commits.mjs`(`make commits-check`, `config/commits.json`)가 검사합니다. 문서 목록(manifest)을 제거했습니다. 표지 하나가 저장소의 문서 하나를 가리키므로 패키지 문서의 `doc-id` 표지는 `npm-`, `php-`, `php-ext-`, `python-`, `rust-`, `go-`로 시작합니다. `docs_check.py`는 `scripts/check_evidence.py`(`make evidence-check`)가 되며 기능 행과 그 근거, 배포 관측, 벤치마크 결과, 검증 기록, JSON 보고서의 검사를 유지하고, `test_docs_check.py`는 `test_check_evidence.py`가 됩니다. 체크리스트 행은 상태를 말로 씁니다.
- T1.29-4: toolchain은 `config/toolchain.json`, `.node-version`, `package.json`의 `packageManager`, `rust-toolchain.toml`, `.php-version`, `.python-version`에 선언하고 `make toolchain-check`와 `make cargo-downloads-check`(kit 도구)로 검사합니다. `make install`은 npm과 Go(`var/tools`), Rust toolchain, crate, `external-inputs.json`의 PIE PHAR와 추가 사례를 설치하며 내려받는 유일한 target입니다. `toolchains.py`와 `test.py`를 제거했습니다. 외부 입력의 설치는 `scripts/external_inputs.py`, 검증기 unit test 실행기는 `scripts/unit_tests.py`(`make test-scripts`), 통합 검증은 `scripts/verification.py`(`make verify-all`)입니다. flag `--build-extension`을 제거했습니다. workflow는 `make install`을 실행하고, release workflow는 Node.js만으로 `make install-tools`를 실행합니다.
- T1.29-5: 의존성은 `make dependency-policy-check`(`scripts/kit/check-dependency-policy.mjs`)가 `config/dependency-policy.json`과 `make dependency-review RECORD=1`이 쓰는 검토 기록 `config/dependency-review.json`에 대해 gate합니다. 루트 `package.json`에는 lock `package-lock.json`이 있습니다. `package.json`, `packages/ordered-json-npm/package.json`, `packages/ordered-json-php/composer.json`의 script `test`는 `make verify-js`, `make verify-php`를 실행합니다. AGENTS가 의존성 규칙을 적습니다. `make dependency-policy-mutation-check`는 이 저장소에 변형이 바꿀 npm registry 의존성과 Composer platform이 없어 TypeError로 실패합니다.
- T1.29-6: 패키지는 `packages/ordered-json-npm`, `packages/ordered-json-php`, `packages/ordered-json-php-ext`, `packages/ordered-json-python`, `packages/ordered-json-rust`, `packages/ordered-json-go`에 있습니다. Go 모듈 경로는 `github.com/polyspec/ordered-json/packages/ordered-json-go`이고 tag는 `packages/ordered-json-go/vX.Y.Z`입니다.
- T1.29-7: AGENTS는 `scripts/kit/`과 `tests/kit/`의 도구가 polyspec/kit에서만 바뀌고, 이 저장소가 다른 polyspec 저장소와 `config/*.json` 및 자기 제품 코드에서만 다르며, pull request, merge queue, ruleset이 없는 0.x 규칙과 archive 이름 `<package>-<language>-<version>.<ext>`를 적습니다. 릴리스 0.0.7을 준비했습니다. manifest는 올리지 않았고 tag는 없으며, `make release-config-check`, `make release-coverage`, `make dependency-policy-check`는 `packages/` 배치에서 통과합니다.
- T1.29-8: `config/toolchain.json`은 Composer 2.10.3을 선언합니다. `ci.yml`의 job `docs`는 `make dependency-policy-check`를 위해 PHP와 그 Composer release를 설정하고, `make kit-test`는 job `suite`에서 실행합니다.
- T1.29-9: kit의 vendored 도구는 v0.0.8입니다.
- T1.29-10: `make dependency-policy-mutation-check`는 CI에서 실행되며 통과합니다. `make install`은 도구보다 Rust toolchain을 먼저 설치하고, release workflow는 npm만 설치합니다.
- T1.30: test `test_both_tag_shapes_start_the_release_and_the_release_steps_handle_both`는 release workflow의 tag filter가 `vX.Y.Z`와 `packages/ordered-json-go/vX.Y.Z`에 맞도록 요구하고, AGENTS는 Go tag를 먼저 또는 `vX.Y.Z`와 함께 push한다고 적습니다.

## 0.0.6

- T1.27-25: release 자산은 `<package>-<language>-<version>.<ext>` 이름을 가집니다. npm 자산은 `polyspec-ordered-json-npm-X.Y.Z.tgz`, PHP 자산은 `polyspec-ordered-json-php-X.Y.Z.zip`과 `polyspec-ordered-json-extension-php-X.Y.Z.zip`입니다.

## 0.0.5

- T1.27-18: release version test가 고정된 tag v0.0.3 대신 `js/package.json`이 선언한 version의 tag를 검사합니다. 0.0.4 bump로 고정 tag가 오래되었기 때문입니다.
- T1.27-19: CI workflow가 main에 push될 때마다 실행되어, main의 모든 commit에 release workflow가 요구하는 check ci-passed가 붙습니다.
- T1.27-21: AGENTS.md에 0.x 규칙을 적었습니다. 변경은 소유 unit test가 로컬에서 통과한 뒤 main에 commit하며, CI push trigger가 main의 각 commit에 ci-passed check를 만듭니다.
- T1.27-22: AGENTS.md에 pin 규칙을 적었습니다. 다른 저장소 package의 pin은 GitHub에 존재하는 tag만 가리킵니다.
- T1.27-23: GitHub ruleset과 merge queue를 제거했습니다. workflow는 push와 pull_request에서 실행되고, release는 tag된 commit에 check ci-passed를 요구합니다.
- T1.27-17: release asset 설치 test의 consumer fixture가 `make install-fixtures`로 쓴 0.0.4 아카이브를 가리킵니다.
## 0.0.4

- PR #1에서 T1.27-10부터 T1.27-13까지의 수정 뒤 `ci-passed`가 통과합니다. docs, python, push-gate, suite job이 같은 commit에서 통과합니다 (T1.27-14).
- CI의 `python` job은 `make ci CI_JOB=python`이 쓰는 `var/ci/python/`을 업로드합니다. 이전의 `var/ci/python-<minor>/`는 어떤 target도 쓰지 않았습니다. `scripts/tests/test_workflow_rules.py`는 각 report 경로가 그 make target의 디렉터리이도록 요구합니다 (T1.27-13).
- push-gate job이 커밋된 tree에서 통과합니다. job의 종료 상태 2는 `make docs-check`에서 왔고, 이는 T1.27-10이 맞춘 오래된 번역 revision을 읽은 결과입니다. 따라서 `scripts/push_gate.py`와 `.github/workflows/push-gate.yml`은 바뀌지 않았습니다 (T1.27-12).
- test_the_job_fails_on_a_commit_whose_documentation_check_fails가 커밋된 tree에서 통과합니다. 이 test의 실패는 오래된 번역 revision에서 왔고 T1.27-10이 이를 고쳤으므로, test와 검사 대상 코드는 바뀌지 않았습니다 (T1.27-11).
- AGENTS, 실행 체크리스트, 변경 기록의 번역이 영문 원본의 revision을 다시 적습니다. T1.27-9 commit이 영문을 바꾸면서 revision을 갱신하지 않아서 docs job의 문서 검사가 실패했고, 이제 검사가 통과합니다 (T1.27-10).
- 도구 다운로드 test는 실패한 fetch, 성공한 fetch, 미설치 `cargo`를 `PATH`의 가짜 `cargo`로 실행하므로, 결과가 머신에 설치된 `cargo`에 의존하지 않습니다 (T1.27-8).
- Python 패키지의 `package-data` key를 `polyspec.ordered_json`으로 맞춰 wheel에 `py.typed` 표식이 들어가게 했고, `python/tests/package_data.py`를 Python 검사에 더했습니다 (T1.27-9).
- Python 문서는 현재 사실만 적습니다 (T1.27-7). 설치 문서와 README는 `python/`을 포함한 첫 tag의 자리표시자 `vX.Y.Z`를 보여 주며, 체크리스트 행 T1.27-3은 `docs/distribution.json`이 기록하는 Python registry 상태 `not-verified`를 적습니다.
- `python` job의 CI는 `actions/upload-artifact`를 GitHub에 있는 commit으로 고정하며, `scripts/tests/test_workflow_rules.py`는 모든 워크플로의 모든 action이 전체 commit id 하나를 유지하도록 요구합니다 (T1.27-6).
- README와 설치 문서가 Python 패키지를 명시합니다 (T1.27-5). README(.ko)는 소개, 패키지 표, 시작 절에 Python 패키지를 적고, 시작 절은 `python/src`에서 실행하는 예제를 보여 줍니다. pip 설치 줄과 설치 문서는 `python/`을 포함한 첫 tag의 자리표시자 `vX.Y.Z`를 쓰며, 아직 출시된 tag에는 `python/`이 없습니다.
- CI가 지원하는 두 minor에서 Python 패키지를 실행합니다 (T1.27-4). `ci.yml`의 job `python`은 3.11과
  `.python-version`의 minor release를 matrix로 가지고, job의 interpreter로 패키지 test, 사례 목록, symbol
  보고를 실행하는 `make ci CI_JOB=python`을 실행합니다(`scripts/python_check.py`. 바닥 minor가 핀보다
  낮으므로 이 진입점은 도구 핀을 검사하지 않습니다). `ci-passed`가 이 job을 요구합니다.
- Python 구현 패키지가 JSON 계약을 다룹니다 (T1.27-2). `python/`이 import 이름 `polyspec.ordered_json`의
  `polyspec-ordered-json`을 담고, 저장소의 registry, 패키지 test 표준, owner map이 이를 다룹니다.
  `verify.py --only python`가 공식 예시, 공유 fixture 98건, 패키지 test를 통과하고, 거부 위치와 kind가 다른
  모든 구현과 일치합니다.
- 문서와 release 검사가 Python binding을 밝힙니다 (T1.27-3). API 계약이 모든 연산 표에 Python 열을 더하고
  binding 확장을 적으며, repository 계약이 여섯 구현 패키지를 세고, 기능 상태와 설치·배포 문서가 Python을
  밝히며, release version 검사가 다른 manifest와 함께 `python/pyproject.toml`을 읽습니다. 패키지는 archive를
  만들지 않고 pip가 저장소의 tag에서 설치합니다.
- 저장소 도구가 Python 3.14에서 실행됩니다 (T1.27-1). `.python-version`이 3.14를 적고, 검증기의 단위 test가
  그 위에서 통과하며, Python을 설치하는 모든 workflow가 자기 release 대신 핀 파일을 읽고, 모든 패키지 README의
  설치 문단이 핀 파일을 밝힙니다.
- 사용자의 언어로 보고하는 git은 work tree가 아님으로 읽힙니다 (T1.28). `tracked_files`가 work tree의 부재를
  git 오류의 영문 텍스트로 판정했으므로, 현지화된 git은 원본 tree의 기록, 문서 검사, 공통 사례를 오류로 만들었습니다.
  `git rev-parse --is-inside-work-tree` 호출을 `LC_ALL=C`로 실행하고, AGENTS가 검사가 출력 텍스트를 판정하는
  모든 명령의 규칙을 밝힙니다.

<a id="0-0-3"></a>
## 0.0.3

- 릴리스 asset 설치 테스트는 consumer처럼 설치합니다(T1.26). `scripts/tests/install`에는 테스트가 빌드하는 archive를 이름과 버전으로만(`integrity` 없음, 빈 `shasum`) 기록하는
  `package.json`과 `package-lock.json`, `composer.json`과 `composer.lock`이 있고, `test_release`는 offline 설정 없이
  빈 cache와 도달할 수 없는 registry를 가리키는 scope `@polyspec`로 `npm ci`를, 빈 `COMPOSER_HOME`과
  `COMPOSER_CACHE_DIR`로 `composer install`을 실행합니다. `make install-fixtures`가 fixture와 lock을 씁니다.
  Composer zip은 압축하지 않은 entry, 고정된 entry 시각, `TZ=UTC`로 만들어 어느 기계에서나 byte와 shasum이 같습니다.
  AGENTS는 검사가 결과가 시간에 따라 달라지는 registry 질의를 하지 않으며 lock이 고정한 내려받기는 설치라고 적습니다.
- 0.0.3 릴리스(T1.25): `package.json`, `js/package.json`, `composer.json`, `php/composer.json`,
  `php-extension/composer.json`, `rust/Cargo.toml`과 `rust/Cargo.lock`의 패키지 항목이 0.0.3을 선언하고, changelog는
  빈 `## Unreleased` 아래에 section `## 0.0.3`을 가지며, 설치 표는 0.0.3을 적고, `make release-versions`는
  `test_release`가 요구하는 대로 tag `v0.0.3`과 `go/v0.0.3`에서 통과합니다.
- Composer artifact repository는 manifest의 버전을 읽으므로 공개되는 모든 `composer.json`은 `version`을 선언합니다
  (T1.24). `make release-versions`는 `composer.json`, `php/composer.json`, `php-extension/composer.json`에 X.Y.Z를
  요구합니다. `make release-assets`는 표준 형식이 아닌 공개 manifest(`composer.json`의 `version` 없음, `repositories`,
  `@dev`, `overrides`, `file:`, `link:`, `workspace:`, URL, git 의존성, 정확한 버전 하나가 아닌 polyspec 의존성)와
  manifest가 원본과 다른 archive에서 실패합니다. `make check`는 tree에 표준 형식을 요구하고, `test_release`는
  archive를 임시 project에 npm과 zip의 Composer artifact repository로 설치합니다. 설치 안내는 릴리스 asset에서
  설치하는 절차를 설명합니다.
- 릴리스 본문은 GitHub의 한도인 125000자 이하입니다(T1.23). `make release-publish`는 `CHANGELOG.md`의 section
  `## X.Y.Z`가 125000자 이하이면 그 section을 notes로 쓰고, 그렇지 않으면 한 줄
  `The changes of X.Y.Z are listed in [CHANGELOG.md](<URL>).`을 씁니다. URL은 tag의 `CHANGELOG.md`와 그 section의
  anchor입니다. `test_release`는 한도를 넘는 section(`<a id>` anchor가 있는 경우와 없는 경우)과 정확히 한도인
  section을 다룹니다.

### npm (packages/js)

- 저장소의 0.0.3 릴리스입니다. 패키지는 0.0.2 이후 변경이 없습니다.


### rust (packages/rust)

- 저장소의 0.0.3 릴리스입니다. 패키지는 0.0.2 이후 변경이 없습니다.


### go (packages/go)

- 저장소의 0.0.3 릴리스입니다. 패키지는 0.0.2 이후 변경이 없습니다.


### php (packages/php)

- `composer.json`이 `version`을 선언하므로 릴리스 zip의 Composer artifact repository가 package를 읽습니다(T1.24).


### php-ext (packages/php-ext)

- `composer.json`이 `version`을 선언하므로 릴리스 zip의 Composer artifact repository가 package를 읽습니다(T1.24).


<a id="0-0-2"></a>
## 0.0.2

- 0.0.2 릴리스(T1.22): `package.json`, `js/package.json`, `rust/Cargo.toml`과 `rust/Cargo.lock`의 패키지 항목이
  0.0.2를 선언하고, changelog는 빈 `## Unreleased` 아래에 section `## 0.0.2`를 가지며, 설치 표는 0.0.2를 적고,
  `make release-versions`는 `test_release`가 요구하는 대로 tag `v0.0.2`와 `go/v0.0.2`에서 통과합니다.
- tag의 릴리스는 어느 깊이의 Go 모듈 tag든 포함하고, 그 asset은 npm tarball과 Composer zip뿐입니다(T1.21-4).
  `.github/workflows/release.yml`의 trigger는 `tags: ['v*', '**/v*']`입니다. tag filter에서 `*`는 `/`와 맞지
  않으므로 `**/v*`가 `go/vX.Y.Z`와 어느 깊이의 Go 모듈 tag든 포함합니다. `rust/`의 Cargo 패키지는 archive로
  릴리스하지 않고 git tag로 사용합니다. `cargo package`는 git 의존성을 해석되지 않는 crates.io 요구로 바꾸기
  때문입니다. `scripts/release.py`는 manifest 목록에 이를 적고, `test_release`는 Cargo archive가 있으면 실패합니다.
- `main`의 commit에 붙인 tag가 그 commit을 릴리스합니다(T1.21-3). `.github/workflows/release.yml`은 권한
  `contents: write`로 tag `v*` 또는 `**/v*`의 push에서 실행됩니다. `make release-verify`는 tag된 commit이
  `origin/main`에 있고 check run `push-gate`와 `ci-passed`가 `success`로 끝났는지, `make release-versions`는 모든
  manifest에 tag의 버전이 있고 `CHANGELOG.md`에 section `## X.Y.Z`가 있는지 확인하고, `make release-assets`는 npm,
  Composer archive를 만들며, `make release-publish`는 section을 notes로 GitHub Release를 만듭니다
  (`scripts/release.py`, `scripts/tests/test_release.py`). AGENTS가 릴리스 절차를 적습니다.
- ruleset `main`은 정확히 check `push-gate`와 `ci-passed`를 요구합니다(T1.21-2). `ci.yml`의 마지막 job `ci-passed`는
  다른 모든 job을 need로 가지고, `if: ${{ always() }}`로 그 모든 job 뒤에 실행되며, need로 가진 job의 결과가 모두
  `success`가 아니면 실패하는 `make ci-passed`를 실행합니다. `ci.yml`에 추가한 job은 `needs`에 들어가면 요구됩니다.
  `test_workflow_rules`는 job이 없거나, 마지막이 아니거나, `if: ${{ always() }}`가 없거나, 다른 모든 job을 need로
  가지지 않거나, 다른 runner에서 실행되거나, 다른 step을 실행하면 실패합니다.
- changelog는 릴리스된 버전 위에 `## Unreleased` section을 둡니다(T1.21-1). tag `v0.0.1`의 항목은 `## 0.0.1` section을
  이루고, 각 패키지의 changelog도 같은 두 section을 가지며, 모든 변경은 항목을 `## Unreleased` 아래에 추가합니다.
- 각 workflow는 trigger를 정확히 선언합니다(T1.20): `ci.yml`은 `pull_request`, `merge_group`, `workflow_dispatch`에서,
  `push-gate.yml`은 `branches-ignore: ['gh-readonly-queue/**']`를 가진 `push`, `pull_request`, `merge_group`에서
  실행됩니다. `test_workflow_rules`는 workflow의 `on:` block이 다르면 실패합니다.

### npm (packages/js)

- 저장소의 0.0.2 릴리스입니다. 패키지는 0.0.1 이후 변경이 없습니다.


### rust (packages/rust)

- 저장소의 0.0.2 릴리스입니다. 패키지는 0.0.1 이후 변경이 없습니다.


### go (packages/go)

- 저장소의 0.0.2 릴리스입니다. 패키지는 0.0.1 이후 변경이 없습니다.


### php (packages/php)

- 저장소의 0.0.2 릴리스입니다. 패키지는 0.0.1 이후 변경이 없습니다.


### php-ext (packages/php-ext)

- 저장소의 0.0.2 릴리스입니다. 패키지는 0.0.1 이후 변경이 없습니다.


<a id="0-0-1"></a>
## 0.0.1

- 각 패키지의 개발 절차는 저장소 루트의 필수 검사를 가리킵니다(T1.19). 개발 중에는 unit test만 실행하고, 패키지의
  `make check`는 그 패키지만 공통 검증기로 검사하며, hosted CI가 push 뒤에 전체 suite를 실행합니다.
- 패키지는 polyspec 이름 관례를 따릅니다(T1.18): Composer `polyspec/ordered-json`과
  `polyspec/ordered-json-extension`, 확장 클래스 `Polyspec\OrderedJson\NativeParseError`를 포함한 PHP 네임스페이스
  `Polyspec\OrderedJson`, npm `@polyspec/ordered-json`, 라이브러리 `polyspec_ordered_json`을 가진 Cargo 패키지
  `polyspec-ordered-json`입니다. Go 모듈 `github.com/polyspec/ordered-json/go`는 이미 관례를 따랐습니다.
- 모든 변경은 pull request와 merge queue를 거쳐 `main`에 들어갑니다(T1.17). ruleset `main`은 모든 merge method를 허용하는 pull request, method
  `REBASE`인 merge queue, linear history, check `push-gate`, `suite`, `docs`를 bypass actor 없이 요구합니다.
  `ci.yml`과 `push-gate.yml`은 `merge_group`에서 실행되고, `ci.yml`은 `main` push에서 실행되지 않습니다.
- ruleset `main`이 요구하는 job `push-gate`는 gate 뒤에 `make docs-check`를 실행합니다(T1.16). 문서, 기능 tracker,
  체크리스트가 자체 검사에 실패하는 commit은 `main`에 갈 수 없습니다.
- 새 push는 같은 ref의 이전 CI run을 취소합니다(T1.15). runner가 적으므로 `ci.yml`은 group
  `${{ github.workflow }}-${{ github.ref }}`와 `cancel-in-progress: true`인 `concurrency`를 선언하고, `push-gate.yml`은
  선언하지 않습니다. `test_workflow_rules`는 이것 없이 `make ci`를 실행하는 workflow에서 실패합니다.
- `make check`가 clippy와 go vet을 실행합니다(T1.11). AGENTS는 `cargo clippy --all-targets -- -D warnings`와
  `go vet ./...`을 요구했지만 전체 suite의 어떤 명령도 이를 실행하지 않았습니다. `make check`는 검증 뒤에
  `scripts/lint.py clippy`와 `scripts/lint.py go-vet`을 각각의 guard target으로 실행하고, `make clippy`와 `make go-vet`은
  하나씩 실행합니다. `test_full_run`과 `test_lint`의 바뀐 사례와 새 사례는 변경 전에 실패했고 변경 후 통과합니다.
- CI summary의 첫 실패 줄이 검사기 error를 밝힙니다(T1.14). `docs-check`의 summary는 make의 줄만
  보여 줬고, `check`의 summary는 이름에 `missing`이 든 통과 사례 줄을 보여 줬습니다. `scripts/ci_run.py`는 file을 밝히는
  줄을 고르고 통과 사례 줄과 make의 directory 줄은 건너뜁니다. `test_ci_run`의 새 사례는 변경 전에 실패했고 변경 후
  통과합니다.
- CI summary test는 summary를 target log와 비교합니다(T1.13). CI에서 GNU Make 3.81의 문구를 기대했는데
  runner의 GNU Make 4는 Makefile 줄을 밝히므로 실패했습니다.
- 개발 중에는 unit test만 실행합니다(T1.12). AGENTS와 검증 절차는 `make pie-check`, `make check`, `make owner-check`,
  어댑터 suite, 추가 사례 실행이 hosted CI가 push 뒤에 실행하는 end-to-end 검사이고, 어떤 규칙도 commit이나 push 전에
  로컬 실행을 요구하지 않으며, pre-push hook은 빠른 gate로 남는다고 명시합니다.
- setup-node는 npm cache 없이 실행합니다(T1.10). CI에서 `Dependencies lock file is not found`로
  실패했습니다. 기본으로 `package.json`의 `packageManager` 의존성을 cache하는데 저장소에 lock file이 없기 때문입니다.
  step은 `package-manager-cache: false`를 설정하고, `test_workflow_rules`는 이것이 없으면 실패합니다.
- `make ci`와 `make ci-summary`가 job을 해석합니다(T1.9). CI에서 두 step은
  `the following arguments are required: --job`로 실패했습니다. target의 remainder 인수가 `--job`까지 가져갔기 때문이며,
  보고서는 쓰이지 않았습니다. `scripts/ci_run.py`는 해석하기 전에 `--`에서 target을 떼어 냅니다. `test_ci_run`의 새 사례는
  변경 전에 그 error로 실패했고 변경 후 통과합니다.
- test가 모든 workflow의 규칙을 검사합니다(T1.8). `scripts/tests/test_workflow_rules.py`는 step이 make target 하나가 아닌
  것을 실행할 때, `make ci`를 실행하는 job에 `if: ${{ !cancelled() }}`인 summary나 report step이 없거나 실패 뒤에 실행되지
  않는 step이 있을 때, matrix에 `fail-fast: false`가 없을 때, `timeout-minutes`가 있을 때 file, job, step을 밝히며
  실패합니다. T1.4 이전의 `push-gate.yml`에 적용하면 `python3 scripts/push_gate.py`를 직접 실행한 step을 밝히고, 현재
  workflow는 통과합니다.
- hosted CI가 전체 suite를 실행합니다(T1.7). hosted CI는 push gate만 실행했으므로 commit의 전체 suite는 로컬 기계에서만
  실행됐습니다. `.github/workflows/ci.yml`은 `main`에 push된 모든 commit과 모든 pull request에서 Python 3.9가 있는
  `ubuntu-24.04`로 실행하며, job `suite`(`make pie-check`, `make check`)와 `docs`를 `fail-fast: false`인 matrix로
  실행합니다. 모든 step은 실패 뒤에도 make target을 실행하고, `make ci`(`scripts/ci_run.py`)는 target마다 log를 남기며
  모든 target을 끝까지 실행하고, `make ci-summary`는 상태, 시간, 실패한 target마다 첫 실패 줄을 담은 job summary를 쓰고
  기록을 복사하며, 보고서 `var/ci/<job>/`를 upload합니다. `test_ci_run`의 사례는 runner가 없을 때 실패했고 그 뒤 통과합니다.
- commit의 근거는 그 실행이며, 어떤 기록도 커밋하지 않습니다(T1.6). `docs/pie-verification.json`과
  `docs/verification.json`은 모든 추적 파일을 해시했으므로 commit마다 오래된 기록이 됐고, `make check`의 guard는 로컬의
  `make pie-check`와 `make check`가 이를 다시 만들어 커밋할 때까지 거부했으며, 전체 suite를 실행하는 hosted CI는 commit마다
  실패했을 것입니다. `make pie-check`와 `make check`는 Git이 무시하는 `var/records/pie-verification.json`과
  `var/records/verification.json`을 쓰고, 커밋된 기록은 제거합니다. `scripts/docs_check.py --records`는 체크아웃의 기록을
  검사하고, guard는 어떤 기록도 읽지 않으며, 기능은 근거로 검증 절차의 기록 절을 가리킵니다. `test_docs_check`와
  `test_full_run`의 바뀐 사례와 새 사례는 변경 전에 실패했고 변경 후 통과합니다.
- PHP는 minor release로 고정합니다(T1.5). 검사의 PHP를 적은 추적 파일이 없었으므로 다른 PHP에서의 실행은 어떤 고정값도
  적지 않은 PHP로 tree를 검증했습니다. `.php-version`은 8.5를 적고, `scripts/toolchains.py`는
  `php -n -r 'echo PHP_VERSION;'`의 major.minor를 그것과 비교해 기대값과 실제값을 출력하며, 기록은 실행 중인 patch
  release를 적습니다. `test_toolchains`의 바뀐 사례는 변경 전에 실패했고 변경 후 통과합니다.
- CI의 push gate는 make target으로 실행합니다(T1.4). `.github/workflows/push-gate.yml`의 step은
  `python3 scripts/push_gate.py commit`을 직접 실행했으므로 Makefile의 환경과 사전 검사가 적용되지 않았습니다.
  `make push-gate COMMIT=<commit>`이 gate를 실행하고 `COMMIT`이 없으면 실패하며, step은 이 target을 실행합니다.
  `test_push_gate`의 바뀐 사례와 새 사례는 변경 전에 실패했고 변경 후 통과합니다.
- 내려받지 않은 입력은 `make tools`를 안내합니다(T1.3). 검사가 offline이 되자 `make tools`가 내려받지 않은 crate는
  `--offline` 없이 다시 시도하라는 cargo의 안내로, 없는 PIE PHAR는 `make pie-check`의 `FileNotFoundError` traceback으로,
  없는 추가 사례는 `--suite must contain test_parsing/`나 `Supplementary suite is empty`로 실패했습니다. 모든 진입점은
  toolchain 검사 뒤 `rust/Cargo.lock`에 `cargo fetch --locked --offline`을 실행하고 lock file, cargo의 첫 error 줄,
  `run make tools, which downloads them`을 밝히며 실패합니다. `scripts/check_pie.py`와 `scripts/test.py`는 어떤 단계보다
  먼저 없는 PHAR나 추가 사례와 `make tools`를 밝힙니다. `test_toolchains`의 새 사례는 변경 전에 실패했고 변경 후
  통과합니다.
- 검사는 offline으로 실행하고 `make tools`만 내려받습니다(T1.2). cargo, go, npm, Composer는 모든 검사에서 online으로
  실행됐으므로 `cargo build --locked`가 `rust/Cargo.lock`의 crate를 필요할 때 내려받았고, PIE PHAR와 추가 사례는 손으로
  내려받았습니다. Makefile은 `CARGO_NET_OFFLINE=true`, `GOPROXY=off`, `npm_config_offline=true`,
  `COMPOSER_DISABLE_NETWORK=1`을 export하고, `scripts/toolchains.py`는 모든 진입점에 이를 설정하며, `make tools`는 이를
  제거한 채 실행합니다. `make tools`는 Rust toolchain, npm, crate, `.cache/pie/pie.phar`의 PIE PHAR,
  `.cache/JSONTestSuite`의 추가 사례를 설치하고 각각을 `external-inputs.json`과 대조합니다. `test_toolchains`의 새 사례는
  변경 전에 실패했고 변경 후 통과합니다.
- 제품 기능이 아닌 작업은 실행 체크리스트 `docs/plans/execution-checklist.md`에서 추적합니다(T1.1). `make check`의
  guard, pre-push hook, push gate는 `docs/features.md`의 `partial` 기능만 읽었으므로, 그런 작업에는 전체 실행이나 push를 멈추는
  상태가 없었습니다. 각 작업은 `[ ]`, `[~]`, `[o]`, `[!] cause: <cause>; retry: <condition>` 중 하나의 상태를 가집니다.
  `scripts/docs_check.py`는 다른 상태, 작업 ID가 없는 행, 반복된 ID, 행이 없는 체크리스트, ID나 상태가 다른 번역을 거부하고,
  `scripts/full_run.py`와 `scripts/push_gate.py`는 작업이 `[~]`이거나 체크리스트를 읽을 수 없으면 거부합니다.
  `test_docs_check`, `test_full_run`, `test_push_gate`의 새 사례는 변경 전에 실패했고 변경 후 통과합니다.
- Python은 minor release로 고정합니다. `.python-version`은 3.9.6을 적었고 `scripts/toolchains.py`는 그 release를 정확히
  요구했지만, `actions/python-versions`가 `ubuntu-24.04`용 3.9.6을 build하지 않으므로 CI는 3.9.25를 실행합니다. 로컬 실행과 CI가 서로
  다른 규칙을 따랐습니다. 로컬과 CI에서 같은 patch release를 쓸 수 없는 interpreter는 minor release로 고정합니다. `.python-version`은
  3.9를 적고, 검사는 major.minor를 비교해 기대 버전과 실제 버전을 출력하며, 통합 기록과 PIE 기록은 실행 중인 patch release를
  `platform.python`에 적습니다. PHP patch release를 비교하는 검사는 없습니다. `scripts/tests/test_toolchains.py`의 새 case는 3.9.25
  interpreter가 검사에 실패했으므로 변경 전에 실패했고, 변경 후에는 통과합니다. 3.10 interpreter는 실패합니다.
- AGENTS.md에 멱등성 절이 있습니다. 같은 tree는 언제 어느 기계에서든 같은 결과를 내고, 한 polyspec 저장소에서 찾은 결함은 모든
  저장소에서 고치는 부류이며, 부류마다 규칙 하나가 이 저장소가 그것을 지키는 방법을 밝힙니다. registry 질의나 필요할 때의 설치 없이
  추적되는 버전의 도구, 자기 출력과 추적 파일만 읽는 test, 원자적 게시, 모으는 실패, 기대값, 실제값, 도구 오류를 담은 실패, 실패하는 빈
  선택, process group 회수와 `finally`의 디렉터리 제거, 사람이 읽는 도구 출력에 대한 단언 금지, 바뀐 모든 파일의 소유자, 공유 상태를 위한
  lease나 실행별 디렉터리입니다.
- PHP 확장의 build 사본은 Git이 추적하는 파일만 담습니다. `scripts/registry.py`는
  `git ls-files --cached --others --exclude-standard`를 복사했으므로, `php-extension/`의 추적되지 않은 파일이 어떤 기록에도 밝혀지지
  않은 채 `scripts/verify.py`, `make pie-check`, benchmark의 build에 들어갔습니다. 사본은 source manifest의 추적 목록을 사용하고, Git
  metadata가 없는 tree는 통째로 복사하며, 추적되는 symbolic link는 여전히 거부합니다. `scripts/tests/test_run_isolation.py`의 바뀐
  case는 추적되지 않은 파일이 복사되었으므로 변경 전에 실패했고, 변경 후에는 통과합니다.
- 모든 추적 경로는 그것을 소유한 검사에 대응됩니다. 새 `scripts/owner-checks.json`은 경로 glob을 검증기 unit test module,
  `scripts/verify.py --only`가 검사하는 구현, 검사 `docs`와 `benchmark`에 대응시키고, `make owner-check`가 실행하는 새
  `scripts/owner_check.py`는 이 대응을 검사한 뒤 커밋되지 않은 변경, `PATHS`, 또는 `BASE` 이후 바뀐 경로의 소유자를 각각 끝까지
  실행합니다. 새 pre-commit hook `.githooks/pre-commit`은 추적 경로가 어떤 규칙에도 맞지 않거나, glob이 어떤 경로에도 맞지 않거나,
  소유자가 존재하지 않으면 commit을 거부하고, `scripts/push_gate.py`는 이 hook을 pre-push hook처럼 요구합니다. `make hooks-check`는 이
  hook이 실행 가능하지 않으면 실패하고, CI는 mode 100755로 추적되지 않으면 실패합니다. 바뀐 파일을 소유한 test를 밝히는 것이 없었으므로,
  소유한 test만 실행하는 절차는 소스를 읽는 데 의존했습니다. 새 `scripts/tests/test_owner_check.py`의 case와
  `scripts/tests/test_push_gate.py`의 새 case는 대응, 검사, hook이 없었으므로 변경 전에 실패했고, 변경 후에는 통과합니다.
- 빌드 단계, 패키지 테스트 명령, 어댑터는 손자 process를 포함한 process group 전체와 함께 끝납니다. group은 직접 자식이 실행 중일
  때만 종료되었고 읽는 쪽은 end of file을 기다렸으므로, 명령이 background에서 시작한 process는 명령이 끝난 뒤에도 실행되었고, 빌드
  단계는 그 process를 제한 없이 기다렸으며, 패키지 테스트 실행은 케이스 기한에서 실패했습니다. `scripts/registry.py`는 명령이 끝나면
  group을 종료하는 `next_chunk`로 출력을 읽고, `end_group`은 모든 `finally`에서 group을 종료합니다.
  `scripts/tests/test_build_runs.py`와 `scripts/tests/test_comparison_runs.py`의 case는 어떤 코드에도 없는 `BUILD_SECONDS`,
  `PIE_SECONDS`, `timeout` 인자를 patch했으므로 patch가 아무것도 바꾸지 않았고, 이제 조용한 단계가 2 s 이상 실행되어 자기 종료로
  끝났다고 단언합니다. 새 `scripts/tests/test_process_groups.py`의 case는 빌드 단계가 test 기한까지 기다렸고, 패키지 테스트가 케이스
  기한에서 실패했고, 멈춘 어댑터의 손자 process가 살아남았으므로 변경 전에 실패했고, 변경 후에는 통과합니다.
- 케이스 목록은 선언된 기계 형식으로 읽습니다. 목록 parser는 모든 언어에서 사람이 읽는 text(`ok`, `?`, `running`, `test result:`,
  `FAIL`)로 줄을 건너뛰었으므로, 패키지 자신의 목록에서 `ok`로 시작하는 줄은 빠졌고, standard error의 어떤 알림이든 성공한 목록을
  실패시켰습니다. `implementations.json`의 `test_cases`는 `format`을 선언합니다. JavaScript, PHP, PHP 확장의 목록은 `lines`,
  `cargo test -- --list --format terse`는 `cargo-terse`, `go test -list .* -json`은 `go-test-json`이며, 그 output event는 test
  이름이나 자기 package의 요약 줄을 담습니다. 형식이 정의하지 않은 줄은 목록을 실패시키고, 0이 아닌 종료는 standard error와 함께 목록을
  실패시키며, 0으로 끝난 목록의 standard error는 도구 알림으로 출력합니다. `scripts/tests/test_full_run.py`와
  `scripts/tests/test_push_gate.py`의 `make -n` case는 모든 make에 flag와 makefile을 더하는 호출자의 `GNUMAKEFLAGS`와 `MAKEFILES`도
  제거합니다. 새 `scripts/tests/test_case_listings.py`의 case와 `scripts/tests/test_full_run.py`의 새 case는 형식이 선언되지 않았고,
  `ok` 줄이 통과했고, 알림이 목록을 실패시켰고, `MAKEFILES`의 makefile이 dry run에 출력했으므로 변경 전에 실패했고, 변경 후에는
  통과합니다.
- `make check`와 `make rerun-failed`의 guard는 첫 검사부터 끝까지 `var/full-run.lock`을 배타적으로 잡고, 다른 guard가 이를 잡고
  있으면 그 holder를 밝히며 거부합니다. 동시에 시작한 두 guard는 둘 다 실행 중인 실행의 record를 읽지 못해 한 tree의 검증을 둘 다
  실행했습니다. Makefile을 읽는 것은 더 이상 `core.hooksPath`를 쓰지 않습니다. `make -n`을 포함한 모든 `make` 실행이 Makefile을 읽을 때
  이를 설정했습니다. `make hooks`는 새 `scripts/push_gate.py hooks-install`을 실행하고, 이 명령은 값이 다를 때만 설정을 쓴 뒤 hook을
  검사하며, guard는 여전히 hook이 없는 checkout을 거부합니다. `scripts/tests/test_full_run.py`의 새 case는 두 guard가 모두 target을
  실행했으므로, `scripts/tests/test_push_gate.py`의 바뀐 case는 `make -n docs-check`가 `core.hooksPath`를 썼으므로 변경 전에
  실패했고, 둘 다 변경 후에는 통과합니다.
- 실패는 무엇이 다른지 밝힙니다. PIE build나 도구 오류는 "위의 PIE 출력을 보라"고만 했고, 이제 일치한 줄을 나열합니다. 오래된 통합
  기록이나 PIE 기록, 실행 중에 바뀐 소스는 소스가 다르다고만 했고, 이제 바뀐 파일, 추가된 파일, 제거된 파일을 모두 나열합니다. 실패한
  runtime version 명령과 benchmark 명령은 도구의 standard error를 잃었고, 이제 둘 다 종료 상태와 그 오류를 포함합니다.
  `implementations.json`의 `extension_version` runtime 명령은 `phpversion('ordered_json')`이 `ORDERED_JSON_VERSION`과 다르면 메시지
  없이 status 1로 끝났고, 이제 두 값을 출력합니다. 거부된 push가 출력하는 규칙은 CI가 전체 검증을 실행한다고 적었지만 CI는 이를 실행하지
  않으며, 이제 CI가 검증을 실행하지 않는다고 적습니다. `js/package.json`과 `php/composer.json`의 `test` script는 존재하지 않는
  `scripts/check.py`를 실행했고, 이제 `../scripts/verify.py --only js`와 `--only php`를 실행합니다. 새
  `scripts/tests/test_failure_messages.py`의 case는 각 메시지에 해당 줄, 파일, 값, 오류가 없었으므로 변경 전에 실패했고, 변경 후에는
  통과합니다.
- `benchmarks/run.py`와 비교 script는 완성된 파일을 결과 위로 이름을 바꾸는 `write_record`로 결과를 게시합니다.
  두 script는 `benchmarks/results.json`, 검토용 사본 `.cache/benchmark.current.json`, 비교 보고서를
  제자리에서 썼으므로, 파일을 연 직후 멈춘 process는 잘린 파일을 남겼고 읽는 쪽은 파일의 일부를 볼 수 있었습니다. `write_record`는
  저장소 안의 파일을 `docs/`의 기록 옆 숨은 파일 대신 Git이 무시하고 어떤 manifest도 읽지 않는 `var/`에서 준비합니다. 새
  `scripts/tests/test_atomic_publish.py`의 중단 case 두 개는 연 직후 멈추면 빈 파일이 남았으므로 변경 전에 실패했고, 변경 후에는
  통과합니다.
- `make pie-check`는 PIE를 실행하기 전에 PHAR의 해시와 JSONTestSuite checkout을 `external-inputs.json`의 고정값과 비교하고,
  `make check`는 단위 테스트 전에 추가 사례를 비교합니다. 마지막의 문서 검사만 이를 비교했으므로, 고정값과 다른 PHAR나 추가 사례
  checkout은 검사가 결국 거부하는 기록을 위해 build와 실행 전체를 소모했습니다. 다른 필드마다 기대값과 실제값을 밝히며 명령이 실패합니다.
  고정값을 읽는 함수는 `scripts/docs_check.py`에서 새 `input_issues` 옆의 `scripts/verification_record.py`로 옮겼습니다. 새
  `scripts/tests/test_external_pins.py`의 case는 PIE가 고정되지 않은 PHAR와 추가 사례로 실행되고 전체 실행이 고정되지 않은 추가
  사례로 단위 테스트를 시작했으므로 변경 전에 실패했고, 변경 후에는 통과합니다.
- `scripts/test.py --unit`은 이름이 test를 하나도 고르지 않으면 어떤 test도 실행하기 전에 `selected 0 tests`와 그 이름을 출력하며
  실패하고, 전체 실행은 unit test를 하나도 찾지 못하면 실패합니다. `--unit registry`는 test가 없는 module `scripts/registry.py`를
  읽어 0개의 test를 실행하고 status 0으로 끝났으므로, 잘못 적은 선택이 test 실행으로 통과했습니다.
  `scripts/tests/test_unit_runner.py`의 새 case는 `--unit registry`가 status 0으로 끝났으므로 변경 전에 실패했고, 변경 후에는
  통과합니다.
- push gate와 guard는 기능 행을 내지 않는 tracker를 거부합니다. 둘 다 `| F-`로 시작하는 줄만 읽었으므로, 기능 표가 없거나, 표가
  비었거나, ID가 `F-...`가 아닌 행이 있는 `docs/features.md`에는 `partial` 행이 없었고 `scripts/push_gate.py hook`은 거부하지
  않았습니다. `scripts/docs_check.py`는 새 `feature_table`로 기능 표를 읽고, 이 함수는 표가 없거나, 행이 없거나, 기능이 아닌 행이
  있으면 예외를 던집니다. `scripts/full_run.py`와 `scripts/push_gate.py`도 이 함수로 행을 읽으며, push gate는 push를, guard는
  실행을 이유와 함께 거부합니다. `scripts/tests/test_push_gate.py`와 `scripts/tests/test_full_run.py`의 새 case는 hook, CI 명령,
  guard가 그런 tracker를 통과시켰으므로 변경 전에 실패했고, 변경 후에는 통과합니다.
- 모든 실행은 어떤 작업보다 먼저 도구를 추적되는 고정값과 비교합니다. 고정한 것이 없었습니다. 실행은 기계에 있는 Node.js, Rust, Go,
  Python, npm을 그대로 사용했고, go는 `go.mod`의 toolchain을 내려받을 수 있었고, rustup은 첫 cargo에서 toolchain을 설치할 수
  있었고, cargo는 `Cargo.lock`을 다시 쓸 수 있었으며, CI는 `ubuntu-latest`에서 움직이는 tag의 action으로 실행했습니다.
  `.node-version`은 Node.js 26.8.1, `rust-toolchain.toml`은 Rust 1.98.1, `go/go.mod`의 새 `toolchain` 줄은 Go 1.27.0,
  `.python-version`은 Python 3.9.6, `package.json`의 `packageManager`는 registry tarball의 SHA-512와 함께 npm 12.2.0을
  고정합니다. 새 `scripts/toolchains.py`는 각 도구를 고정값과 비교하고, `scripts/test.py`, `scripts/verify.py`,
  `scripts/check_pie.py`, `benchmarks/run.py`는 첫 단계 전에 이를 호출해 다른 도구마다 기대 버전과 실제 버전 또는 명령의 오류를 밝히며
  실패합니다. `GOTOOLCHAIN=local`과 `RUSTUP_AUTO_INSTALL=0`은 Makefile, registry, 검사가 설정하고, 모든 cargo 명령은
  `--locked`를 사용하며, runtime version은 rustup이 고정값을 읽는 저장소 디렉터리에서 읽습니다. `make tools`는 Rust toolchain을
  설치하고 npm tarball을 내려받아 hash가 일치하지 않으면 거부하며, `PATH`의 맨 앞에 오는 `.cache/tools/npm`에 link 없이 풉니다.
  기계의 npm은 사용하지도 바꾸지도 않습니다. GNU Make 3.81은 단순한 recipe 명령을 export한 `PATH`가 아니라 자기 `PATH`에서 찾으므로,
  어떤 recipe도 고정된 도구를 이름으로 실행하지 않습니다. CI는 `ubuntu-24.04`에서 commit에 고정한 `actions/checkout`,
  `actions/setup-python`과 `actions/python-versions`가 그 image용으로 build하는 마지막 3.9 release인 Python 3.9.25로 실행하며,
  `scripts/push_gate.py`만 실행합니다. 새 `scripts/tests/test_toolchains.py`의 case는 고정값과 검사가 없었고, cargo 명령에
  `--locked`가 없었고, workflow가 `ubuntu-latest`와 tag를 사용했으므로 변경 전에 실패했고, 변경 후에는 통과합니다.
- 검증은 모든 언어의 모든 단계를 끝까지 실행하고 모든 실패를 보고합니다. 첫 실패가 실행을 끝냈습니다. 실패한 prepare 단계는 예외를
  던졌고, package test는 처음 실패한 package에서 멈추었고, 공통 사례는 첫 불일치에서 멈추었으며, `scripts/test.py`는 단위 테스트가
  실패하면 build 전에 반환했습니다. 그래서 두 번째로 실패한 언어는 첫 언어를 고치고 전체 실행을 다시 시작할 때까지 보고되지 않았습니다.
  이제 `scripts/test.py`는 단위 테스트, 각 언어의 build, case와 symbol listing, package test, 모든 adapter의 모든 사례, runtime
  version을 끝까지 실행하고, 모든 실패를 나열하며, record를 쓰지 않고 1을 반환합니다. 실패한 build는 자기 언어의 이후 단계만
  건너뜁니다. `scripts/verify.py --only`는 모든 실패를 나열하고 status 1로 끝납니다. `scripts/tests/test_repositories.py`는 실패한
  package가 검증을 멈춘다고 단언했고, 이제 그 뒤의 package가 실행되고 실패한 두 package가 모두 보고된다고 단언합니다. 그 case와 새
  `scripts/tests/test_failure_collection.py`의 case는 실패한 두 언어 중 첫 언어만 보고되었으므로 변경 전에 실패했고, 변경 후에는
  통과합니다.
- 기록, 문서 검사, 공통 사례는 Git이 추적하는 파일만 읽습니다. `scripts/verification_record.py`의 source manifest는
  `git ls-files --cached --others --exclude-standard`를 나열하고 소스 pattern에 맞는 모든 파일을 더했으므로, 추적되지 않은 파일이
  record가 커밋된 tree로 밝히는 manifest를 바꾸었습니다. `scripts/docs_check.py`는 Markdown 문서와 JSON 보고서를 찾으려고
  디렉터리를 순회하고 디스크의 fixture를 셌으며, `scripts/verify.py`는 디스크의 모든 fixture 파일을 공통 사례로 실행했습니다.
  `scripts/registry.py`는 `git ls-files --cached`로 추적 파일을 나열하고, 이 읽기들은 모두 그 목록을 사용합니다. source archive처럼
  Git metadata가 없는 tree는 여전히 자기 파일을 읽습니다. guard `scripts/full_run.py`도 `.gitignore`가 무시하지 않는 파일이 추적되지
  않으면 build가 그 파일을 읽으므로 각각을 밝히며 전체 실행을 거부합니다. 새 `scripts/tests/test_tracked_inputs.py`의 case와
  `scripts/tests/test_full_run.py`의 새 case는 추적되지 않은 파일이 manifest, 문서, 보고서, fixture, guard 판단을 바꾸었으므로 변경
  전에 실패했고, 변경 후에는 통과합니다.
- 검증 실행의 모든 cargo 명령은 그 실행 안의 `CARGO_TARGET_DIR`에 빌드합니다. Rust probe는
  `rust/target/debug/examples/probe`였고 cargo는 환경이 지정한 target 디렉터리를 사용했으므로, 다른 체크아웃이나 이전 tree가
  빌드한 probe, test binary, API listing이 현재 소스를 대신해 답할 수 있었습니다. `implementations.json`은 `rust`에
  `"env": {"CARGO_TARGET_DIR": "{cache}/rust-target"}`를 선언하고, `scripts/registry.py`는 이를 그 구현의 모든 prepare 단계,
  listing, test, runtime 명령에 전달하며, probe는 `{cache}/rust-target/debug/examples/probe`입니다. `benchmarks/run.py`는 Rust
  benchmark의 `cargo run`을 실행 디렉터리 안의 `CARGO_TARGET_DIR`로 실행합니다. `scripts/tests/test_run_isolation.py`의 새 case
  두 개는 명령이 상속된 `CARGO_TARGET_DIR=/shared/target`을 유지했으므로 변경 전에 실패했고, 변경 후에는 통과합니다.
- push는 `docs/features.md`에 `partial` 기능이 없을 때만 합니다. pre-push hook `.githooks/pre-push`는
  `scripts/push_gate.py hook`을 실행하고, 이 명령은 push되는 commit이나 working tree에 `partial` 행이 있으면 각 ref, commit, ID,
  기능을 밝히며 push를 거부하고, push되는 commit의 `docs/features.md`를 읽을 수 없으면 거부합니다. 모든 `make` 실행은 Makefile을
  읽을 때 `core.hooksPath`를 `.githooks`로 설정합니다. `make hooks`는 이를 설정하고 검사하며, `make hooks-check`는 설정되지 않았거나
  hook이 실행 가능하지 않으면 실패합니다. guard `scripts/full_run.py`는 hook이 설치되지 않았으면 `make check`와 `make rerun-failed`를
  거부합니다. hook이 없는 checkout에서 한 push는 hook을 실행하지 않으므로, workflow `.github/workflows/push-gate.yml`이 모든 push된
  branch와 pull request에서 job `push-gate`로 `scripts/push_gate.py commit`을 실행합니다. 이 job은 기능이 `partial`이면 실패하고,
  `.githooks/pre-push`가 mode 100755로 추적되지 않으면 실패합니다. AGENTS는 이 저장소에 CI workflow가 없다고 적었고, 진행 중인 작업의
  push를 거부하는 것은 없었습니다. `scripts/tests/test_push_gate.py`와 `scripts/tests/test_full_run.py`의 새 case 두 개는 gate, hook,
  workflow가 없고 guard가 hook 상태를 받지 않았으므로 변경 전에 실패했고, 두 file의 20개 case는 변경 후에 모두 통과합니다.
- `scripts/docs_check.py`는 `docs/features.md`나 그 번역에서 기능 행의 구현 칸이 아닌 곳에 code span이나 표 칸으로 적힌 구현
  상태(`implemented`, `partial`, `planned`)와, 기능 표의 절에서 표가 아닌 줄에서 file, 줄, 열을 적으며 실패합니다.
  `docs/features.md`는 `scripts/full_run.py`가 읽는 tracker이고, 그 범례 문단이 각 상태를 그 절 안에 code span으로 적었으므로
  상태를 읽는 도구가 기능 행 밖의 상태를 보았습니다. 범례는 상태를 정의하는 AGENTS.md의 새 절 기능 상태로 옮겼습니다. 문장 속 상태 단어는 일반 영어이므로 검사하지
  않습니다. `scripts/tests/test_docs_check.py`의 새 case 두 개는 변경 전에 code span, 표 칸, 표 절의 문단이 검사를 통과했으므로
  실패했고, 변경 후에는 통과합니다. 범례를 옮기기 전에 검사는 `docs/features.md`의 9번째 줄과 번역의 10번째 줄을 보고했습니다.
- `make check`는 검증보다 먼저 guard `scripts/full_run.py`를 시작합니다. 개발 절차는 `make check`를 모든 활성 항목이 완료된 뒤 한
  번 실행하도록 하지만 이를 강제하는 것이 없었습니다. `make check`는 작업이 진행 중일 때, 커밋되지 않은 변경이 있을 때, 이미 검증한 tree에서도 검증을
  시작했습니다. guard는 판단을 이유와 함께 출력하고, `docs/features.md`의 기능이 `partial`이면 각 ID를 기능과 함께 나열하며 거부하고, 추적
  파일의 변경이 커밋되지 않았으면 거부하고, `var/full-run.json`이 현재 tree의 전체 실행을 기록하고 있으면 그 실행을 밝히며 거부합니다. 검증을 끝까지
  실행하고 그 앞뒤에 record를 쓰므로 멈춘 실행은 `incomplete`로 남습니다. `make rerun-failed`는 현재 tree의 전체 실행이 실패했거나 끝나지
  않았을 때만 검증을 다시 실행합니다. `docs/features.md`는 `partial`을 진행 중인 작업으로, `planned`를 시작하지 않은 작업으로 정의합니다.
  `scripts/tests/test_full_run.py`는 변경 전 `No module named 'full_run'`으로 실패했고 그때 `make -n check`는
  `scripts/test.py`만 출력했습니다. 변경 뒤 그 10개 case가 stub target으로 통과합니다.
- 각 검증 실행은 자신만의 임시 실행 디렉터리에서 빌드하고 끝나면 그 디렉터리를 제거합니다.
  `make check`, `scripts/verify.py`, PIE 검사, 벤치마크는 그 디렉터리에 복사한 `php-extension/`
  소스 파일로 PHP 확장을 빌드하고, Go probe는 그 디렉터리에 기록되며, PIE는 그 디렉터리에서
  작업합니다. 확장은 `php-extension/src`
  에서 `make distclean`, `phpize`, `configure`로 빌드되었고 Go probe, PIE 작업 디렉터리, 프로브 빌드 디렉터리는
  `.cache/` 아래 고정 경로를 사용했기 때문에, 한 체크아웃의 두 실행이 다른 실행이 사용
  중인 빌드 출력을 지우거나 교체했습니다. registry 키 `build_in_copy`가 복사본 빌드를 선택하며,
  복사본은 추적 중이거나 무시되지 않은 파일을 담고 symbolic link를 거부합니다. PIE 기록은
  산출물을 실행 디렉터리 기준 경로로 명시합니다. 이전 제자리 빌드가 남긴 무시된 출력
  (`php-extension/src`의 `phpize`, `configure`, `make` 파일과 `modules/`, `.cache/probes`,
  `.cache/pie-check`)은 어떤 명령도 읽지 않으므로 체크아웃에서 제거했습니다.
- 빌드 단계 출력을 흘려 보냅니다. 각 `prepare` 단계와 PIE 명령은 시작 줄, 도착하는 대로의 출력
  줄, 종료 상태와 경과 시간을 출력합니다. 두 곳 모두 출력을 모았다가 명령이 끝난 뒤에 출력해서,
  PIE 빌드는 약 42 s 동안 아무것도 보이지 않았습니다.
- 빌드 단계와 PIE 명령에는 시간 한도가 없으며, 종료 상태와 출력이 결과를 결정합니다. `prepare`
  단계마다 1500 s, PIE 명령마다 4200 s였던 deadline은 그 시간 동안 출력 없이 진행하던 정상
  빌드를 종료하고 실행을 실패시켰습니다. 패키지 테스트 케이스와 어댑터 응답은 60 s deadline을
  유지합니다.
- 검증기는 각 어댑터에 공통 사례를 한 번에 하나씩 보내고 응답 하나를 60 s deadline으로 읽으며,
  사례마다 경과 시간과 함께 출력합니다. 응답하지 않는 어댑터는 종료되고 해당 사례 이름이
  보고됩니다. 이전에는 모든 사례를 한꺼번에 보내고 어댑터 실행 전체에 60 s 한도 하나를 두어서,
  느리거나 응답하지 않는 어댑터는 사례 이름 없이 실패했고 어댑터가 끝날 때까지 아무것도
  출력되지 않았습니다.
- 패키지 테스트 출력을 흘려 보냅니다. 각 케이스의 deadline은 직전 결과 줄 이후 60 s입니다.
  이를 넘긴 실행기는 process group과 함께 종료되고, 검증기는 실행 중이던 케이스와 경과 시간을
  보고합니다. 이전 검증기는 출력을 모두 모았다가 실행기가 끝난 뒤에만 보여 줘서, 멈춘 케이스는
  아무것도 보이지 않았고 실행은 끝나지 않았습니다. JavaScript와 PHP 실행기는 케이스마다
  `<id> ok|FAIL (<ms>)`를 출력합니다. Rust는 `--quiet` 없이 `--test-threads=1`로 실행해서 각
  test 이름을 실행 전에 출력하고, Go는 `-v -p 1`로 실행합니다. `go test`는 여러 package를
  병렬로 검사하면 package가 끝날 때까지 그 출력을 붙잡아 두기 때문입니다.
- 개발 절차는 변경을 진행하는 동안 그 변경을 소유한 테스트만 실행하고(`scripts/verify.py
  --only`, `scripts/test.py --unit`), `make check`는 활성 항목이 모두 끝난 뒤 한 번 실행합니다.
  이전 절차는 변경마다 `make check`를 요구해서 수정할 때마다 모든 패키지와 공통 사례를 다시
  실행했습니다. 기본적으로 `main`에서
  작업하고, 에이전트나 상황이 필요로 하는 브랜치나 워크트리는 합친 즉시 제거합니다.
- 검증기 unit test는 시작할 때 test 이름을 출력하고, 끝나면 상태와 경과 시간을 출력합니다. 각
  test에는 자기 deadline이 있으며, test가 따로 선언하지 않으면 60 s입니다. deadline을 넘긴
  test는 이름과 함께 실패합니다. 이전 runner는 test마다 점 하나만 출력해서, 멈춘 test는 아무것도
  출력하지 않았고 실행은 끝나지 않았습니다. `python3 scripts/test.py --unit TEST...`는
  지정한 test만 실행합니다.
- `make docs-check`는 문서만 검사합니다. 이 검사는 검증 기록을 현재 소스와 비교해서, 소스를
  하나라도 바꾸면 전체 suite를 실행할 때까지 "Verification is stale"로 실패했습니다. `make
  check`는 기록을 쓴 뒤 `--records`를 붙여 검사기를 실행하므로 오래된 검증 기록이나 PIE 기록은
  그 단계에서 여전히 실패합니다.
- root `Cargo.toml`을 제거합니다. 이 파일은 `rust/Cargo.toml` 옆에서 `ordered-json` 패키지를 한
  번 더 정의해서, 이 저장소에 의존하는 모든 Cargo 빌드가 "skipping duplicate package"를 경고했습니다.
  Cargo는 그 파일 없이도 Git 의존성에서 `rust/Cargo.toml`을 찾습니다. 저장소 테스트가 Cargo
  패키지마다 manifest 하나를 요구합니다.
- Rust 소스를 rustfmt로 정리하고 `make check`의 모든 Rust build 전에 형식을 확인합니다.
  `rust/src/lib.rs`와 `rust/tests/api.rs`는 rustfmt 형식이 아니었고, 이를 잡는 확인이 없었습니다.
- JavaScript 타입 선언에 `ParseError.kind`를 선언합니다. 파서는 모든 `ParseError`에 거부 종류를
  설정하지만, TypeScript 호출자는 형 변환 없이 그 값을 읽을 수 없었습니다.
- 모든 깊이에서 해석된 객체 키의 반복을 같은 위치 규칙과 UTF-16 단위로 거부하는 JavaScript
  `rejectDuplicates` 파싱 옵션을 추가합니다. 기본 파싱은 바뀌지 않습니다.
- 모든 깊이에서 해석된 객체 키의 반복을 거부하는 PHP 파싱을 Rust 엄격 바이트 파서와 같은
  위치 규칙으로 추가합니다. `Value::parse`는 문서화된 결과를 유지합니다.
- Rust 타입 바인딩 의존성을 검증한 버전으로 고정합니다. 바인딩은 Serde JSON 토큰 프로토콜로
  JSON 원문을 기록하므로 의존성 업데이트에는 해당 패키지 테스트가 필요합니다.
- 검증 기록에 구현의 테스트 결과가 있을 때 `package-tests` 기능 검증 상태를 허용합니다.
  현재 테스트 의존성이 요구하므로 Rust 최소 버전은 1.71입니다.
- Rust Serde 타입 인코딩·디코딩을 추가합니다. 구조체 필드는 선언 순서를 유지하고
  wire·manifest fixture가 출력 바이트를 고정하고 포함된 `Value` 필드는 객체 순서와 숫자 토큰을
  유지하며 잘못된 입력, 반복 입력, 알 수 없는 입력은 오류로 처리합니다.
- 모든 깊이에서 해석된 객체 키의 반복을 거부하는 Rust 바이트 파서를 추가합니다. 모든 입력
  멤버가 필요한 호출자는 이를 선택하고 일반 파서는 문서화된 결과를 유지합니다.
- Rust 패키지의 Cargo 레지스트리 게시를 비활성화합니다. Rust 패키지에 선언된 라이선스가
  없고 소스 체크아웃만 배포가 확인되었습니다.
- Go `Marshal`이 nil `*Value` 필드를 `expected orderedjson Value` 오류 대신 다른 nil 포인터와 같이 `null`로 기록하도록 수정했습니다. nil 검사가 `MarshalJSON` 경계보다 먼저 실행되므로 타입이 `MarshalJSON`을 구현하는 nil 포인터는 모두 `null`이며, 인터페이스는 그 안에 담긴 값으로 인코딩합니다.
- 벤치마크 실행기가 각 fixture에 선언된 객체·배열·스칼라·노드·최대 깊이
  수를 파싱한 입력과 대조하도록 수정했습니다. 올바른 메타데이터, 노드
  계산, 깊이 불일치 거부를 검사하는 회귀 테스트를 추가했습니다.
- 모든 벤치마크 하니스가 선언된 반복 횟수뿐 아니라 선언된 시간만큼도 워밍업하며, 러너는 실패한 측정을 커밋된 결과에 반영하지 않았을 때 저장했다고 출력하지 않습니다. 횟수로만 정의한 워밍업은 작은 fixture에서 수 마이크로초 만에 끝나서, 프로세스가 먼저 측정한 fixture가 1.5~1.7배 느리게 나왔고 `serde_json`도 마찬가지였습니다. fixture 순서를 뒤집으면 느려지는 대상이 fixture가 아니라 위치를 따라 옮겨갔습니다. 기록된 프로토콜에 워밍업 시간이 들어가므로 이전 프로토콜로 측정한 결과는 비교 대상이 아니며, 기준을 다시 측정했습니다.
- 등록 정보가 저장소 URL을 한 번만 선언합니다. 같은 값이 `implementations.json`에 패키지마다 하나씩 다섯 벌, 레지스트리 로더와 문서 검사기에 리터럴로 두 벌 더 있었고, 그래서 소스 관찰은 선언이 아니라 상수와 대조되고 있었습니다. 이제 등록 정보가 선언한 하나와 대조합니다.
- 기능은 자신이 주장하는 상태를 뒷받침하는 기록을 가리키며, 벤치마크 결과는 깨끗한 체크아웃에서 `workload.json`이 선언한 프로토콜과 입력으로 측정했을 때에만 근거가 됩니다. 이전 규칙은 검증된 기능이면 무조건 `verification.json`을 걸도록 요구했는데 그 기록에는 벤치마크 내용이 한 줄도 없어서, `F-BENCHMARK`는 측정값이 전혀 없는 파일을 근거로 달고 있었습니다. 커밋된 결과는 60커밋 전 더러운 트리에서 측정된 것이라 어떤 소스를 설명하는지 특정할 수 없었고, 그래서 다시 측정했습니다. 결과는 소스가 아니라 기록이므로, 재측정이 통합 검증 기록을 낡은 것으로 만들지 않습니다.
- 검증 기록은 무언가로 검사할 수 있는 값만 남깁니다. 외부 입력인 PIE 도구와 추가 입력 모음은 `external-inputs.json`에 고정하고 기록과 대조합니다. 기록하던 확장 산출물 해시는 제거했습니다. 링크된 모듈은 매번 새 식별자와 서명을 받아 어떤 재빌드도 같은 해시를 만들지 못했고, 그래서 그 값은 틀릴 수조차 없었으며, `make pie-check`는 실행할 때마다 커밋된 기록을 다시 썼습니다. 이제 기록은 등록 정보가 선언한 경로로 산출물을 명시합니다. 그 선언은 지금까지 아무도 읽지 않던 것입니다. 테스트가 기록된 모든 해시를 하나씩 바꾸고 검사가 실패하기를 요구하므로, 반증할 수 없는 값은 다시 들어올 수 없습니다.
- 파싱 오류가 공통 목록에서 고른 거부 종류를 함께 전하며, 공통 검사가 같은 문서에 대해 모든 구현이 같은 종류를 알리도록 요구합니다. 메시지 문구는 언어별 관습을 그대로 둡니다. Go와 Rust는 소문자 문장을, JavaScript는 숫자 오류의 세분된 표현을 유지합니다.
- 각 패키지가 공개 심볼을 보고하고, 표준은 심볼마다 그것을 검증하는 케이스를 적습니다. 이 대조로 네 곳을 찾았습니다. Go `ParseBytesBorrowed`에는 테스트가 없었고, Rust `OrderedMap::iter`와 `stringify`는 어떤 케이스도 호출하지 않았으며, JavaScript 타입 선언은 `stringify`에 없는 옵션 인자를 설명하고 있었습니다.
- 공통 검사가 각 구현이 입력을 어디에서 거부하는지 비교하며, 모든 구현이 문서를 무효로 만든 첫 바이트를 보고합니다. 이 비교로 위치가 달랐던 문서 5건을 찾았습니다. JavaScript, Go와 두 PHP 백엔드는 이스케이프하지 않은 제어 문자보다 한 바이트 뒤를, 순수 PHP는 잘못된 Unicode 이스케이프에서 문제 자리가 아니라 시작 위치를 가리켰습니다.
- 패키지 테스트 표준과 이를 강제하는 검사를 추가했습니다. 각 구현이 실행하는 케이스를 보고하고, 필수 케이스가 빠지거나 선언되지 않은 케이스가 보고되면 `make check`가 실패합니다. 언어 간 커버리지는 검토가 아니라 도구가 판정합니다.
- 잘못된 UTF-8 오류가 모든 구현에서 첫 잘못된 바이트를 보고합니다. JavaScript와 Go는 0을, Rust와 두 PHP 백엔드는 해당 바이트를 보고했고 공통 사례는 위치를 비교하지 않았습니다. 이제 패키지 테스트가 모든 구현에 이 규칙을 요구합니다.
- JavaScript 패키지가 공통 사례로는 닿을 수 없는 값 API의 자체 테스트를 선언합니다. 이제 모든 구현 패키지가 패키지 테스트를 선언합니다.
- Rust 패키지가 공통 사례로는 닿을 수 없는 값 API의 자체 테스트를 선언합니다.
- PHP의 짝 없는 서로게이트 오류를 고쳤습니다. 네임스페이스 안에서 예외 이름을 수식하지 않아 `UnexpectedValueException` 대신 클래스를 찾을 수 없다는 오류가 났습니다. 이제 PHP 패키지가 자체 테스트를 선언하며, 그 테스트가 이 결함을 찾았습니다.
- PHP 확장 패키지가 공통 사례로는 닿을 수 없는 디스크립터 API의 자체 테스트를 선언합니다.
- 한 바인딩에만 있는 API의 규칙을 API 계약에 적었습니다. 공유 parser와 serializer를 사용하고, 결과·오류·위치를 바꾸지 않으며, 바인딩 확장 절에 적고, 해당 패키지가 선언한 테스트로 검증합니다. Go `Marshal`을 그 절에 문서화했습니다.
- 구현 등록 정보가 패키지별 테스트 명령을 선언하고, `make check`가 그 명령을 실행하며, 검증 기록이 결과를 요구합니다. 공통 사례는 어댑터를 통해서만 실행되어 언어 전용 API에 닿지 못했고, 그래서 모든 공통 사례가 통과하는 동안에도 결함이 남아 있었습니다.
- Go `Marshal`의 생략 규칙과 오류 보고를 바로잡았습니다. `omitempty`와 `omitzero`는 별개 규칙이고, 유한하지 않은 부동소수점은 해당 필드를 지목하며, 도달하지 않던 `time.Time` 분기를 제거했습니다. 시드 기반 무작위 테스트가 값 20,000개를 host 인코더의 해석된 구조와 비교합니다.
- Go `Marshal`을 고쳤습니다. 익명 구조체 필드가 아무 필드도 넣지 못했고, 이름이 겹치는 필드는 조용히 사라졌으며, 순환 참조 값은 프로세스가 죽을 때까지 재귀했습니다. 이제 Go의 필드 승격과 같게 펼쳐 넣고, 겹치는 이름과 파서 한도보다 깊은 값은 오류입니다.
- PHP 객체 하이드레이션이 멤버마다 값을 두 개가 아니라 하나만 만들고, 직렬화는 키 토큰을 디스크립터에서 읽습니다. 파싱 후 전체 조회 시간은 확장에서 이전의 0.85~0.99, 순수 PHP에서 0.90~1.00이었고 결과는 같습니다.
- Go typed 구조체·map·slice·스칼라·시간·바이트 값을 위한 `Marshal` 바인딩을 추가했습니다. 사용자 정의 marshaler 결과를 ordered-json으로 검증하고 host JSON 인코더를 사용하지 않고 compact JSON을 생성합니다.
- PHP 컨테이너 직렬화를 `compact()` 밖으로 옮겼습니다. 조회 함수 변경 후 커진 호출 프레임 때문에 확장 직렬화가 약 1ns 느려졌던 문제이며, 이제 확장 직렬화 시간은 그 변경 전의 0.92~0.95입니다.
- PHP 확장은 자식 `Value` 객체를 PHP 루프 대신 C의 `ordered_json_hydrate()`로 만듭니다. 확장 사용 시 파싱 후 전체 조회 시간은 이전의 0.65~0.99였고, 파싱·직렬화·왕복은 0.99~1.02 범위였으며 결과는 같습니다.
- Rust 루트 배열은 모든 항목을 복사하지 않고 파서의 대기 항목 스택을 그대로 사용하며, 길이의 1/4을 넘는 여유 용량은 해제합니다. 숫자 90개와 110,000개로 된 루트 배열의 파싱 시간은 이전의 0.84~0.85였고 결과는 같습니다.
- PHP 값 조회 비용을 줄였습니다. 조회 함수는 보조 메서드를 연쇄 호출하지 않고 디스크립터 테이프를 직접 읽고, 자식 값은 생성자 승격 없이 만들며, escape 문자열은 중간 UTF-16 단위 배열 없이 UTF-8로 해석합니다. 파싱 후 전체 조회 시간은 확장 사용 시 이전의 0.43~0.89, 순수 PHP에서 0.60~0.97이었고 결과는 같습니다.
- JavaScript `Value` 객체를 파싱 중에 freeze하지 않도록 변경했습니다. 값의 상태는 private field에 있으므로 여전히 라이브러리 API로 변경할 수 없으며, 반환하는 항목 배열과 키 배열은 계속 freeze합니다. API 계약에 이 보장을 명시했습니다.
- PHP `useNative` 파싱 옵션, `parseNative()`, 사용하지 않는 PHP `stringify()` compact 인자, 사용하지 않는 JavaScript `stringify()` options 인자, 네이티브 `ordered_json_compact()` 함수를 제거했습니다. PHP는 확장이 로드돼 있으면 확장을, 그렇지 않으면 순수 구현을 사용합니다.
- PCRE backtrack 또는 recursion 한계가 매우 낮으면 올바른 입력을 거부하던 순수 PHP UTF-8 검증을 수정하고, 오프셋을 지역 변수로 전달하여 순수 PHP 파서 부담을 줄였습니다.
- 문서 검사가 오래된 PIE 기록을 거부하므로 소스 변경 후 `make check`보다 `make pie-check`를 먼저 실행하도록 문서화했습니다.
- 결과, 오류, 오프셋을 바꾸지 않고 모든 구현에서 값마다 수행하던 파싱과 직렬화 작업을 줄였습니다. JavaScript는 `WeakSet` 등록 대신 private field brand로 값을 검사하고, escape가 없는 문자열을 원문에서 잘라 쓰며, 객체 키 토큰을 조회할 때 생성합니다. Go는 값을 묶음 단위로 할당하고 문자열 UTF-16 단위를 조회할 때 해석합니다. Rust는 값마다 빈 해시 맵, 항목 벡터, 단위 벡터를 두는 대신 종류별 payload를 저장합니다. PHP 라이브러리와 확장은 정수 디스크립터 테이프를 사용하며 확장은 별도 선검증 대신 문자열을 검사하면서 UTF-8을 검증합니다. 무의미한 공백과 중복 키가 없는 값은 원문 토큰을 복사하여 직렬화합니다. 이전 구현과 파싱 결과, 오류, 오프셋, 조회 API, 생성 API, 직렬화를 비교하는 차등 테스트를 수행했습니다. PHP 디스크립터 형식은 [API 계약](docs/operations/api.ko.md#php)에 설명합니다.
- 벤치마크가 Rust release 빌드, 고정 workload 입력 digest, 반복 샘플, median/p95 통계, 실행 환경 fingerprint, 커밋된 결과를 사용하도록 수정했습니다.
- 비교 가능한 실행이 허용오차를 초과할 때 커밋된 벤치마크 기준을 보존하고 실패한 측정값을 검토용으로 별도 기록하도록 수정했습니다.
- 네이티브 macOS 배포 대상과 번들 설정을 수정하여 오래된 `-single_module` 및 `-undefined suppress` 링커 경고를 해결했습니다.
- 같은 공통 JSON 사례로 PIE 산출물을 검사하고 PHP 버전과 확장 버전을 별도로 기록하도록 추가했습니다.
- Go 모듈을 `github.com/polyspec/ordered-json/go`로 변경했습니다.
- 이동한 의존성 파일에 이전 빌드 경로가 남아 반복 네이티브 설정 전에 `make distclean`을 추가했습니다.
- 구현 빌드·어댑터·런타임 명령 등록 정보를 추가했습니다.
- PHP 확장 소스를 `php-extension/src`로 분리하고 단독 빌드를 기본 활성화하는 PIE 패키지 메타데이터를 추가했습니다.
- 핵심 값 생성과 문자열 처리에서 host JSON parser와 serializer 의존성을 제거하고 모든 구현에 공통 반복 round-trip 검증을 추가했습니다.
- 런타임 네이티브 JSON API와 비교하는 재현 가능한 다언어 성능 벤치마크를 추가했습니다.
- 고정 workload manifest와 엄격한 벤치마크 행·입력 크기·출력 크기 검사를 추가했습니다.
- PHP 네이티브 확장의 직렬화 중 재파싱을 제거하고 Go와 Rust 구현의 반복 순서 맵 조회를 줄였습니다.
- JavaScript 직렬화와 유니코드 escape 파싱을 최적화하고 PHP 디스크립터 자식 값 생성을 지연했습니다. Rust 직렬화의 불필요한 캐시 할당을 제거하고 명시적인 zero-copy Go `ParseBytesBorrowed` API를 추가했습니다.
- 미릴리스 패키지와 확장 버전을 `0.0.1`로 설정했으며 릴리스나 자동화는 구성하지 않았습니다.

- 언어별 패키지, 네임스페이스, 가져오기, 네이티브 심볼, 빌드 출력을 [API 계약](docs/operations/api.ko.md)의 ordered-json 식별자로 변경했습니다.
- 명세, API, 기능 상태, 운영, 예제, 개발 절차에 영어 정본과 한국어 번역을 추가했습니다.
- `make check`와 `make docs-check`를 추가했습니다. 문서 등록, 링크, 번역 개정본, 섹션·코드 일치, 기능 상태, 현재 검증 근거를 검사합니다. 검증 기록에 실제 소스 해시, 런타임 버전, 공통 테스트 결과를 포함합니다.
- 복사된 읽기 전용 빌드 파일이 반복 설정을 방해하여 PHP 확장을 phpize 생성 파일 정리 후 다시 빌드합니다. 도구의 종료 상태가 0이어도 빌드 오류 진단이 있으면 검증을 중단합니다.
- 요청된 비교를 `docs/reports/`로 이동하고 컴파일 진단 경로를 소스 기준 상대 경로로 변경했습니다.
- JSON 객체를 순서 있는 연관배열로 변경했습니다. 중복 키는 최초 키 위치를 유지하면서 값을 덮어쓰므로 디코딩한 키마다 값이 하나입니다. 중복 조회와 멤버 목록 API를 제거했습니다. 기본 직렬화는 연관배열 객체를 출력하며 원문 조회는 별도로 제공합니다.
- 엄격한 파싱, 재귀 문서 순서, 정확한 숫자 토큰, 생성 API를 제공하는 JavaScript, Rust, Go, 순수 PHP, PHP 확장 구현을 추가했습니다.
- 공식 입력과 기대 결과를 [official.json](examples/official.json)으로 통합하고 공통 문법 사례와 선택적 추가 입력을 제공합니다.
- 모든 구현을 공통 사례 433개로 검증했습니다. PIE 빌드 산출물도 같은 433개를 통과했으며 검사기 테스트 42개가 통과했습니다. 당시 PHP 빌드 도구의 링커 옵션 사용 중단 경고 두 건은 해당 검증 기록에 기록했습니다.

현재 검증 기록은 검사한 소스와 다섯 구현 및 문서 검사기 테스트의 결과를 명시합니다. 배포 확인 결과는 별도입니다. 이 항목은 개발 변경을 기록하며 패키지 릴리스를 선언하지 않습니다.

### npm (packages/js)

- npm 패키지는 `@polyspec/ordered-json`으로 polyspec 관례를 따릅니다. 이전에는 `ordered-json`이었습니다.
- 패키지 테스트 실행기는 케이스를 실행하기 전에 케이스 id를, 실행한 뒤 `ok` 또는 `FAIL`과 경과 밀리초를 동기 쓰기로 출력하므로, 검증기가 끝나지 않는 케이스의 이름을 보고할 수 있습니다. 실행 뒤에 케이스를 한 번 더 나열하던 도달할 수 없는 코드를 제거했습니다.
- 해석된 객체 키가 한 번씩만 나와야 하는 호출자를 위해 `rejectDuplicates` 파싱 옵션을 추가합니다. 두 번째 키의 UTF-16 위치에 `duplicate_object_key` 종류의 `Duplicate object key` 오류를 보고하고, boolean만 받으며, 기본 파싱은 바뀌지 않습니다. 패키지가 커버리지 검사에 두 필드를 모두 보고하도록 `ParseOptions`의 각 필드를 한 줄씩 선언합니다.
- `ParseError`가 자체 메시지와 함께 공통 거부 목록의 `kind`를 전합니다.
- 타입 선언에서 `StringifyOptions`와 `stringify`의 두 번째 인자를 제거했습니다. 이 함수는 인자를 하나만 받습니다. 패키지는 공통 커버리지 검사를 위해 공개 심볼을 보고합니다.
- 이스케이프하지 않은 제어 문자를 한 칸 뒤가 아니라 그 문자의 위치로 보고하며, 어댑터는 공통 비교를 위해 거부 위치를 보고합니다.
- `parseBytes`가 0 대신 첫 잘못된 바이트의 바이트 위치를 보고하며, 이 오류에는 UTF-16 위치가 없으므로 메시지에 단위를 함께 적습니다.
- 값 API의 패키지 테스트를 추가하고 구현 등록 정보에 선언했습니다. 생성 제한, 고정된 항목·키 배열, 접근할 때마다 새로 만드는 멤버 맵, 종류가 맞지 않는 접근, 키 타입 검사, 옵션 검증, `parseBytes` 입력 검사, UTF-16 파싱 위치, 짝 없는 서로게이트의 코드 단위, 팩토리 인자를 다룹니다. 공통 사례는 어댑터를 통해서만 이 패키지에 닿아 그 표면을 다루지 않습니다.
- 파싱한 `Value`마다 `Object.freeze`를 호출하지 않도록 변경했습니다. private field로 값은 API로 변경할 수 없으며 `items`와 `keys` 배열은 계속 freeze합니다.
- 사용하지 않는 `stringify()` options 인자를 제거했습니다.
- 파서와 직렬화 부담을 줄였습니다. 값은 `WeakSet` 등록 대신 private field brand로 검사하고, escape가 없는 문자열은 원문에서 잘라 쓰며, 객체 키 토큰은 조회할 때 생성하고, 무의미한 공백과 중복 키가 없는 값은 원문 토큰으로 직렬화합니다. 결과, 오류, 오프셋은 바뀌지 않았습니다.
- 패키지 자체의 개발 절차, 변경 기록, Makefile, 문서 목록을 추가했습니다.
- 영어와 한국어 사용 방법, 개발 절차, 변경 기록을 추가했습니다.

공통 JSON 동작은 유지합니다. `make check`로 검증 기록을 생성하며 통합 근거는 저장소 루트의 [검증 기록](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.ko.md#records)에서 설명합니다. 여기서는 레지스트리 게시를 선언하지 않습니다.

### rust (packages/rust)

- Cargo 패키지는 `polyspec-ordered-json`, 라이브러리는 `polyspec_ordered_json`으로 polyspec 관례를 따릅니다.
  이전에는 `ordered-json`과 `ordered_json`이었습니다.
- JSON 원문 값이 Serde JSON 토큰 프로토콜을 사용하므로 Serde 바인딩 의존성을 검증한 버전으로
  고정합니다.
- 현재 JSON 테스트 의존성에 맞춰 Rust 최소 버전을 1.71로 설정합니다.
- Serde 타입 인코딩·디코딩을 추가합니다. 구조체 필드는 선언 순서를 유지하고 wire·manifest
  fixture가 바이트를 고정하고 포함된 `Value` 필드는 객체 순서와 숫자 토큰을 유지하며
  잘못되거나 소비되지 않은 입력은 오류로 처리합니다.
- 해석된 객체 키가 한 번만 나와야 하는 호출자를 위해 `parse_bytes_reject_duplicates`를
  추가합니다. 두 번째 키의 바이트 위치를 반환하며 일반 파서는 바꾸지 않습니다.
- `Error::kind`가 공통 식별자로 거부 이유를 알립니다.
- 패키지 테스트가 `OrderedMap::iter`와 `stringify`를 호출하며, 패키지는 공통 커버리지 검사를 위해 공개 심볼을 보고합니다.
- 잘못된 이스케이프를 한 바이트 뒤가 아니라 이스케이프 문자의 위치로 보고하며, 어댑터는 공통 비교를 위해 거부 위치를 보고합니다.
- 값 API의 패키지 테스트를 추가하고 구현 등록 정보에 선언했습니다. 깊이 인자 한도, `parse_bytes`의 UTF-8 위치, `OrderedMap`의 키 검증과 반복 키, 해석한 이름으로 하는 멤버 조회, 짝 없는 서로게이트 단위, 생성자 인자, 종류가 맞지 않는 접근을 다룹니다. 공통 사례는 어댑터를 통해서만 이 패키지에 닿아 그 표면을 다루지 않습니다.
- 루트 배열은 모든 항목을 복사하지 않고 대기 항목 스택을 그대로 사용하며, 길이의 1/4을 넘는 여유 용량은 해제합니다.
- 파서 할당을 줄였습니다. 값마다 빈 맵, 항목 벡터, 단위 벡터를 두는 대신 종류별 payload를 저장하고, 문자열 단위는 처음 조회할 때 해석하며, 객체는 항목 목록 하나를 유지하다가 멤버가 8개를 넘으면 해시 인덱스를 만들고, 무의미한 공백과 중복 키가 없는 값은 원문 토큰을 복사하여 compact 출력을 만듭니다. 결과, 오류, 오프셋은 바뀌지 않았습니다. `Value`와 `OrderedMap`의 derive된 `Debug` 출력은 새 내부 필드를 반영합니다.
- 패키지 자체의 개발 절차, 변경 기록, Makefile, 문서 목록을 추가했습니다.
- 영어와 한국어 사용 방법, 개발 절차, 변경 기록을 추가했습니다.

공통 JSON 동작은 유지합니다. `make check`로 검증 기록을 생성하며 통합 근거는 저장소 루트의 [검증 기록](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.ko.md#records)에서 설명합니다. 여기서는 레지스트리 게시를 선언하지 않습니다.

### go (packages/go)

- `Marshal`이 nil `*Value`와 타입이 `MarshalJSON`을 구현하는 다른 nil 포인터를 `null`로 기록하고, 인터페이스는 그 안에 담긴 값으로 인코딩합니다. 이전에는 nil 포인터의 `MarshalJSON`을 호출해 `expected orderedjson Value` 오류를 반환했습니다.
- `ParseError.Kind`가 공통 식별자로 거부 이유를 알립니다.
- `ParseBytesBorrowed`의 패키지 테스트를 추가했습니다. 반환된 문자열은 호출자의 바이트가 바뀌어도 유지됩니다. 패키지는 공통 커버리지 검사를 위해 공개 심볼을 보고합니다.
- 이스케이프하지 않은 제어 문자를 한 칸 뒤가 아니라 그 문자의 위치로 보고하며, 어댑터는 공통 비교를 위해 거부 위치를 보고합니다.
- 파싱이 0 대신 첫 잘못된 UTF-8 시퀀스의 바이트 위치를 보고합니다.
- `Marshal`이 `omitempty`와 `omitzero`를 각각의 규칙으로 적용해 host 인코더와 맞습니다. zero `time.Time`은 `omitempty`에서 유지되고 `omitzero`에서 빠집니다. 유한하지 않은 부동소수점은 파서에서 뒤늦게 실패하지 않고 해당 필드를 지목해 보고하며, `time.Time`이 자체 `MarshalJSON`을 가지므로 도달하지 않던 `time.Time` 분기를 제거했습니다. 시드 기반 무작위 테스트가 host 인코더와 해석된 구조를 비교합니다.
- `Marshal`이 익명 구조체 필드를 버리지 않고 그 필드들을 펼쳐 넣고, 이름이 겹치는 필드는 중복 키를 만드는 대신 오류로 알리며, 파서의 중첩 한도에서 멈춰 순환 참조 값이 메모리를 소진하지 않고 오류를 반환합니다.
- 파서 할당을 줄였습니다. 값은 문서 구분자 수로 크기를 정한 묶음 단위로 할당하고, 문자열 단위는 조회할 때 해석하며, 멤버가 8개 이하인 객체는 선형 키 조회를 사용하고, 무의미한 공백과 중복 키가 없는 값은 원문 토큰을 복사하여 compact 출력을 만듭니다. `ParseBytesBorrowed` 입력에서 `Compact`와 `StringValue`가 반환하는 텍스트는 복사합니다. 결과, 오류, 오프셋은 바뀌지 않았습니다.
- 패키지 자체의 개발 절차, 변경 기록, Makefile, 문서 목록을 추가했습니다.
- 영어와 한국어 사용 방법, 개발 절차, 변경 기록을 추가했습니다.
- Go 모듈과 검사 어댑터 가져오기를 `github.com/polyspec/ordered-json/go`로 변경했습니다.

공통 JSON 동작은 유지합니다. `make check`로 검증 기록을 생성하며 통합 근거는 저장소 루트의 [검증 기록](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.ko.md#records)에서 설명합니다. 여기서는 레지스트리 게시를 선언하지 않습니다.

### php (packages/php)

- Composer 패키지는 `polyspec/ordered-json`, 네임스페이스는 `Polyspec\OrderedJson`으로 polyspec 관례를 따릅니다. 이전에는 `ordered-json/ordered-json`과 `OrderedJson`이었습니다. 제안하는 확장은 PIE 패키지 `polyspec/ordered-json-extension`입니다.
- 패키지 테스트 실행기는 케이스를 실행하기 전에 케이스 id를, 실행한 뒤 `ok` 또는 `FAIL`과 경과 밀리초를 출력하므로, 검증기가 끝나지 않는 케이스의 이름을 보고할 수 있습니다. `--cases` 목록은 그 줄 없이 검사를 실행하고 케이스 id만 출력합니다.
- 해석된 객체 키가 한 번씩만 나와야 하는 호출자를 위해 `Value::parseRejectDuplicates`를 추가합니다. 두 번째 키의 바이트 위치에 `duplicate_object_key` 종류의 `Duplicate object key` 오류를 보고하고, 두 backend 모두에서 PHP parser로 파싱하며, `Value::parse`는 바뀌지 않습니다.
- `ParseError`가 자체 메시지와 함께 공통 거부 목록의 `kind`를 전합니다.
- 패키지는 공통 커버리지 검사를 위해 공개 심볼을 보고하며, UTF-8 위치 헬퍼는 다른 헬퍼와 같이 내부용으로 표시했습니다.
- 이스케이프하지 않은 제어 문자는 그 문자의 위치로, 잘못된 Unicode 이스케이프는 16진수가 아닌 첫 바이트의 위치로 보고하며, 어댑터는 공통 비교를 위해 거부 위치를 보고합니다.
- 짝 없는 서로게이트가 다시 `UnexpectedValueException`을 발생시킵니다. 네임스페이스 안에서 수식하지 않은 이름이 존재하지 않는 `OrderedJson\UnexpectedValueException`으로 해석되어, `stringValue()`와 UTF-8 변환이 클래스를 찾을 수 없다는 오류를 냈습니다.
- 조회 오류, UTF-16 단위, 멤버 조회, 팩토리 인자, 파싱 오류 위치, 낮은 PCRE 한도에서의 UTF-8 검증을 다루는 패키지 테스트를 추가하고 구현 등록 정보에 선언했습니다. 공통 사례는 어댑터를 통해서만 이 패키지에 닿아 그 표면을 다루지 않습니다.
- 객체 하이드레이션이 키 토큰용 값을 따로 만들지 않습니다. 직렬화는 디스크립터에서 읽은 키 토큰과 멤버를 짝짓습니다.
- PHP 컨테이너 직렬화를 `compact()`에서 private 메서드로 옮겨, 확장으로 직렬화할 때 호출 프레임이 작아졌습니다. 확장 직렬화 시간은 현재 조회 함수 변경 전의 0.92~0.95였습니다.
- 확장이 로드되어 있으면 자식 값을 `ordered_json_hydrate()`로 만듭니다.
- 조회 함수에서 디스크립터 테이프를 직접 읽고, 자식 값을 생성자 승격 없이 만들며, escape 문자열을 중간 UTF-16 단위 배열 없이 UTF-8로 해석하여 값 조회 비용을 줄였습니다.
- `useNative` 파싱 옵션, `parseNative()`, 사용하지 않는 `stringify()` compact 인자를 제거했습니다. `parse()`는 확장이 로드돼 있으면 확장을 사용합니다.
- PCRE backtrack 또는 recursion 한계가 매우 낮으면 올바른 입력을 거부하던 UTF-8 검증을 수정하고, 오프셋을 지역 변수로 전달하여 파서 부담을 줄였습니다.
- 내부 디스크립터를 확장과 공유하는 정수 테이프로 변경했습니다. 파서는 공백, 숫자, 문자열 구간을 바이트 범위 함수로 검사하고, 문자열 단위는 조회할 때 해석하며, 무의미한 공백과 중복 키가 없는 값은 원문 토큰을 복사하여 직렬화합니다. 결과, 오류, 오프셋은 바뀌지 않았습니다.
- 패키지 자체의 개발 절차, 변경 기록, Makefile, 문서 목록을 추가했습니다.
- 영어와 한국어 사용 방법, 개발 절차, 변경 기록을 추가했습니다.
- 네이티브 확장을 `php-extension` 패키지로 분리했으며 PHP 라이브러리는 독립적으로 사용할 수 있습니다.

공통 JSON 동작은 유지합니다. `make check`로 검증 기록을 생성하며 통합 근거는 저장소 루트의 [검증 기록](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.ko.md#records)에서 설명합니다. 여기서는 레지스트리 게시를 선언하지 않습니다.

### php-ext (packages/php-ext)

- PIE 패키지는 `polyspec/ordered-json-extension`, 오류 클래스는 `Polyspec\OrderedJson\NativeParseError`입니다. 이전에는 `ordered-json/ordered-json-extension`과 전역 클래스 `OrderedJsonNativeParseError`였습니다. hydration은 `Polyspec\OrderedJson\Value`를 만듭니다.
- 패키지 테스트 실행기는 케이스를 실행하기 전에 케이스 id를, 실행한 뒤 `ok` 또는 `FAIL`과 경과 밀리초를 출력하므로, 검증기가 끝나지 않는 케이스의 이름을 보고할 수 있습니다. `--cases` 목록은 그 줄 없이 검사를 실행하고 케이스 id만 출력합니다.
- `OrderedJsonNativeParseError`가 공통 거부 목록의 `kind`를 전합니다.
- 패키지는 공통 커버리지 검사를 위해 함수, 상수, 오류 클래스를 보고합니다.
- 이스케이프하지 않은 제어 문자를 한 칸 뒤가 아니라 그 문자의 위치로 보고합니다.
- 디스크립터 API의 패키지 테스트를 추가하고 구현 등록 정보에 선언했습니다. 하이드레이션한 멤버와 항목, 반복·escape 멤버 이름, `ValueError`로 거부하는 잘못된 디스크립터, compact 토큰 복사, 지원하는 깊이 범위, 보고하는 파싱 오류 위치를 다룹니다. 공통 사례는 PHP Value API를 통해서만 확장에 닿으므로, 이 표면은 이 테스트로만 검증합니다.
- `ordered_json_hydrate()`는 객체의 멤버만 반환하며 키 토큰용 값을 만들지 않습니다.
- 디스크립터로 컨테이너의 자식 `OrderedJson\Value` 객체를 만들고 소스와 맞지 않는 디스크립터를 `ValueError`로 거부하는 `ordered_json_hydrate()`를 추가했습니다. 하이드레이션은 별도 파일 `hydrate.c`로 컴파일하며, 클래스 조회는 요청마다 한 번 캐시합니다.
- `ordered_json_compact()`를 제거했습니다. PHP 라이브러리는 `ordered_json_compact_node()`로 직렬화합니다.
- 연관배열 디스크립터를 정수 테이프로 교체하고, 별도 선검증 대신 문자열을 검사하면서 UTF-8을 검증하되 잘못된 UTF-8을 다른 오류보다 먼저 보고하며, compact 하위 트리를 한 번의 복사로 직렬화합니다. `ordered_json_compact_node`는 디스크립터 인덱스를 받고 소스와 맞지 않는 디스크립터를 `ValueError`로 거부합니다. 형식은 [API 계약](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.ko.md#php)에 설명합니다. 파싱 결과, 오류, 오프셋은 바뀌지 않았습니다.
- macOS 번들 설정에서 누락된 배포 대상을 컴파일러로부터 구하고 사용하지 않는 동적 라이브러리 단일 모듈 플래그 검사를 제외합니다. 오래된 `-single_module` 및 `-undefined suppress` 링커 경고를 해결했습니다.
- 패키지 자체의 개발 절차, 변경 기록, Makefile, 문서 목록을 추가했습니다.
- 영어와 한국어 사용 방법, 개발 절차, 변경 기록을 추가했습니다.
- PIE `php-ext` 메타데이터, `src` 빌드 경로, 기본 활성화된 단독 빌드를 추가했습니다.

공통 JSON 동작은 유지합니다. `make check`로 검증 기록을 생성하며 통합 근거는 저장소 루트의 [검증 기록](https://github.com/polyspec/ordered-json/blob/main/docs/operations/validation.ko.md#records)에서 설명합니다. 여기서는 레지스트리 게시를 선언하지 않습니다.
