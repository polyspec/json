<!-- doc-id: python-overview -->
<!-- source-sha256: 71589c3066322909a1cdd00546d12ede42bed3969ee9b1d7d53ea7d608f6ace0 -->
# Python용 ordered-json

[English](README.md)

문서 키 순서를 모든 깊이에서 보존하는 associative object를 가진 엄격한 JSON입니다. 반복된 키는 첫 위치와 마지막 값을 유지합니다. 공식 입력과 기대 결과는 monorepo examples에서 관리합니다.

<a id="usage"></a>
## 사용

Python >= 3.14. 패키지는 `polyspec-ordered-json`이고 import 이름은 `polyspec.ordered_json`이며, release의 wheel asset으로 설치합니다. `X.Y.Z`는 그 release의 버전입니다:

~~~sh
pip install "https://github.com/polyspec/ordered-json/releases/download/vX.Y.Z/polyspec_ordered_json-X.Y.Z-py3-none-any.whl"
~~~

사용 예의 `source`는 [공통 공식 예시](https://github.com/polyspec/ordered-json/blob/main/examples/official.json)의 object 사례에서 가져옵니다. parse 오류는 UTF-8 byte offset을 보고합니다. `Value.string_value()`는 surrogate pair를 한 문자로, 짝 없는 surrogate를 자기 문자 그대로 돌려주며, 이는 JavaScript binding과 같습니다.

~~~python
from polyspec.ordered_json import parse, stringify

value = parse(source)
output = stringify(value)
~~~

`parse(source, ParseOptions(reject_duplicates=True))`는 모든 깊이에서 반복된 decode된 object key를, 마지막 값을 유지하는 대신, 두 번째 key token의 첫 byte에서 `duplicate_object_key` kind의 `ParseError`로 거부합니다.

[JSON 계약](https://github.com/polyspec/ordered-json/blob/main/docs/spec/json-contract.md)과 [API 계약](https://github.com/polyspec/ordered-json/blob/main/docs/operations/api.md)이 동작을 정의합니다. source는 이 저장소가 제공합니다. registry 게시와 version 릴리스는 검증하지 않으며, source version 문자열은 릴리스 기록이 아닙니다.

<a id="verification"></a>
## 검증

Git, make, bootstrap을 시작할 Node.js를 설치하고, `mise.toml`의 Node.js, Python, Go와 다른 도구를 `mise.lock`의 digest로 `var/tools`에 설치하는 `make install-tools TOOLS=npm`, `make install-packages`, `make install`을 실행한 뒤 이 체크아웃에서 실행합니다.

~~~sh
make check
~~~

이 명령은 이 패키지만 대상으로 저장소 루트의 검증기를 실행합니다. 루트 통합 검사는 같은 source revision에서 모든 패키지를 시험하고 현재 결과를 실행 기록 `var/records/verification.json`에 씁니다.

보충 사례에는 `make check JSON_TEST_SUITE=/path/to/JSONTestSuite`를 씁니다. [개발 절차](../../../AGENTS.ko.md#package-python)와 [변경 기록](../../../CHANGELOG.ko.md)이 필수 검사와 변경을 설명합니다.
