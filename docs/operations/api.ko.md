<!-- doc-id: api -->
<!-- source-sha256: b3189419db770aabbe7e542c45dec2be665f1594a5789a905056bb63de544730 -->
# API 계약

[English](api.md)

[JSON 계약](../spec/json-contract.ko.md)은 모든 구현의 공통 동작을 정의합니다. 이 문서는 현재 언어별 API를 정의합니다. 현재 식별자는 [설치 문서](installation.ko.md)에 작성합니다.

프로젝트는 `ordered-json`이고 모든 패키지 이름은 polyspec 관례를 따릅니다. JavaScript는 npm 패키지 `@polyspec/ordered-json`을 사용합니다. Rust는 Cargo 패키지 `polyspec-ordered-json`을 사용하며 `polyspec_ordered_json`으로 가져옵니다. Go는 `github.com/polyspec/ordered-json/packages/go` 모듈과 `orderedjson` 패키지를 사용합니다. PHP는 `polyspec/ordered-json` Composer 패키지, `Polyspec\OrderedJson` 네임스페이스, PIE 패키지 `polyspec/ordered-json-php-ext`의 `polyspec_ordered_json` 확장을 사용하며, 확장은 Composer 패키지의 class, 함수, 상수를 같은 이름으로 등록합니다. Python은 패키지 `polyspec-ordered-json`을 사용하며 `polyspec` 아래 namespace package인 `polyspec.ordered_json`으로 가져옵니다.

<a id="values"></a>
## 값과 파싱

파싱된 `Value` 객체는 라이브러리 API로 변경할 수 없습니다. 생성자는 문자열, 숫자 토큰, 불리언, null, 배열, 객체를 생성합니다. 생성자는 라이브러리 parser를 통해 값을 검사합니다. 종류가 맞지 않는 접근은 접근자에 따라 값 없음 또는 오류를 반환하며 잘못된 생성 인자는 언어별 오류를 발생시킵니다. 핵심 parser와 serializer는 JSON 동작을 host JSON API에 위임하지 않습니다.

| 동작 | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| 텍스트 파싱 | `parse(source, options)` | `parse(source)` | `Parse(source)` | `parse(source, maxDepth)` | `parse(source, options)` |
| UTF-8 바이트 | `parseBytes(bytes, options)` | `parse_bytes(bytes)` | `ParseBytes(bytes)` | `parse(source)` | `parse_bytes(data, options)` |
| 깊이 한도 | `options.maxDepth` | `parse_with_max_depth(source, limit)` | `ParseWithMaxDepth(source, limit)` | `maxDepth` | `options.max_depth` |
| 기본 출력 | `stringify(value)` | `stringify(&value)` | `Stringify(value)` | `stringify($value)` | `stringify(value)` |
| compact 출력 | `stringify(value)` | `value.compact()` | `value.Compact()` | `$value->compact()` | `value.compact()` |
| 원문 조회 | `value.raw` | `value.raw()` | `value.Raw()` | `$value->raw()` | `value.raw` |
| 종류 | `value.kind` | `value.kind()` | `value.Kind()` | `$value->kind()` | `value.kind` |

JavaScript 파싱 오류는 UTF-16 위치를 반환합니다. Rust, Go, PHP, Python 파싱 오류는 UTF-8 바이트 위치를 반환합니다. 잘못된 UTF-8 오류는 모든 바인딩에서 첫 잘못된 바이트의 바이트 위치를 반환합니다. 그 시점에는 해석된 텍스트가 없으므로 JavaScript도 같으며, JavaScript 메시지는 그 단위를 함께 적습니다. Go `Value`의 영값은 유효하지 않습니다. Rust와 Go의 빈 `OrderedMap`은 유효한 객체 입력입니다.

<a id="bindings"></a>
## 바인딩 확장

바인딩은 해당 언어에만 필요한 API를 추가할 수 있습니다. 바인딩 확장은 공유 parser와 serializer를 사용하고, 허용한 입력의 결과와 오류 위치를 바꾸지 않으며, 추가로 거부하는 입력을 문서화합니다. 공유 동작 표가 아니라 이 절에 적습니다. 해당 패키지는 자체 테스트를 그 언어의 native test runner로 실행합니다(`make test-<language>`). 공통 사례가 닿지 못하는 API는 그 테스트로만 검증됩니다.

