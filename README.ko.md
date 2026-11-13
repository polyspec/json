<!-- doc-id: overview -->
<!-- source-sha256: f21dca933241b1725177321edbd543cd62952e506e9ebc54a900cb28e7fbdd16 -->
# json

[English](README.md)

JavaScript, Rust, Go, PHP, Python용 JSON 라이브러리입니다. 객체는 모든 깊이에서 문서 키 순서를 유지하는 연관배열을 사용합니다. 중복 키는 최초 위치와 마지막 값을 유지합니다.

표준 JSON API는 객체 순서, 중복 키, 숫자 토큰 표기, 객체·배열 표현에 대해 언어를 넘나드는 하나의 동작을 제공하지 않습니다. 따라서 JSON이 JavaScript, Rust, Go, PHP, PHP 확장, Python 사이를 이동할 때 데이터가 달라질 수 있습니다. json은 손실 없는 하나의 값 모델을 정의하고, 여섯 구현체 모두에 동일한 파서, 직렬화기, 순서 규칙, 반복 라운드트립 동작을 적용합니다. 특히 빈 객체(`{}`)와 빈 배열(`[]`)을 서로 다른 타입으로 유지합니다.

이 저장소는 공통 명세, 공식 예제, 기대 결과, 검증기와 여섯 구현 패키지를 모두 관리하는 단일 소스 저장소입니다. 언어별 디렉터리는 이 저장소 안에서 독립 패키지와 빌드 대상으로 동작하며, 언어별 API를 섞지 않고 하나의 리비전을 공유합니다.

<a id="start"></a>
## 시작

~~~sh
git clone https://github.com/polyspec/json.git
cd json
~~~

저장소 루트에서 공식 입력으로 JavaScript를 실행합니다.

~~~sh
node --input-type=module <<'JS'
import {readFileSync} from 'node:fs';
import {parse, stringify} from './legacy/packages/js/index.js';
const {cases} = JSON.parse(readFileSync('examples/official.json', 'utf8'));
const example = cases.find(example => example.id === 'document-order');
console.log(stringify(parse(example.input)));
JS
~~~

설치 없이 `legacy/packages/python/src`에서 같은 예제를 Python으로 실행합니다.

~~~sh
PYTHONPATH=legacy/packages/python/src python3 - <<'PY'
import json
from polyspec.ordered_json import parse, stringify
with open('examples/official.json', encoding='utf8') as f:
    cases = json.load(f)['cases']
example = next(example for example in cases if example['id'] == 'document-order')
print(stringify(parse(example['input'])))
PY
~~~

release의 wheel asset으로 Python 패키지를 pip로 설치합니다([설치](docs/operations/installation.ko.md)). release는 저장소의 Releases 페이지에 나열되며, `X.Y.Z`는 그 release의 버전을 뜻합니다.

~~~sh
pip install "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec_ordered_json-X.Y.Z-py3-none-any.whl"
~~~

| 패키지 | 내용 | 경로 |
| --- | --- | --- |
| JavaScript | JavaScript 및 TypeScript 선언 | `legacy/packages/js/` |
| Rust | Rust crate | `packages/rust/` |
| Go | Go 패키지 | `legacy/packages/go/` |
| PHP | 순수 PHP 및 Value API | `legacy/packages/php/` |
| PHP 확장 | PIE 메타데이터를 제공하는 네이티브 PHP 확장 | `legacy/packages/php-ext/` |
| Python | Python 패키지 `polyspec-ordered-json`, import `polyspec.ordered_json` | `legacy/packages/python/` |

<a id="verification"></a>
## 검증

모든 구현이 같은 [공식 예제](examples/README.ko.md)와 공통 기대값을 사용합니다. 각 구현 패키지는 자체 빌드 대상을 제공하며, 루트의 `make check`는 현재 체크아웃의 여섯 패키지를 모두 검사합니다.

~~~sh
make check
~~~

통합 기록은 공통 리비전과 그 체크아웃의 모든 패키지 소스에 적용됩니다. 도구와 식별자는 [설치](docs/operations/installation.ko.md), 추가 사례·PIE 검사는 [검증](docs/operations/validation.ko.md)을 참조합니다. 테스트와 패키지 게시는 별도로 기록합니다.

<a id="documents"></a>
## 문서

- [JSON 계약](docs/spec/json-contract.ko.md)
- [API 계약](docs/operations/api.ko.md)
- [저장소 계약](docs/operations/repositories.ko.md)
- [기능 상태](docs/features.ko.md)
- [배포 상태](docs/operations/distribution.ko.md)
- [변경 기록](CHANGELOG.ko.md)
- [문서 관리](docs/operations/documentation-plan.ko.md)
- [개발 절차](AGENTS.ko.md)
