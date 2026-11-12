<!-- doc-id: json-contract -->
<!-- source-sha256: f2c384b031cfc2021bbad99668d0fbd9609886dc164dbb87cd04026e9a68cf45 -->
# JSON 계약

[English](json-contract.md)

이 명세는 현재 JSON 동작을 정의합니다. 구현 및 게시 상태는 [기능 상태](../features.ko.md)에 기록합니다. 실행 가능한 인수 사례는 [official.json](../../examples/official.json)에서 관리합니다. Rust 코어와 그것에서 생성한 바인딩의 규칙은 [Rust 코어](#core)에 있고, 그 사례는 [core.json](../../contracts/core.json)입니다.

<a id="objects"></a>
## 객체

객체는 해석된 문자열 키마다 값 하나를 저장하는 연관배열입니다. 순회 순서는 입력 문서에서 키가 처음 등장한 순서입니다. 같은 키가 다시 등장하면 키의 위치를 변경하지 않고 값을 교체합니다. 루트 객체, 자식 객체, 배열 안의 객체에 같은 규칙을 적용합니다.

`document-order` 사례는 `10, 2` 순서를 유지합니다. `duplicate-keys` 사례는 `{"b":1,"a":2,"b":3}`을 파싱하고 `{"b":3,"a":2}`를 출력합니다. 키의 동일성은 해석된 UTF-16 코드 단위로 판정합니다. `"b"`와 `"\u0062"`는 같은 키입니다. 객체 값을 교체하면 해당 값 전체가 교체됩니다.

JSON 형식 자체는 객체 멤버 순서에 의미를 지정하지 않으며 중복 키 처리 방식을 하나로 규정하지 않습니다. 위 순서와 교체 규칙은 라이브러리가 보장하는 동작입니다.

<a id="arrays"></a>
## 배열

JSON 배열은 입력 순서대로 값을 저장합니다. 빈 배열과 빈 객체를 포함하여 배열과 객체를 구분합니다. 배열 원소에도 같은 객체 규칙을 재귀적으로 적용합니다.

<a id="parsing"></a>
## 파싱

거부는 [공통 목록](#rejection-kinds)에서 고른 종류를 함께 알립니다. 문구는 바인딩마다 그 언어의 관습을 따르되 이유는 모든 구현에서 같습니다. 거부는 문서를 무효로 만든 첫 바이트의 위치를 보고합니다. 이스케이프하지 않은 제어 문자 자신, 문법이 요구하는 16진수나 이스케이프가 아닌 첫 바이트, 또는 잘못된 UTF-8의 첫 바이트입니다. 모든 구현은 같은 입력을 같은 위치에서 거부하며, 공통 검사가 그 위치를 비교합니다.

파서는 루트의 JSON 객체, 배열, 문자열, 숫자, 불리언, null을 허용합니다. 바이트 입력은 UTF-8이어야 합니다. 주석, 후행 쉼표, 잘못된 숫자 문법, 잘못된 이스케이프, 이스케이프하지 않은 제어 문자, 잘못된 UTF-8, 바이트 순서 표시, 후행 입력을 거부합니다.

컨테이너 중첩 한도는 256입니다. 호출자는 한도를 0부터 256까지의 정수로 낮출 수 있습니다. 한도 0은 스칼라 루트를 허용하고 컨테이너를 거부합니다. 파서는 나중에 중복 키로 교체되는 값도 포함하여 모든 입력을 검사합니다.

문자열이 단독 UTF-16 surrogate를 담을 수 있는 JavaScript와 Python의 텍스트 입력은 문법을 읽기 전에 이스케이프하지 않은 단독 surrogate를 그 위치에서 `unescaped_lone_surrogate`로 거부합니다. 그런 텍스트에는 UTF-8 인코딩이 없기 때문이며, 바이트 입력을 먼저 UTF-8로 검사하는 것과 같습니다. 이스케이프된 단독 surrogate는 아래 규칙으로 허용합니다. [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)는 JSON 문법을 정의하며 구현별 한도를 허용합니다.

<a id="rejection-kinds"></a>
### 거부 종류

거부 종류의 공통 목록입니다. 모든 구현은 공통 문법의 거부마다 이 중 하나를 알리고, 공통 검증기(`scripts/verify.mts`)는 이 절에서 목록을 읽어 목록 밖의 종류에서 실패합니다.

- `expected_value`
- `expected_digit`
- `expected_colon`
- `expected_delimiter`
- `expected_object_key`
- `invalid_escape`
- `invalid_unicode_escape`
- `unfinished_escape`
- `unterminated_string`
- `unescaped_control_character`
- `unescaped_lone_surrogate`
- `invalid_utf8`
- `maximum_depth_exceeded`
- `trailing_input`

`unescaped_lone_surrogate`는 [이행 기간](#transition)의 언어 패키지에서만 생깁니다. 코어는 바이트를 읽고, 바인딩은 짝 없는 surrogate가 든 언어 텍스트를 코어가 실행되기 전에 거부합니다([RQ-026](#requirements)).

<a id="argument-kinds"></a>
### 인자 종류

인자 종류의 공통 목록입니다. 인자를 거부하는 라이브러리 함수는 이 중 하나를 모든 구현에서 같게 알립니다. 각 바인딩은 그 경우에 맞는 host의 오류 class를 던지고, 자기 문구를 유지하며, 거부 종류의 접근자로 종류를 노출합니다. UTF-8이 아닌 인자의 거부는 거부 종류의 `invalid_utf8`을 알립니다. 공통 검증기는 이 목록을 읽고 [arguments.json](../../contracts/fixtures/arguments.json)의 인자 사례를 모든 구현에 보내며 다른 종류에서 실패합니다. 어떤 언어에서 생길 수 없는 종류는 그 언어와 함께 적습니다.

- `non_string_key` — 문자열이 아닌 객체 키. 배열 키가 문자열이나 정수인 PHP에서는 생길 수 없습니다.
- `wrong_kind` — 다른 종류의 값을 거부하는 접근자.
- `invalid_number_literal` — 다른 JSON 값이거나 공백을 가진 literal을 받은 숫자 생성자. 파싱되지 않는 literal은 그 거부 종류를 알립니다.
- `depth_limit_out_of_range` — 0부터 256까지의 정수가 아닌 깊이 한도.
- `invalid_argument_type` — 함수가 받지 않는 타입의 인자. 라이브러리가 만들지 않은 값(Go의 nil 또는 영값 `Value`)을 포함합니다. compiler가 타입을 검사하는 Rust에서는 생길 수 없습니다. PHP에서는 선언된 매개변수 타입이 라이브러리 실행 전에 host 타입을 거부하므로, 배열 원소처럼 signature가 타입을 선언할 수 없는 곳에서만 생깁니다.
- `invalid_code_unit` — 0부터 65535까지의 정수가 아닌 UTF-16 code unit. code unit이 `u16`과 `uint16`인 Rust와 Go, code unit을 문자열로만 받는 JavaScript에서는 생길 수 없습니다.
- `host_serialization_refused` — 값을 다시 쓰게 될 언어의 표준 JSON 인터페이스([RQ-020](#requirements)). serde 인터페이스가 계약 바이트를 쓰는 Rust와, `MarshalJSON`이 그 바이트를 쓰는 [이행 기간](#transition)의 Go 패키지에서는 생길 수 없습니다.
- `direct_construction` — 라이브러리 밖에서 호출한 라이브러리 생성자: JavaScript와 Python의 `Value` 생성자, 이 목록 밖의 메시지나 종류를 받은 오류 생성자. 값과 오류의 필드를 비공개로 두는 Rust와 Go에서는 생길 수 없습니다.
- `unpaired_surrogate` — 이스케이프한 짝 없는 surrogate가 든 문자열의 유니코드 텍스트. 어떤 유니코드 텍스트도 그것을 담지 못합니다([RQ-027](#requirements)). 코어와 그 바인딩에서 생깁니다.
- `non_finite_number` — NaN, 양의 무한대, 음의 무한대인 실수로 만든 숫자. 어떤 JSON 숫자 토큰도 그것을 쓰지 못합니다([RQ-030](#requirements)). 코어와 그 바인딩에서 생깁니다.
- `internal` — 코어의 불변식 위반. 결함이며 거부된 입력이 아닙니다([RQ-033](#requirements)).

<a id="numbers"></a>
## 숫자

숫자는 JSON 토큰 문자열을 유지합니다. 라이브러리는 파싱이나 직렬화 중 숫자를 부동소수점으로 변환하지 않습니다. 따라서 큰 정수, `-0`, 소수 정밀도, 지수 표기가 유지됩니다. 숫자 생성자는 앞뒤 공백이 없는 유효한 JSON 숫자 토큰을 요구합니다. `NaN`과 `Infinity`는 거부합니다. binary64 실수로 만든 숫자는 ECMAScript `Number::toString`이 쓰는 대로 씁니다([RQ-030](#requirements)).

<a id="strings"></a>
## 문자열

문자열은 해석된 UTF-16 코드 단위와 파싱된 토큰 문자열을 유지합니다. 이스케이프된 단독 surrogate는 코드 단위 API로 조회할 수 있습니다. 단독 surrogate가 든 문자열의 유니코드 텍스트는 `unpaired_surrogate`로 거부합니다([RQ-027](#requirements)). [이행 기간](#transition)의 언어 패키지에서는 Go와 PHP가 거부하고, Rust는 그 WTF-8 바이트를 돌려주었으며, JavaScript와 Python은 해당 문자열을 반환합니다.

PHP는 일반 객체 키를 UTF-8 배열 키로 저장합니다. 키에 포함된 이스케이프된 단독 surrogate는 내부에서 WTF-8을 사용하며 직렬화할 때 이스케이프합니다. 숫자 PHP 배열 키는 JSON 문자열 키로 출력합니다.

<a id="serialization"></a>
## 직렬화

기본 직렬화와 compact 직렬화는 연관배열과 배열을 순회하여 의미 없는 공백이 없는 JSON을 반환합니다. 각 객체 키를 처음 등장한 위치에서 한 번만 출력하며 마지막 값을 사용합니다. 파싱된 스칼라 토큰과 유지되는 각 키의 첫 토큰 표기를 보존합니다.

모든 허용된 값에서 직렬화는 멱등적입니다. 직렬화 결과를 다시 파싱하고 직렬화하면 같은 출력, 타입 트리, 키 순서, 스칼라 토큰 값이 나옵니다. 빈 객체는 파싱, 생성, 직렬화, 반복 round-trip 동안 객체로 유지하며 빈 배열은 배열로 유지합니다. 핵심 구현은 이 동작에 자체 JSON parser와 serializer를 사용하며 host JSON API에 의존하지 않습니다.

`raw`는 조회용 입력 원문 범위를 반환합니다. 루트 범위에는 앞뒤 공백이 포함됩니다. 교체된 키가 포함될 수 있으므로 연관배열의 직렬화 결과와 다를 수 있습니다.

JavaScript의 `compact` 옵션과 PHP의 `compact` 인자는 호환성을 위해 허용하며 어느 값이든 같은 compact 출력을 선택합니다. JavaScript의 `JSON.stringify(Value)`와 PHP의 `json_encode(Value)`는 실패하고 라이브러리 직렬화를 사용하도록 안내합니다. Go는 `MarshalJSON`을 구현하며 표준 인코더가 HTML 이스케이프나 공백을 변경할 수 있습니다.

<a id="construction"></a>
## 생성

생성자는 라이브러리의 `Value` 인스턴스를 받습니다. 객체 생성자는 순서가 있는 연관배열이나 항목을 사용하고 배열 생성자는 값의 순서를 사용합니다. 객체 키는 문자열이어야 합니다. 생성자는 파싱과 같은 중복 키, 문법, 깊이 규칙을 적용합니다.

라이브러리는 언어의 컬렉션이 제공하는 순서를 사용합니다. 해당 컬렉션이 이미 변경한 이전 순서는 복구하지 않습니다. 임의의 네이티브 객체 그래프를 일괄 변환하는 기능은 제공하지 않습니다.

<a id="acceptance"></a>
## 인수 기준

모든 구현은 [공통 검증기](../../scripts/verify.mts)를 통해 같은 공식 입력과 고정된 기대 결과를 받습니다. 검증은 입력 허용 여부, 노드 종류와 값, 키와 배열 순서, 원문 조회, 기본 및 compact 직렬화, 생성자를 통한 재구성을 비교합니다.

재구성 검사는 키를 최초 순서대로 등록하고 역순으로 값을 갱신한 다음 결과를 직렬화하고 독립 파서로 검사합니다. 생성된 객체의 해석된 키는 고유해야 합니다. 숫자 토큰 문자열은 정확히 유지해야 하며 생성된 문자열 키의 이스케이프 표기는 달라도 됩니다.

공식 예제는 기대 동작을 정의합니다. 추가 사례는 검사 범위를 확대합니다. 성공한 실행 결과는 기록된 파일과 런타임에 적용되며, 가능한 모든 입력이나 지원 런타임 전체의 정확성을 증명하지 않습니다.

<a id="requirements"></a>
## 요구사항

각 요구사항은 이 계약의 검사 가능한 한 진술입니다.

- **RQ-001** 객체는 디코딩된 각 키의 최초 출현 위치를 유지하고, 그 키에 마지막으로 쓰인 값을 가집니다.
- **RQ-002** 객체 키는 디코딩된 UTF-16 code unit으로 비교하므로, 이스케이프한 표기와 그대로의 표기는 같은 member를 가리킵니다.
- **RQ-003** 배열은 입력 순서를 유지하며, 빈 것을 포함해 배열과 객체는 서로 구별됩니다.
- **RQ-004** 거부는 문서를 무효로 만든 첫 바이트의 위치를 보고합니다.
- **RQ-005** 거부는 공유 거부 종류 목록의 한 종류를 이름으로 가집니다.
- **RQ-006** 중첩 한도는 기본 256이며, 호출자는 0부터 256까지의 정수로 낮출 수 있습니다. 한도 0은 스칼라 루트를 받고 컨테이너를 거부합니다.
- **RQ-007** 바이트 입력은 UTF-8이어야 합니다. 잘못된 UTF-8은 거부하고, 올바른 다바이트 텍스트는 전부 받아들입니다.
- **RQ-008** 텍스트 입력은 문법을 읽기 전에 그대로 적힌 unpaired surrogate를 거부합니다.
- **RQ-009** 이스케이프한 unpaired surrogate는 그 code unit 그대로 보존되며, member나 문자열은 그 code unit으로 식별됩니다.
- **RQ-010** 숫자 token은 적힌 그대로 보존되며, NaN과 Infinity는 거부합니다.
- **RQ-011** 직렬화는 각 객체 키를 한 번만 내보내며, 그 출력을 다시 파싱하면 같은 출력이 나옵니다.
- **RQ-012** 값은 라이브러리에서만 만들어집니다. 호출자는 파서나 생성자를 거치지 않은 값을 만들 수 없습니다.
- **RQ-013** 호출자에게 돌려준 컬렉션은 변경할 수 없습니다.
- **RQ-014** 종류의 접근자는 그 종류의 값을 돌려주며, 다른 종류에 대한 접근은 잘못된 종류의 접근으로 보고됩니다.
- **RQ-015** 생성자는 인자를 검증하고, 파싱의 문법, 깊이와 중복 키 규칙을 적용합니다.
- **RQ-016** 객체 키는 문자열이며, 순서 있는 map은 문자열이 아닌 키를 거부합니다.
- **RQ-017** 엄격한 파싱은 중복 키를 거부하고, 중복이 없는 문서는 받아들입니다.
- **RQ-018** 값의 원문 span은 원래 텍스트이며, 루트의 앞뒤 공백과 덮어쓰인 키를 포함합니다.
- **RQ-019** member 조회는 디코딩된 이름으로 member를 찾습니다.
- **RQ-020** 값은 언어의 표준 JSON 직렬화 인터페이스와 통합됩니다: 그 인터페이스가 라이브러리처럼 값을 쓰면(Rust serde) 값을 native 구조가 포함하는 경우에도 contract bytes를 쓰고, 값의 순서를 바꾸거나 다시 쓰게 되면(JavaScript `JSON.stringify`, PHP `json_encode`, Python `json`, 그리고 `MarshalJSON`이 돌려준 텍스트의 `<`, `>`, `&`를 다시 쓰는 Go `encoding/json`) `host_serialization_refused`로 거부하고 호출자를 라이브러리 직렬화기로 안내합니다. 어떤 인터페이스도 다른 문서를 쓰지 않습니다. [이행 기간](#transition)의 Go 패키지는 아직 `MarshalJSON`으로 씁니다.
- **RQ-022** 모든 구현은 공식 예제에 기대 결과를 냅니다.
- **RQ-023** 공개 API는 파싱, 직렬화, 생성과 접근자 함수를 내보냅니다.
- **RQ-024** 파싱 오류는 종류, 위치와 메시지를 노출합니다.
- **RQ-025** 거부된 인자는 공유 인자 종류 목록의 한 종류를 그 host의 오류 class로 알립니다.
- **RQ-026** 코어는 UTF-8 바이트를 파싱하고 모든 위치는 바이트로 셉니다. 바인딩은 언어 텍스트의 UTF-8 인코딩을 코어에 넘깁니다. 짝 없는 surrogate가 든 언어 텍스트에는 그 인코딩이 없으므로 바인딩이 코어를 실행하기 전에 `invalid_text`로 거부합니다([RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) 8.1절: 시스템 사이에 주고받는 JSON 텍스트는 UTF-8입니다).
- **RQ-027** `string_value`는 문자열의 유니코드 텍스트를 돌려주고, 문자열에 이스케이프한 짝 없는 surrogate가 있으면 `unpaired_surrogate`로 실패합니다. `string_units`는 모든 문자열의 UTF-16 코드 단위를 돌려주며 짝 없는 surrogate도 담습니다.
- **RQ-028** 문자열 생성자는 텍스트를 UTF-8로 쓰고 [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) 7절이 요구하는 것만 이스케이프합니다: `"`와 `\`는 `\"`와 `\\`, U+0008, U+0009, U+000A, U+000C, U+000D는 `\b`, `\t`, `\n`, `\f`, `\r`, 그 밖의 U+0000~U+001F는 `\u00`과 소문자 16진수 두 자리. 코드 단위 생성자는 같게 쓰고 짝 없는 surrogate를 `\u`와 소문자 16진수 네 자리로 씁니다. U+2028과 U+2029를 포함한 그 밖의 모든 문자는 그대로 쓰며, ECMAScript `JSON.stringify`가 쓰는 것과 같습니다(ECMA-262 QuoteJSONString).
- **RQ-029** 코드 단위 생성자와 코드 단위 조회는 0부터 65535까지의 정수를 받고 그 밖의 값은 `invalid_code_unit`으로 거부합니다.
- **RQ-030** binary64 실수의 숫자 생성자는 ECMAScript `Number::toString`(ECMA-262, 기수 10)이 쓰는 토큰을 씁니다: 같은 실수로 읽히는 가장 짧은 숫자열, `-0`은 `0`, 지수 -7부터 20까지는 자리 표기, 그 밖은 `e+`/`e-` 표기. NaN, 양의 무한대, 음의 무한대는 `non_finite_number`로 거부합니다. `number_text`는 같은 텍스트를 돌려주며, 다른 polyspec 라이브러리가 쓰는 유일한 실수→텍스트 함수입니다.
- **RQ-031** 직렬화 옵션 `html_safe`(기본값 false)는 키를 포함한 모든 문자열 토큰의 `<`, `>`, `&`, U+2028, U+2029를 `<`, `>`, `&`, ` `, ` `로 써서 텍스트가 HTML `script` 요소 안에 있을 수 있게 합니다. 출력의 다른 부분은 바뀌지 않습니다. 이 문자들은 JSON 텍스트에서 문자열 안에만 있으므로 옵션은 문자열 토큰만 바꿉니다.
- **RQ-032** 종류별 접근자(`members`, `items`, `string_units`, `string_value`, `number_literal`, `boolean_value`)와 member 조회(`get`, `get_units`)는 다른 종류의 값에서 `wrong_kind`로 실패합니다. 객체의 조회는 객체에 없는 이름에서만 부재를 돌려줍니다.
- **RQ-033** 코어의 모든 실패는 공통 목록의 종류를 가진 오류입니다. 파싱 거부는 바이트 위치를 가지며, 생성자의 `maximum_depth_exceeded`와 인자 오류는 위치를 갖지 않습니다. 그 실패를 일으킨 입력 위치가 없기 때문입니다. 코어의 불변식 위반은 `internal`입니다.
- **RQ-034** 바인딩의 표준 JSON 직렬화 hook(JavaScript `toJSON`, PHP `jsonSerialize`, Go `MarshalJSON`)은 `host_serialization_refused`로 실패합니다([RQ-020](#requirements)). Python에는 그런 hook이 없습니다. 라이브러리 직렬화기는 함수 `stringify` 하나이며, 각 언어의 문자열 hook(`toString`, `__toString`, `__str__`)은 기본 옵션으로 같은 텍스트를 씁니다.
- **RQ-035** 파싱 옵션은 0부터 256까지의 정수인 `max_depth`([RQ-006](#requirements))와 기본값 false인 `reject_duplicates`([RQ-017](#requirements))이고, 직렬화 옵션은 `html_safe`([RQ-031](#requirements))입니다.

<a id="ignored-input"></a>
## 무시하는 입력

파서가 읽지만 값에 영향이 없는 모든 입력입니다. 그것을 건너뛰는 코드는 행 id를 적습니다.

| Id | 무시하는 입력 | 옳은 근거 | 사례 |
| --- | --- | --- | --- |
| IG-1 | 토큰 앞뒤의 공백(U+0020, U+0009, U+000A, U+000D) | [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) 2절: 구조 문자 앞뒤의 의미 없는 공백을 허용합니다 | official.json의 `whitespace`. 루트의 `raw`는 공백을 유지합니다([RQ-018](#requirements)) |
| IG-2 | 같은 해석된 이름의 뒤 member가 교체하는 객체 member의 값 | [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) 4절: 이름은 고유해야 하며(should) 고유하지 않은 문서의 동작은 구현에 맡깁니다. [RQ-001](#requirements)은 마지막 값을 유지하고, `reject_duplicates`는 대신 문서를 거부하며([RQ-017](#requirements)), `raw`는 교체된 member를 유지합니다([RQ-018](#requirements)) | official.json의 `duplicate-keys` |

<a id="core"></a>
## Rust 코어

`packages/rust`의 crate `polyspec-ordered-json`이 이 계약의 모든 규칙을 한 번 가집니다. PHP, Python, Node.js, Go, 브라우저의 바인딩은 crate 패키지가 담는 인터페이스 계약 `packages/rust/interface.json`에서 bindgen이 생성하며 자기 규칙을 갖지 않습니다. [core.json](../../contracts/core.json)은 RQ-026부터 RQ-035까지의 사례를 담고 각 실패를 종류와 category를 가진 `raises`로 적으며, crate는 `tests/contract.rs`에서 그것을 실행합니다.

<a id="transition"></a>
### 이행 기간

언어 패키지 `packages/js`, `packages/go`, `packages/php`, `packages/php-ext`, `packages/python`은 생성된 바인딩이 공통 suite와 그 패키지 시험을 통과하고 각 패키지를 그 패키지만의 변경으로 없앨 때까지 지금의 API와 자기 구현을 유지합니다. 그때까지 이 레포는 언어마다 구현 둘을 가지며, 이는 그 제거로 끝나는 PRINCIPLES S6의 예외입니다. 이 패키지들만 따르는 규칙은 해당하는 곳에 적고, 그 API와 인터페이스 계약의 모든 차이는 `packages/rust/interface.json`의 `changes` 항목과 그 규칙입니다.