Rust 바인딩은 `parse_bytes_reject_duplicates(source)`를 제공합니다. 일반 문법과 깊이 한도로 UTF-8 바이트를 파싱하지만 어느 깊이든 해석된 객체 키가 반복되면 거부합니다. 이스케이프 표기가 같은 UTF-16 키를 만드는 경우를 포함하여 두 번째 키 토큰의 첫 바이트 위치에 `duplicate object key` 오류를 반환합니다. `parse_bytes`는 공통 중복 키 동작을 유지합니다. 그 밖의 유효한 값과 오류 및 위치는 바뀌지 않습니다.

Go 바인딩은 `ParseRejectDuplicates(source)`를 제공합니다. 일반 문법과 기본 깊이 한도로 텍스트를 파싱하지만 어느 깊이든 해석된 객체 키가 반복되면 거부합니다. 이스케이프 표기가 같은 UTF-16 키를 만드는 경우를 포함하여 두 번째 키 토큰의 첫 바이트 위치에 `duplicate object key` 오류(kind `duplicate_object_key`)를 반환합니다. `Parse`는 공통 중복 키 동작을 유지합니다. 그 밖의 유효한 값과 오류 및 위치는 바뀌지 않습니다.

JavaScript 바인딩은 `parse(source, options)`와 `parseBytes(bytes, options)`의 options에서 `rejectDuplicates: true`를 받습니다. 이 옵션이 있으면 이스케이프 표기가 같은 UTF-16 키를 만드는 경우를 포함하여 어느 깊이든 해석된 객체 키가 반복될 때 `Duplicate object key at UTF-16 offset N` 메시지와 `duplicate_object_key` `kind`의 `ParseError`로 거부하며, `N`은 두 번째 키 토큰의 UTF-16 위치입니다. `rejectDuplicates`는 boolean이어야 하며 기본값 `false`는 공통 중복 키 동작을 유지합니다. 이 옵션은 `maxDepth`와 함께 쓸 수 있습니다. 그 밖의 유효한 값과 오류 및 위치는 바뀌지 않습니다.

PHP 바인딩은 `Value::parseRejectDuplicates(source)`를 제공합니다. 일반 문법과 기본 깊이 한도로 UTF-8 텍스트를 파싱하지만 어느 깊이든 해석된 객체 키가 반복되면 거부합니다. 이스케이프 표기가 같은 UTF-16 키를 만드는 경우를 포함하여 `Duplicate object key at byte N` 메시지와 `duplicate_object_key` 종류의 `Polyspec\OrderedJson\ParseError`를 발생시키며, `N`은 두 번째 키 토큰의 첫 바이트 위치입니다. 네이티브 scanner는 공통 중복 키 동작을 유지하므로 `polyspec_ordered_json` 확장이 로드되어 있어도 순수 PHP parser로 파싱합니다. 반환한 값은 조회와 직렬화에 로드된 backend를 사용합니다. `Value::parse`는 공통 중복 키 동작을 유지합니다. 그 밖의 유효한 값과 오류 및 위치는 바뀌지 않습니다.

Python 바인딩은 `parse(source, options)`와 `parse_bytes(data, options)`의 `ParseOptions`에서 JavaScript 옵션의 snake case 표기인 `reject_duplicates=True`를 받습니다. 이 옵션이 있으면 이스케이프 표기가 같은 UTF-16 키를 만드는 경우를 포함하여 어느 깊이든 해석된 객체 키가 반복될 때 두 번째 키 토큰의 첫 바이트 위치에서 `duplicate_object_key` 종류의 `ParseError`로 거부합니다. text 입력은 source text의 문자 그대로 된 짝 없는 surrogate도 그 문자의 UTF-8 인코딩이 가질 위치의 바이트 위치에서 `unescaped_lone_surrogate` 종류로 거부합니다. 그 위치에 유효한 UTF-8 인코딩이 없기 때문입니다. `Value.string_value()`는 surrogate pair를 한 문자로, 짝 없는 surrogate를 자기 문자 그대로 돌려주며, 이는 JavaScript 바인딩과 같습니다. 그 밖의 유효한 값과 오류 및 위치는 바뀌지 않습니다. 배포본은 package `polyspec.ordered_json`에 PEP 561의 `py.typed` 표시를 담으므로 type checker가 그 annotation을 읽습니다.

