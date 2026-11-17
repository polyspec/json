<!-- doc-id: features -->
<!-- source-sha256: 599197ed2c297eafd57322926b000631a65e06e44e087124cd9ce0aa0791f7b7 -->
# 기능 상태

[English](features.md)

<a id="state"></a>
## 현재 구현

| ID | 기능 | 구현 | 검증 | 근거 | 배포 | 명세 |
| --- | --- | --- | --- | --- | --- | --- |
| F-ORDER | 재귀 연관배열 객체; 최초 키 위치와 마지막 값 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [객체](spec/json-contract.ko.md#objects) |
| F-ARRAY | 배열 순서와 객체·배열 구분 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [배열](spec/json-contract.ko.md#arrays) |
| F-PARSE | JSON 문법, UTF-8 검사, 기본 중첩 제한 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [파싱](spec/json-contract.ko.md#parsing) |
| F-NUMBER | 정확한 숫자 토큰 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [숫자](spec/json-contract.ko.md#numbers) |
| F-STRING | 디코딩한 문자열과 이스케이프 surrogate 코드 단위 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [문자열](spec/json-contract.ko.md#strings) |
| F-OUTPUT | 연관배열 직렬화와 원문 조회 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [직렬화](spec/json-contract.ko.md#serialization) |
| F-IDEMPOTENT | 반복 파싱과 직렬화에서 같은 타입 트리와 출력을 유지 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [직렬화](spec/json-contract.ko.md#serialization) |
| F-CONSTRUCT | 순서 있는 연관배열과 Value 객체 배열로 생성 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [생성](spec/json-contract.ko.md#construction) |
| F-RUST-SERDE | Rust Value의 native Serde 직렬화·역직렬화 | implemented | package-tests | [결과](operations/validation.ko.md#records) | source-only | [바인딩](operations/api.ko.md#bindings) |
| F-STRICT-KEYS | 모든 구현에서 해석된 객체 키의 반복을 거부하는 파싱 | implemented | package-tests | [결과](operations/validation.ko.md#records) | source-only | [바인딩](operations/api.ko.md#bindings) |
| F-PHP-NATIVE | 공통 PHP API와 ParseError 메시지 검증을 제공하는 PHP 확장 파서와 직렬화 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [PHP](operations/api.ko.md#php) |
| F-DOCS | 영한 문서, 링크·상태 검사, 검증 최신 여부 | implemented | docs-tests | [결과](operations/validation.ko.md#records) | source-only | [절차](operations/documentation-plan.ko.md#checks) |
| F-REPOS | 독립적으로 빌드할 수 있는 구현 패키지와 공통 적합성을 갖춘 단일 저장소 | implemented | shared-suite | [결과](operations/validation.ko.md#records) | source-only | [저장소](operations/repositories.ko.md) |
| F-BINDINGS | binding이 Rust 코어에서 생성하는 PHP, Python, Node, Go, WASM 바인딩. binding은 모든 target을 생성하고, CI의 job bindings가 contracts/core.json의 case를 담은 각 target의 생성 시험을 그 언어의 표준 runner에서 실행한다(make test-binding-<target>) | partial | not-verified | [T3.2](plans/execution/checklist.ko.md) | source-only | [코어](spec/json-contract.ko.md#core) |
| F-BENCHMARK | 저장소 내부의 재현 가능한 벤치마크 프로토콜과 커밋된 결과 | implemented | not-verified | [재측정 조건](plans/kit-standard/plan.ko.md#prerelease-reconsideration) | source-only | [벤치마크](../benchmarks/README.ko.md) |

<a id="limits"></a>
## 검증 및 배포 한계

T3.24-1은 독립 native PHP asset matrix와 source assertion을 추적한다([native asset job](spec/json-contract.ko.md#native-assets)). Expected-minor provider gate가 공개되고 recipe를 다시 생성하며 native job이 통과하기 전까지 native minor 선택과 전체 asset job의 증거는 없다.

이전 네이티브 macOS 및 PIE 기록은 현재 근거가 아닙니다. 바인딩의 PIE 패키지는 공개된 release의 pre-packaged binary를 설치하므로 checkout의 검사는 그것을 빌드하지 않습니다. `make ci-release`가 `release-undraft` 뒤에 실행하는 `make release-pie-check`(T3.25-5)는 공개된 release의 패키지를 PIE로 내려받아(`pie download`, 기계의 PHP에 아무것도 쓰지 않습니다) 그 확장의 version을 확인하고 그 확장으로 공유 verifier의 probe를 실행합니다. 이 검사는 release job의 PHP minor와 platform 하나(Linux x86_64의 PHP 8.4)만 검사하며 release가 공개된 뒤에 실행되므로, 실패는 이미 공개된 release를 보고할 뿐 막지 않습니다.

공통 사례 통과는 기록된 인수 기준에 대한 검증입니다. 모든 입력, 선언한 최소 런타임 전체, 모든 플랫폼, 모든 호스트 인코더 연동을 검증한 결과는 아닙니다. [검증 한계](operations/validation.ko.md#limits)를 확인합니다. 소스 메타데이터에는 개발 버전 문자열이 있습니다. `published`로 표시한 행은 GitHub release의 tag와 asset 이름을 적으며, 그 형식은 `make evidence-check`가 검사합니다.

커밋된 벤치마크 timing은 과거 비교용으로 보존한다. T2.48의 신뢰할 수 있는 유휴 상태 재측정이 완료되기 전에는 현재 검증 증거로 주장하지 않는다.
