<!-- doc-id: repositories -->
<!-- source-sha256: 958d9d06e94f2bf1b26077cad1f0486694e43b53afb383be862fbc663ae5ed67 -->
# 저장소 계약

[English](repositories.md)

<a id="ownership"></a>
## 관리 주체

저장소는 JSON 명세, 공식 입력과 기대 결과, 공통 검증기, 구현 선언 `config/implementations.json`, 통합 검증 기록과 모든 구현 소스를 관리합니다. 각 패키지 디렉터리는 같은 Git 리비전 안에서 소스, 어댑터, 패키지 메타데이터, 문서와 패키지 빌드 설정을 관리합니다. 패키지 디렉터리는 `packages/ordered-json-<language>`이며 language는 `npm`, `php`, `php-ext`, `python`, `rust`, `go`입니다. 다른 polyspec 저장소와 같은 배치입니다.

| 패키지 | 경로 | 구현 |
| --- | --- | --- |
| common | . | 계약, fixture, 검증과 구현 선언 |
| javascript | legacy/packages/js | JavaScript |
| rust | packages/rust | Rust |
| go | legacy/packages/go | Go |
| php | legacy/packages/php | 순수 PHP와 PHP Value API |
| php-extension | legacy/packages/php-ext | 네이티브 PHP 확장 |
| python | legacy/packages/python | Python |

저장소는 공통 계약과 모든 구현체에 하나의 리비전을 사용합니다. 구현 디렉터리에는 중첩 Git 저장소를 두지 않습니다. 순수 PHP와 확장은 패키지 메타데이터와 빌드 절차를 별도로 유지하지만, 소스 변경은 같은 저장소 리비전에서 검토하고 검사합니다. 네이티브 구현은 같은 리비전의 PHP Value API와 함께 검사합니다.

<a id="verification"></a>
## 공통 검증

공식 입력과 기대 결과는 저장소 루트에만 존재합니다. probe는 공통 보고 형식을 반환하며 독립 기대값을 포함하지 않습니다. `config/implementations.json`은 구현과 그 패키지 디렉터리를 선언하고, 검증기(`scripts/registry.mts`)는 각 구현의 빌드, probe, 런타임 버전 명령을 가집니다. 저장소의 모든 도구는 패키지의 디렉터리를 그 선언에서 얻습니다. 공통 사례는 probe를 통해 JSON 계약을 검사하며 언어 전용 API에는 닿지 않으므로, 그 API는 해당 패키지의 테스트가 담당합니다. 각 구현은 자기 패키지 테스트를 그 언어의 native runner로 실행합니다(`make test-<language>`). 언어 추가에 JSON 비교 알고리즘 변경이 필요해서는 안 됩니다.

검증 기록이 담는 모든 값에는 비교 대상이 있어야 합니다. 저장소의 현재 상태이거나, 저장소가 선언한 기대값입니다. 소스와 패키지 해시는 작업 트리와 비교합니다. 저장소 밖에서 오는 입력, 곧 PIE 도구와 추가 입력 모음은 [외부 입력](../../external-inputs.json)에 고정하며, 이를 명시한 기록은 고정값과 일치해야 합니다. 둘 중 어느 것과도 비교할 수 없는 값은 근거가 아니므로 기록하지 않습니다. 링크된 모듈은 매번 새 식별자와 서명을 가지므로 어떤 재빌드도 같은 해시를 만들지 못합니다. 기록은 등록 정보가 선언한 산출물을 경로로만 명시합니다.

각 패키지 검사는 같은 체크아웃의 검증기와 fixture를 사용합니다. 통합 기록은 저장소 리비전, 구현 경로, 런타임과 결과를 명시합니다. 통합 검사는 같은 작업 트리에서 `config/implementations.json`의 모든 구현을 검사하며, 패키지나 빌드 명령이 빠진 경우 거부합니다.

각 검증 실행, 곧 통합 검사, 선택 검사, PIE 검사, 벤치마크, 비교는 자신만의 임시 실행 디렉터리에서 빌드하고 실행이 끝나면 그 디렉터리를 제거합니다. 빌드된 probe는 그 디렉터리에 기록됩니다. `buildInCopy`를 선언한 구현은 그 디렉터리에 복사한 패키지 디렉터리의 추적 중이거나 무시되지 않은 소스 파일로 빌드되며, 그 구현의 명령은 복사본을 사용합니다. 복사는 symbolic link를 거부합니다. 따라서 한 체크아웃의 두 실행은 서로의 빌드 출력을 지우거나, 다시 구성하거나, 교체하지 않으며, 빌드는 체크아웃에 출력을 남기지 않습니다. 기록은 선언된 산출물을 저장소 구조를 가진 실행 디렉터리 기준의 상대 경로로 명시합니다.

<a id="documents"></a>
## 문서와 변경

각 패키지는 자체 영어 문서와 한국어 번역을 가집니다. 구현 문서는 공통 계약과 통합 기능 상태를 참조합니다. `config/documents.json`이 공통 루트와 모든 패키지의 문서를 선택하며 `make docs-check`가 함께 검사합니다.

공통 계약을 변경할 때 검증기, 관련 구현과 적합성 fixture를 하나의 변경으로 갱신하고 패키지 및 통합 검사를 실행한 다음 결과 저장소 리비전을 게시합니다. 테스트 성공과 소스 또는 패키지 게시는 별도로 확인합니다.

<a id="php-extension"></a>
## PHP 확장 패키지

PHP 라이브러리는 `polyspec/ordered-json` Composer 패키지를 사용합니다. 확장은 별도 PIE 패키지 `polyspec/ordered-json-php-ext`, `php-ext` 유형, `polyspec_ordered_json` 확장 이름, `src` 빌드 경로를 사용합니다. 설정은 단독 확장 빌드를 기본으로 활성화합니다. PHP 라이브러리는 테스트 의존성이며 네이티브 빌드나 PIE 패키지 의존성이 아닙니다.

macOS의 configure는 명시된 `MACOSX_DEPLOYMENT_TARGET`을 유지하며 값이 없으면 현재 C 컴파일러의 배포 대상에서 구합니다. 확장은 로드 가능한 번들이므로 Libtool의 `LT_MULTI_MODULE` 옵션으로 불필요한 동적 라이브러리 단일 모듈 플래그 검사를 제외합니다. 최신 macOS 대상에는 동적 심볼 조회를 사용합니다. 일반 빌드와 PIE 빌드는 오래된 `-single_module` 및 `-undefined suppress` 경고 없이 완료해야 합니다.

PIE 호환성을 기록하기 전에 PIE 패키지 인식, 로컬 PIE 빌드, PIE 빌드 산출물에 대한 공통 JSON 검사가 성공해야 합니다. 로컬 빌드는 Packagist 게시, 릴리스된 버전, Windows 바이너리 제공, 사용자 PHP 설정에 설치했다는 근거가 아닙니다. [PIE 유지보수 계약](https://github.com/php/pie/blob/1.4.10/docs/extension-maintainers.md)에 패키지 메타데이터와 빌드 동작이 정의되어 있습니다.

<a id="state"></a>
## 구현 상태

여섯 구현 패키지는 이 저장소에서 관리합니다. [기능 상태](../features.ko.md)에 이 계약과 별도로 완료 여부와 근거를 기록합니다.