문자열 접근은 surrogate pair를 한 문자로 반환합니다. 이스케이프된 짝 없는 surrogate는 대체되지 않습니다: 문자열 값은 라이브러리의 형태로 이를 유지하며, JavaScript와 Python에서는 host 문자열의 단독 surrogate로, Go, PHP, Rust에서는 WTF-8 바이트로 유지하며, Rust의 `String`이 이를 담을 수 없으므로 Rust의 `string_value()`가 그 바이트(`Vec<u8>`, 짝 없는 surrogate가 없으면 유효한 UTF-8)를 반환합니다. 텍스트 입력의 짝 없는 surrogate 원문은 UTF-8 인코딩이 없으므로 Rust, Go, PHP는 그 WTF-8 바이트를 문법을 읽기 전에 `invalid UTF-8`로 거부하고 JavaScript와 Python은 `unescaped_lone_surrogate`로 거부합니다.

각 언어의 표준 JSON 인터페이스는 JavaScript의 `Value.toJSON`, PHP의 `Value::jsonSerialize`, Python의 `ordered_json.JSONEncoder`, Go의 `Value.MarshalJSON`, Rust의 Serde trait입니다. JavaScript, PHP, Python은 native 구조가 값을 담고 있어도 값을 거부하며 `stringify`를 가리키는 메시지를 냅니다. Python은 호출자가 `json.dumps`의 `cls`로 넘기는 `JSONEncoder.default`로 거부하고, 그것 없이 `json.dumps`는 자체 `TypeError`로 거부합니다. Go와 Rust는 native 구조 안에서도 값의 compact contract bytes를 씁니다.

Python의 공개 adapter class `JSONEncoder`와 `default` callback은 이 host 직렬화 API에 속하며 API 목록에 둘 다 선언합니다.

통합은 생태계의 표준 인터페이스이며 라이브러리의 인코더가 아닙니다: Go `Value`는 `json.Marshaler`(`MarshalJSON`이 값의 compact 텍스트를 씀)와 `json.Unmarshaler`(`UnmarshalJSON`이 라이브러리 parser로 문서를 파싱해 순서, 숫자 token, 짝 없는 surrogate를 유지하고 잘못된 JSON을 거부함)를 구현하고, Rust `Value`는 Serde `Serialize`와 `Deserialize`를 구현하므로 `encoding/json`과 `serde_json`이 값을 담은 모든 native 구조를 contract bytes로 인코딩하고 디코딩합니다. 그 밖의 native 구조는 host 라이브러리가 자체 규칙으로 인코딩합니다.

<a id="objects"></a>
## 연관 객체

| 동작 | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| 멤버 연관배열 | `value.members` | `value.members()` | `value.Members()` | `$value->members()` | `value.members()` |
| 문자열 키 조회 | `value.get(key)` | `value.get(key)` | `value.Get(key)` | `$value->get($key)` | `value.get(key)` |
| 코드 단위 조회 | `value.get(key)` | `value.get_units(units)` | `value.GetUnits(units)` | `$value->getUnits($units)` | `value.get_units(units)` |
| 객체 생성 | `Value.object(entries)` | `Value::object(&map)` | `Object(map)` | `Value::object($map)` | `Value.object(entries)` |

JavaScript는 복사된 `Map<string, Value>`를 반환하며 TypeScript에는 `ReadonlyMap`으로 노출합니다. `value.keys`는 첫 번째로 파싱된 키 토큰을 순서대로 반환합니다. 객체 생성자는 `[string or Value, Value]` 항목의 iterable을 받습니다.

Rust는 불변 `OrderedMap` 참조를 반환합니다. `OrderedMap::insert(key, value)`는 문자열 `Value` 키를 받고 교체된 값이 있으면 반환합니다. `iter()`는 등록 순서대로 키와 값의 참조를 반환합니다.

Go는 독립적인 `OrderedMap` 복사본을 반환합니다. `Set(key, value)`는 문자열 `Value` 키를 받으며 `Keys()`는 등록 순서대로 키 값을 반환합니다. `Get`과 `GetUnits`는 값 포인터 또는 nil을 반환합니다. `ParseBytes`는 입력을 복사합니다.

PHP는 `Value` 객체의 연관배열을 반환합니다. 객체 생성자는 해당 연관배열을 받습니다. PHP 배열의 키는 문자열 또는 정수이므로 다른 종류의 키는 객체에 닿을 수 없으며 정수 키는 그 십진 숫자 문자열이 객체 키가 됩니다. Python은 읽기 전용 mapping 복사본을 반환하며, 객체 생성자는 문자열 또는 문자열 `Value` 키를 가진 mapping이나 쌍의 iterable을 받습니다. 키가 없으면 PHP는 null, JavaScript는 undefined, Rust와 Python은 `None`, Go는 nil을 반환합니다.

