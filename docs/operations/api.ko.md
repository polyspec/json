<!-- doc-id: api -->
<!-- source-sha256: 961e3d54e32fe080337016781309d2156d9fce3d783056e2d903aa70876dffb1 -->
# API 계약

[English](api.md)

[JSON 계약](../spec/json-contract.ko.md)은 모든 구현의 공통 동작을 정의합니다. 이 문서는 현재 언어별 API를 정의합니다. 현재 식별자는 [설치 문서](installation.ko.md)에 작성합니다.

프로젝트는 `json`이고 모든 패키지 이름은 polyspec 관례를 따릅니다. JavaScript는 바인딩 `@polyspec/json`을 사용하며, 이것은 기계마다의 platform 패키지를 가진 npm 패키지입니다. Rust는 Cargo 패키지 `polyspec-json`을 사용하고 `polyspec_json`을 import합니다. Go에는 바인딩 모듈 `github.com/polyspec/json/packages/go`가 있습니다. 이 문서의 Go 열은 아직 `legacy/packages/go`의 legacy 패키지 `orderedjson`(모듈 `github.com/polyspec/ordered-json/packages/go`)이며, checkout은 그 테스트가 바인딩으로 옮겨질 때까지 그것을 유지합니다([전환](../spec/json-contract.ko.md#transition)). PHP는 PIE 패키지 `polyspec/json`의 바인딩 확장 `polyspec_json`을 사용하며 namespace는 `Polyspec\Json`입니다(T3.25-3). Python은 바인딩 `polyspec-json`을 사용하고 namespace `polyspec` 아래의 패키지 `polyspec.json`을 import합니다. JavaScript, PHP, Python 열은 `packages/rust/interface.json`에서 생성된 바인딩입니다. 패키지 `@polyspec/ordered-json`, `polyspec/ordered-json`, `polyspec-ordered-json`은 그 legacy 형태이며 마지막 release를 유지합니다.

<a id="values"></a>
## 값과 파싱

파싱된 `Value` 객체는 라이브러리 API로 변경할 수 없습니다. 생성자는 문자열, 숫자 토큰, 불리언, null, 배열, 객체를 생성합니다. 생성자는 생성한 JSON을 라이브러리 parser로 검사합니다. 종류가 맞지 않는 접근은 접근자에 따라 값 없음 또는 오류를 반환하며 거부된 인자는 그 언어의 host 오류 class를 발생시키며 공유 [argument kind](../spec/json-contract.ko.md#argument-kinds) 중 하나를 가지므로 빈 kind를 가진 오류는 없습니다. 핵심 parser와 serializer는 JSON 동작을 host JSON API에 위임하지 않습니다.

| 동작 | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| 텍스트 파싱 | `parse(source, options)` | `parse(source.as_bytes(), &options)` | `Parse(source)` | `parse(source, maxDepth)` | `parse(source, max_depth=…, reject_duplicates=…)` |
| UTF-8 바이트 | `parse(bytes, options)` | `parse(bytes, &options)` | `ParseBytes(bytes)` | `parse($source, $maxDepth)` | `parse(data)` |
| 깊이 한도 | `options.maxDepth` | `ParseOptions { max_depth }` | `ParseWithMaxDepth(source, limit)` | `maxDepth` | `max_depth=` |
| 기본 출력 | `stringify(value)` | `stringify(&value, &options)` | `Stringify(value)` | `stringify($value)` | `stringify(value)` |
| compact 출력 | `stringify(value)` | `value.to_string()` | `value.Compact()` | `(string) $value` | `str(value)` |
| 원문 조회 | `value.raw` | `value.raw()` | `value.Raw()` | `$value->raw()` | `value.raw` |
| 종류 | `value.kind` | `value.kind()` | `value.Kind()` | `$value->kind()` | `value.kind` |

모든 바인딩은 파싱 오류를 UTF-8 바이트 위치로 보고합니다. Rust, Go, PHP, Python, 그리고 JavaScript가 그러하며, JavaScript의 `ParseError.offset`은 string 원문과 `Uint8Array` 모두에서 바이트를 셉니다. JavaScript와 Python은 하나의 `parse`로 텍스트와 UTF-8 바이트를 받습니다. JavaScript는 `string`이나 `Uint8Array`를, Python은 `str`, `bytes`, `bytearray`, `memoryview`를 받습니다. Go `Value`의 zero value는 유효하지 않습니다. 빈 `OrderedMap` 값은 유효한 객체 입력입니다.

<a id="bindings"></a>
## 바인딩 확장

바인딩은 해당 언어에만 필요한 API를 추가할 수 있습니다. 바인딩 확장은 공유 parser와 serializer를 사용하고, 허용한 입력의 결과와 오류 위치를 바꾸지 않으며, 추가로 거부하는 입력을 문서화합니다. 공유 동작 표가 아니라 이 절에 적습니다. 해당 패키지는 자체 테스트를 그 언어의 native test runner로 실행합니다(`make test-<language>`). 공통 사례가 닿지 못하는 API는 그 테스트로만 검증됩니다.

Rust crate는 [Rust 코어](../spec/json-contract.ko.md#core) 규칙의 코어입니다: `parse(source, &ParseOptions)`는 UTF-8 바이트를 옵션 `max_depth`, `reject_duplicates`와 함께 받으며, 후자는 어느 깊이든 반복된 해석된 객체 키를 두 번째 키 토큰의 첫 바이트에서 `duplicate_object_key`로 거부합니다. `stringify(&value, &StringifyOptions)`는 `html_safe`를 받습니다. 이 문서의 JavaScript, PHP, Python 패키지는 `packages/rust/interface.json`에서 생성한 바인딩이며, Go 패키지는 [이행 기간](../spec/json-contract.ko.md#transition) 동안 legacy 패키지의 API를 유지합니다.

Rust crate의 모든 오류는 exhaustive enum `Error`의 변형이므로 호출자는 wildcard arm 없이 모든 kind를 match합니다. `kind()`는 공통 목록의 종류 이름, `message()`는 Rust 문구, `offset()`은 파싱 거부의 바이트 위치이며 인자 오류와 생성자의 깊이 실패에서는 `None`입니다. 다른 종류의 접근자와 조회는 `wrong_kind`로, 짝 없는 surrogate가 든 문자열의 `string_value()`는 `unpaired_surrogate`로, 65535를 넘는 코드 단위는 `invalid_code_unit`으로, NaN이나 무한대의 `Value::from_f64`는 `non_finite_number`로, `host_json()`은 늘 `host_serialization_refused`로 실패합니다. 빈 kind를 가진 오류는 없습니다.

legacy Go 패키지는 `ParseRejectDuplicates(source)`를 제공합니다. 일반 문법과 기본 깊이 한도로 텍스트를 파싱하지만 어느 깊이든 해석된 객체 키가 반복되면 거부합니다. 이스케이프 표기가 같은 UTF-16 키를 만드는 경우를 포함하여 두 번째 키 토큰의 첫 바이트 위치에 `duplicate object key` 오류(kind `duplicate_object_key`)를 반환합니다. `Parse`는 공통 중복 키 동작을 유지합니다. 그 밖의 유효한 값과 오류 및 위치는 바뀌지 않습니다.

legacy Go 패키지의 모든 오류는 module만 구현하는 interface `orderedjson.Error`이므로 module의 어떤 오류도 빈 kind를 갖지 않습니다: `Kind()`는 그 문자열이 kind 이름인 `ErrorKind` 상수를, `Offset()`은 거부의 바이트 위치를(거부된 인자에서는 0), `Message()`는 Go 문구를 반환합니다. 호출자는 `orderedjson.Error` 타입의 `target`에 대해 `errors.As(err, &target)`로 읽습니다. 파싱 거부는 공유 목록의 이름을 가지며, Go 문자열은 unpaired surrogate를 잘못된 UTF-8로만 담으므로 `unescaped_lone_surrogate`는 제외되고, `ParseRejectDuplicates`가 `duplicate_object_key`를 더합니다. 거부된 인자는 공유 argument 목록의 kind를 가집니다: 문자열이 아닌 key의 `OrderedMap.Set`에 `non_string_key`, 다른 kind 값의 `Members`, `Items`, `StringUnits`, `StringValue`, `NumberLiteral`, `BooleanValue`에 `wrong_kind`, `Number`에 `invalid_number_literal`, 0부터 256 밖의 한도인 `ParseWithMaxDepth`에 `depth_limit_out_of_range`, UTF-8이 아닌 text의 `String`에 `invalid_utf8`, `Set`, `Array`, `Stringify`, `Compact`에 준 nil 또는 영값 `Value`와 `Object`에 준 nil `OrderedMap`에 `invalid_argument_type`을 가집니다.

JavaScript, Python, PHP에서 라이브러리의 모든 오류는 Rust와 Go와 같은 이름의 kind를 가지며, 바인딩의 오류 class가 범주별로 나뉩니다(change-errors). `invalid_number_literal`, `depth_limit_out_of_range`, `invalid_code_unit`, `invalid_number`, `invalid_text`, `unpaired_surrogate`는 값 오류이고, `non_string_key`, `wrong_kind`, `invalid_argument_type`, `host_serialization_refused`, `direct_construction`은 타입 오류입니다. `ParseError`는 거부 위치를 가진 값 오류입니다. JavaScript에는 `RangeError`인 `JsonValueError`, `TypeError`인 `JsonTypeError`, 그리고 `offset`이 number 또는 null인 `JsonValueError`의 하위 class `ParseError`가 있으며, 각 오류는 `kind`, `status`, `errno` 속성을 가집니다. Python에는 `ValueError`인 `JSONValueError`, `TypeError`인 `JSONTypeError`, `JSONValueError`의 하위 class `ParseError`가 있으며 `kind`, `offset`, `status`, `errno` 속성을 가집니다. PHP에는 `InvalidArgumentException`인 `Polyspec\Json\JsonValueError`, `TypeError`인 `Polyspec\Json\JsonTypeError`, `JsonValueError`의 하위 class `Polyspec\Json\ParseError`가 있으며 `kind()`, `offset()`, `status()`, `errno()` 메서드를 가집니다. 각 바인딩은 계약의 다른 범주인 I/O, store, busy, internal 오류의 class도 선언합니다(`JsonIoError`, `JsonStoreError`, `JsonBusyError`, `JsonInternalError`, Python에서는 `JSONIoError` 등). 목록 밖의 kind나 message를 받은 오류 생성자와 JavaScript 및 Python의 `Value` 생성자는 `direct_construction`을 발생시킵니다.

JavaScript 바인딩은 `parse(source, options)`의 options에서 `maxDepth`와 함께 `rejectDuplicates: true`를 받습니다. 이 옵션이 있으면 parser는 어느 깊이든 해석된 객체 키가 반복되면 kind가 `duplicate_object_key`인 `ParseError`로 거부하며, 그 `offset`은 두 번째 키 토큰의 첫 바이트입니다. 이스케이프 시퀀스가 같은 UTF-16 키를 쓰는 경우도 포함합니다. 기본값 `false`는 공통 중복 키 동작을 유지합니다. `stringify(value, options)`는 `htmlSafe`를 받습니다. 다른 모든 유효한 값, 오류, 위치는 바뀌지 않습니다.

PHP 바인딩은 중복 거부를 `parse($source, $maxDepth, $rejectDuplicates)`의 option으로 받습니다(change-parse-options): `parse($source, MAX_DEPTH, true)`는 이스케이프 표기가 같은 UTF-16 키를 만드는 경우를 포함하여 어느 깊이든 해석된 객체 키가 반복되면 `duplicate_object_key` 종류의 `Polyspec\Json\ParseError`로 거부하며, 그 `offset()`은 두 번째 키 토큰의 첫 바이트 위치입니다. 기본값 `false`는 공통 중복 키 동작을 유지합니다. 그 밖의 유효한 값과 오류 및 위치는 바뀌지 않습니다.

Python 바인딩은 `parse`의 옵션을 keyword 인자로 받습니다. `parse(source, max_depth=256, reject_duplicates=False)`입니다. `reject_duplicates=True`이면 parser는 어느 깊이든 해석된 객체 키가 반복되면 두 번째 키 토큰의 첫 바이트에서 kind가 `duplicate_object_key`인 `ParseError`로 거부합니다. 이스케이프 시퀀스가 같은 UTF-16 키를 쓰는 경우도 포함합니다. `stringify(value, html_safe=False)`는 `html_safe`를 받습니다. 다른 모든 유효한 값, 오류, 위치는 바뀌지 않습니다. 배포판은 패키지 `polyspec.json`에 PEP 561의 `py.typed` marker를 담으므로 type checker가 그 annotation을 읽습니다.

문자열 접근은 surrogate pair를 한 문자로 반환합니다. 이스케이프된 unpaired surrogate는 결코 대체되지 않습니다. 모든 구현에서 `string_units()`는 그것을 유지하며, Rust(`string_value()`), JavaScript(`stringValue()`), PHP(`stringValue()`), Python(`string_value()`)의 문자열 값은 그런 문자열을 `unpaired_surrogate`로 거부합니다(change-string-value). JavaScript와 PHP의 `stringText()`, Python의 `string_text()`는 그런 문자열에 null이나 `None`을, 그 밖에는 텍스트를 반환합니다. legacy Go 패키지는 그것을 WTF-8 바이트로 유지합니다. 텍스트 입력의 literal unpaired surrogate에는 UTF-8 인코딩이 없습니다. Rust, Go, PHP는 문법을 읽기 전에 그 WTF-8 바이트를 `invalid UTF-8`로 거부하고, JavaScript와 Python은 그것을 담은 `string`이나 `str` 원문을 `invalid_text`로 거부하며, 그런 텍스트를 받은 `Value.string`도 같습니다. 그런 문자열은 `Value.fromUnits(units)`나 `Value.from_units(units)`로 코드 단위에서 만듭니다.

각 언어의 표준 JSON 인터페이스는 JavaScript의 `Value.toJSON`, PHP의 `Value::jsonSerialize`, Python의 `json.dumps`, Go의 `Value.MarshalJSON`, Rust의 Serde trait입니다. JavaScript와 PHP는 값을, native 구조가 그것을 담고 있을 때에도, `stringify`를 가리키는 message로 거부합니다. Python의 `json.dumps`는 바인딩이 encoder class를 선언하지 않으므로 값을 자체 `TypeError`로 거부합니다. Go와 Rust는 native 구조 안에서도 값의 compact 계약 바이트를 씁니다.

통합은 생태계의 표준 인터페이스이며 라이브러리의 인코더가 아닙니다: Go `Value`는 `json.Marshaler`(`MarshalJSON`이 값의 compact 텍스트를 씀)와 `json.Unmarshaler`(`UnmarshalJSON`이 라이브러리 parser로 문서를 파싱해 순서, 숫자 token, 짝 없는 surrogate를 유지하고 잘못된 JSON을 거부함)를 구현하고, Rust `Value`는 Serde `Serialize`와 `Deserialize`를 구현하므로 `encoding/json`과 `serde_json`이 값을 담은 모든 native 구조를 contract bytes로 인코딩하고 디코딩합니다. 그 밖의 native 구조는 host 라이브러리가 자체 규칙으로 인코딩합니다.

<a id="objects"></a>
## 연관 객체

| 동작 | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| 멤버 연관배열 | `value.members()` | `value.members()` | `value.Members()` | `$value->members()` | `value.members()` |
| 문자열 키 조회 | `value.get(key)` | `value.get(key)` | `value.Get(key)` | `$value->get($key)` | `value.get(key)` |
| 코드 단위 조회 | `value.getUnits(units)` | `value.get_units(units)` | `value.GetUnits(units)` | `$value->getUnits($units)` | `value.get_units(units)` |
| 객체 생성 | `Value.object(map)` | `Value::object(&members)` | `Object(map)` | `Value::object($map)` | `Value.object(map)` |

JavaScript는 `value.members()`에서 `OrderedMap`을 반환합니다. `insert(key, value)`는 문자열 `Value` 키를 받고 대체된 값이나 null을 반환하며, `get(key)`와 `getUnits(units)`는 멤버를 조회하고, `size`는 멤버 수이며, map은 삽입 순서의 `[Value, Value]` 쌍으로 순회됩니다. `Value.object(map)`은 `OrderedMap`만 받으며, `new OrderedMap()`이 빈 map을 만듭니다.

Rust는 불변 `OrderedMap` 참조를 반환합니다. `OrderedMap::insert(key, value)`는 문자열 `Value` 키를 받고 교체된 값이 있으면 반환합니다. `iter()`는 등록 순서대로 키와 값의 참조를 반환하고 `len()`은 `u64`입니다.

Go는 독립적인 `OrderedMap` 복사본을 반환합니다. `Set(key, value)`는 문자열 `Value` 키를 받으며 `Keys()`는 등록 순서대로 키 값을 반환합니다. `Get`과 `GetUnits`는 값 포인터 또는 nil을 반환합니다. `ParseBytes`는 입력을 복사합니다.

PHP와 Python은 키와 값이 모두 `Value` 객체인 `OrderedMap`을 반환하며, 객체 생성은 `OrderedMap`만 받습니다. `insert(key, value)`는 문자열 `Value` 키를 받으므로 다른 kind의 키는 `non_string_key`로 거부되고, `size()`는 멤버 수입니다. PHP의 map은 `IteratorAggregate`이며, Python의 map을 순회하면 키가, `items()`는 쌍이 나옵니다. 없는 키는 PHP와 JavaScript에서 null, Rust와 Python에서 `None`, Go에서 nil을 반환합니다.

<a id="scalars"></a>
## 배열과 스칼라

| 동작 | JavaScript | Rust | Go | PHP | Python |
| --- | --- | --- | --- | --- | --- |
| 배열 생성 | `Value.array(items)` | `Value::array(items)` | `Array(items)` | `Value::array($items)` | `Value.array(items)` |
| 배열 원소 | `value.items()` | `value.items()` | `value.Items()` | `$value->items()` | `value.items()` |
| 문자열 생성 | `Value.string(text)` | `Value::string(text)` | `String(text)` | `Value::string($text)` | `Value.string(text)` |
| 문자열 조회 | `stringValue()` | `string_value()` | `StringValue()` | `stringValue()` | `string_value()` |
| UTF-16 조회 | `stringUnits()` | `string_units()` | `StringUnits()` | `stringUnits()` | `string_units()` |
| UTF-16 생성 | `Value.fromUnits(units)` | `Value::from_units(&units)` | `StringFromUnits(units)` | `Value::fromUnits($units)` | `Value.from_units(units)` |
| 숫자 생성 | `Value.number(token)` | `Value::number(token)` | `Number(token)` | `Value::number($token)` | `Value.number(token)` |
| 숫자 조회 | `numberLiteral()` | `number_literal()` | `NumberLiteral()` | `numberLiteral()` | `number_literal()` |
| 불리언 생성 | `Value.boolean(flag)` | `Value::boolean(flag)` | `Boolean(flag)` | `Value::boolean($flag)` | `Value.boolean(flag)` |
| 불리언 조회 | `booleanValue()` | `boolean_value()` | `BooleanValue()` | `booleanValue()` | `boolean_value()` |
| null 생성 | `Value.null()` | `Value::null()` | `Null()` | `Value::null()` | `Value.null()` |

kind의 이름은 모든 구현에서 `object`, `array`, `string`, `number`, `boolean`, `null`입니다. Rust에는 enum `Kind`, Go에는 `Kind`의 상수 `ObjectKind`부터 `NullKind`, Python에는 `StrEnum` `Kind`(`OBJECT`부터 `NULL`), PHP에는 case가 `Object_`, `Array_`, `String_`, `Number`, `Boolean`, `Null_`인 backed enum `Kind`가 있습니다. JavaScript에는 여섯 문자열의 union인 타입 `Kind`가 있고 런타임 값은 없습니다. `value.kind`는 Rust와 Go에서 `Kind`, JavaScript에서 문자열, Python에서 `Kind`의 멤버(그 문자열이기도 합니다)이며, `$value->kind()`는 enum의 case입니다.

`Value.string`은 텍스트를 받습니다. JavaScript와 Python은 unpaired surrogate가 있는 텍스트를 `invalid_text`로 거부하고([RQ-026](../spec/json-contract.ko.md#requirements)), 그런 문자열을 `Value.fromUnits(units)`와 `Value.from_units(units)`로 코드 단위에서 만듭니다. Go는 UTF-16 단위를 slice로, Rust는 코어가 65535와 대조하는 `Vec<u64>`로 노출합니다. JavaScript, PHP, Python은 정수 코드 단위를 받고 그것을 배열이나 list로 반환합니다. `Value.fromFloat`, `Value::fromFloat`, `Value.from_float`는 유한한 host float에서 숫자를 만듭니다. 배열 접근은 불변 데이터나 독립 복사본을 반환합니다.

<a id="php"></a>
## PHP backend

json의 PHP 패키지는 PIE 패키지 `polyspec/json`의 바인딩 확장 `polyspec_json`이며, release가 Rust core에서 PHP minor와 플랫폼마다 pre-packaged binary로 빌드합니다(T3.25-3). 공개 symbol은 `packages/php-ext/generated/polyspec_json.stub.php`의 것입니다: class `Polyspec\Json\Value`와 `Polyspec\Json\OrderedMap`, enum `Polyspec\Json\Kind`, `Polyspec\Json\JsonValueError`, `Polyspec\Json\JsonTypeError`, `Polyspec\Json\ParseError`를 포함한 오류 class, 함수 `Polyspec\Json\parse`와 `Polyspec\Json\stringify`, 상수 `Polyspec\Json\MAX_DEPTH`입니다. json에는 순수 PHP 라이브러리가 없습니다: legacy 패키지 `polyspec/ordered-json`과 `polyspec/ordered-json-php-ext`는 마지막 release를 유지합니다.

오류 class는 메시지와 그 class의 kind로 생성합니다; 다른 kind는 kind `invalid_argument_type`의 `JsonTypeError`로 거부하며, `Value` 생성자는 `direct_construction`을 발생시킵니다.

pre-packaged binary는 그 이름의 PHP minor, 플랫폼, 스레드 안전 설정과 일치합니다. [네이티브 설치](installation.ko.md#native-php)를 확인합니다.
