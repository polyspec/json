<!-- doc-id: rust-overview -->
<!-- source-sha256: 18d02aa11d8a5b6cd9066b519eea4eb892a53ad79cb90594e87a5169e14227aa -->
# ordered-json for Rust

[English](README.md)

객체를 연관배열로 처리하고 모든 깊이에서 문서 키 순서를 유지하는 엄격한 JSON 구현입니다. 중복 키는 최초 위치와 마지막 값을 유지합니다. 공식 입력과 기대 결과는 모노레포의 examples에서 관리합니다.

<a id="usage"></a>
## 사용

Rust >= 1.71이며 Cargo 패키지는 `polyspec-ordered-json`, 가져오기는 `polyspec_ordered_json`입니다.

사용 코드의 `source` 또는 `$source`는 [공통 공식 예제](https://github.com/polyspec/ordered-json/blob/main/examples/official.json)의 객체 사례에서 가져옵니다. 오류를 반환할 수 있는 함수 안에서 사용합니다. 모든 오류는 `Error`이며, 그 `kind()`는 [API 계약](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.ko.md#bindings)이 정한 이름의 exhaustive enum `ErrorKind`입니다.

~~~rust
use polyspec_ordered_json::{parse, stringify};
let value = parse(source)?;
let output = stringify(&value);
~~~

`Value`는 Serde `Serialize`와 `Deserialize`를 구현합니다: `Serialize`는 값의 compact bytes를 쓰고
`Deserialize`는 field의 raw JSON text를 라이브러리 parser로 파싱하므로, `serde_json`은 `Value` field를 가진 native
구조를 객체 순서와 숫자 토큰을 유지한 채 encode하고 decode합니다. crate에는 자체 typed encoder가 없으며, 구조의 나머지는
`serde_json`의 규칙을 따릅니다.


동작은 [JSON 계약](https://github.com/polyspec/ordered-json/blob/main/docs/spec/json-contract.ko.md)과 [API 계약](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.ko.md)에 정의합니다. 소스는 이 저장소에서 제공합니다. Cargo 패키지는 레지스트리 게시가 설정되지 않았습니다. 레지스트리 게시와 버전 릴리스는 검증되지 않았으며 소스 버전 문자열은 릴리스 기록이 아닙니다.

<a id="verification"></a>
## 검증

Git, make, bootstrap을 시작할 Node.js, 해당 구현의 런타임·빌드 도구를 설치하고, `mise.toml`의 Node.js, Python, Go와 다른 도구를 `mise.lock`의 digest로 `var/tools`에 설치하는 `make install-tools TOOLS=npm`, `make install-packages`, `make install`을 실행한 뒤 이 체크아웃에서 실행합니다.

~~~sh
make check
~~~

루트 검증기를 호출하여 이 패키지를 검사합니다. 루트 통합 검사는 같은 소스 리비전의 모든 패키지를 검사하고 현재 결과를 그 실행의 기록인 `var/records/verification.json`에 기록합니다.

추가 사례는 `make check JSON_TEST_SUITE=/path/to/JSONTestSuite`로 검사합니다. [개발 절차](../../AGENTS.ko.md#package-rust)와 [변경 기록](../../CHANGELOG.ko.md)에 필수 검사와 변경 사항이 있습니다.