<a id="scalars"></a>
## 배열과 스칼라

| 동작 | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| 배열 생성 | `Value.array(items)` | `Value::array(items)` | `Array(items)` | `Value::array($items)` |
| 배열 원소 | `value.items` | `value.items()` | `value.Items()` | `$value->items()` |
| 문자열 생성 | `Value.string(text)` | `Value::string(text)` | `String(text)` | `Value::string($text)` |
| 문자열 조회 | `stringValue()` | `string_value()` | `StringValue()` | `stringValue()` |
| UTF-16 조회 | `stringUnits()` | `string_units()` | `StringUnits()` | `stringUnits()` |
| UTF-16 생성 | `Value.string(text)` | `Value::from_units(units)` | `StringFromUnits(units)` | `Value::fromUnits($units)` |
| 숫자 생성 | `Value.number(token)` | `Value::number(token)` | `Number(token)` | `Value::number($token)` |
| 숫자 조회 | `numberLiteral()` | `number_literal()` | `NumberLiteral()` | `numberLiteral()` |
| 불리언 생성 | `Value.boolean(flag)` | `Value::boolean(flag)` | `Boolean(flag)` | `Value::boolean($flag)` |
| 불리언 조회 | `booleanValue()` | `boolean_value()` | `BooleanValue()` | `booleanValue()` |
| null 생성 | `Value.null()` | `Value::null()` | `Null()` | `Value::null()` |

종류 이름은 모든 구현의 열거형 `Kind`입니다: `Object`, `Array`, `String`, `Number`, `Boolean`, `Null`이며 값은 `object`, `array`, `string`, `number`, `boolean`, `null`입니다. Rust는 enum `Kind`, Go는 `Kind`의 상수 `ObjectKind`부터 `NullKind`, JavaScript는 enum `Kind`, Python은 `StrEnum` `Kind`, PHP는 backed enum `Kind`를 가집니다. `value.kind`는 Rust와 Go에서 `Kind`, JavaScript에서 그 문자열 값, Python에서 `Kind`의 멤버(곧 문자열)이며, `$value->kind()`는 문자열이고 `Kind::from()`이 이를 enum으로 바꿉니다.

JavaScript는 기존 UTF-16 텍스트로 문자열을 생성할 수 있습니다. Rust와 Go는 UTF-16 단위를 슬라이스로 제공하며 PHP와 Python은 정수 코드 단위의 iterable을 받고 Python은 단위를 list로 돌려줍니다. 배열 조회는 불변 데이터 또는 독립적인 복사본을 반환합니다.

<a id="php"></a>
## PHP 파서

PHP 라이브러리는 `polyspec/ordered-json`입니다. 공개 symbol은 class `Polyspec\OrderedJson\Value`, 예외 `Polyspec\OrderedJson\ParseError`, 함수 `Polyspec\OrderedJson\parse`와 `Polyspec\OrderedJson\stringify`, 상수 `Polyspec\OrderedJson\MAX_DEPTH`이며 라이브러리의 나머지는 이들에 대해 비공개입니다.

PIE package `polyspec/ordered-json-php-ext`인 확장 `polyspec_ordered_json`은 라이브러리를 C로 구현하고 그 class, 함수, 상수를 같은 이름과 signature로 등록합니다. 프로세스는 라이브러리나 확장 중 하나만 로드하며(라이브러리는 source를 무조건 올리므로 함수를 다시 선언하게 됩니다), 하나의 test suite가 순수 PHP 구현과 라이브러리 source 없이 확장에 대해 실행되며 결과, 오류, offset은 같습니다. 확장은 자기 package의 version, 곧 `packages/php-ext`의 `composer.json` version을 보고합니다.

ParseError 생성자는 공통 rejection kind에 대응하는 parser 메시지만 받습니다. 알 수 없는 메시지는 두 PHP backend 모두 LogicException으로 거부하며 알려진 메시지 뒤에 NUL byte를 붙인 경우도 포함합니다.

네이티브 빌드는 PHP 버전, 플랫폼, 스레드 안전 설정과 일치해야 합니다. [네이티브 설치](installation.ko.md#native-php)를 확인합니다.
