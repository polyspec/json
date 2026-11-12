<!-- doc-id: php-ext-overview -->
<!-- source-sha256: b8a56155bc82896ef467363291cf920503a9f0b128ac0f5980792b01c61851c8 -->
# ordered-json for PHP extension

[English](README.md)

객체를 연관배열로 처리하고 모든 깊이에서 문서 키 순서를 유지하는 엄격한 JSON 구현입니다. 중복 키는 최초 위치와 마지막 값을 유지합니다. 공식 입력과 기대 결과는 모노레포의 examples에서 관리합니다.

<a id="usage"></a>
## 사용

PHP >= 8.2와 일치하는 개발 헤더를 요구하며 PIE 패키지는 `polyspec/ordered-json-php-ext`, 확장은 `polyspec_ordered_json`입니다.

모노레포의 `make build-php-ext`가 `var/php-ext/polyspec_ordered_json.so`를 생성합니다. PHP의 `-d extension=/absolute/path/to/polyspec_ordered_json.so`로 로드합니다. 확장은 [PHP 라이브러리](https://github.com/polyspec/ordered-json/tree/main/packages/php)를 구현하며 그 `Value`, `ParseError`, `parse`, `stringify`, `MAX_DEPTH`를 같은 이름과 signature로 등록합니다.


macOS의 configure는 지정된 `MACOSX_DEPLOYMENT_TARGET`을 유지합니다. 값이 없으면 대상 플래그를 포함한 현재 컴파일러 설정에서 구합니다. 최신 macOS 대상의 번들에는 동적 심볼 조회를 사용합니다. Libtool의 `LT_MULTI_MODULE` 옵션으로 불필요한 동적 라이브러리 단일 모듈 플래그 검사를 제외합니다.

PIE 메타데이터는 `php-ext` 유형, `polyspec_ordered_json` 확장 이름, `src` 빌드 경로를 정의합니다. 패키지 이름은 PHP 라이브러리와 구분합니다. 로컬 PIE 빌드는 이 체크아웃을 등록하고 개발 패키지를 빌드합니다.

~~~sh
pie repository:add path .
pie build 'polyspec/ordered-json-php-ext:*@dev'
~~~

PIE 설정은 `PIE_WORKING_DIRECTORY` 환경 변수로 격리할 수 있습니다. 빌드는 확장을 설치하거나 활성화하지 않습니다. Windows 바이너리와 ZTS 빌드는 검증되지 않았습니다. 공통 검사는 PHP 버전과 확장 버전을 별도로 기록합니다. PHP 라이브러리는 이 모노레포의 형제 `packages/php/` 패키지이며 네이티브 빌드나 PIE 패키지와는 별도입니다.

동작은 [JSON 계약](https://github.com/polyspec/ordered-json/blob/main/docs/spec/json-contract.ko.md)과 [API 계약](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.ko.md)에 정의합니다. 소스는 이 저장소에서 제공합니다. 레지스트리 게시와 버전 릴리스는 검증되지 않았으며 소스 버전 문자열은 릴리스 기록이 아닙니다.

<a id="verification"></a>
## 검증

Git, make, bootstrap을 시작할 Node.js, 해당 구현의 런타임·빌드 도구를 설치하고, `mise.toml`의 Node.js, Python, Go와 다른 도구를 `mise.lock`의 digest로 `var/tools`에 설치하는 `make install-tools TOOLS=npm`, `make install-packages`, `make install`을 실행한 뒤 이 체크아웃에서 실행합니다.

~~~sh
make check
~~~

루트 검증기를 호출하여 이 패키지를 검사합니다. 루트 통합 검사는 같은 소스 리비전의 모든 패키지를 검사하고 현재 결과를 그 실행의 기록인 `var/records/verification.json`에 기록합니다.

추가 사례는 `make check JSON_TEST_SUITE=/path/to/JSONTestSuite`로 검사합니다. [개발 절차](../../../AGENTS.ko.md#package-php-ext)와 [변경 기록](../../../CHANGELOG.ko.md)에 필수 검사와 변경 사항이 있습니다.
