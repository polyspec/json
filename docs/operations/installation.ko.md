<!-- doc-id: installation -->
<!-- source-sha256: e8a9b7e25d2dd2380ec0cd6a11e2e4ebd88909f80ff34ccfd673f8159dd7c973 -->
# 설치와 실행

[English](installation.md)

<a id="requirements"></a>
## 요구사항과 식별자

| 구성 요소 | 선언된 요구사항 | 현재 식별자 | 메타데이터 |
| --- | --- | --- | --- |
| JavaScript | Node.js >= 20, ESM | `@polyspec/ordered-json` | [package.json](https://github.com/polyspec/ordered-json/blob/main/packages/js/package.json) |
| Rust | Rust >= 1.71, edition 2021 | `polyspec-ordered-json` | [Cargo.toml](https://github.com/polyspec/ordered-json/blob/main/packages/rust/Cargo.toml) |
| Go | Go >= 1.22 | `github.com/polyspec/ordered-json/packages/go` 모듈, `orderedjson` 패키지 | [go.mod](https://github.com/polyspec/ordered-json/blob/main/packages/go/go.mod) |
| PHP | PHP >= 8.2, JSON 및 PCRE 확장 | `polyspec/ordered-json`, `Polyspec\OrderedJson` 네임스페이스 | [composer.json](https://github.com/polyspec/ordered-json/blob/main/packages/php/composer.json) |
| Python | Python >= 3.14 | `polyspec-ordered-json`, `polyspec.ordered_json` import | [pyproject.toml](https://github.com/polyspec/ordered-json/blob/main/packages/python/pyproject.toml) |
| 네이티브 PHP | 일치하는 PHP 개발 헤더, C 컴파일러, phpize, make | `polyspec_ordered_json` 확장 | [확장 소스](https://github.com/polyspec/ordered-json/blob/main/packages/php-ext/src/ordered_json.c) |
| 저장소 검사 | 고정된 Python, Node.js, Rust, Go, npm release, Git, make, 위 PHP | `make install`, `make check` | [검증](validation.ko.md) |

저장소 검사는 추적 파일이 고정한 정확한 release로 실행합니다. Rust는 `rust-toolchain.toml`, Node.js, Go와 Python은 `mise.toml`에 `@polyspec/kit`의 pin으로(`packages/go/go.mod`의 `go` 줄도 같은 Go를 정확히 가리킵니다) Composer, uv, lint와 dependency review의 도구와 함께 고정하고 `mise.lock`이 각 digest로 잠그며, PHP는 `.php-version`에 minor release로, npm은 `package.json`의 `devEngines.packageManager` 버전으로 고정하고, 그 tarball의 digest는 `mise.lock`에 둡니다. 새 checkout은 먼저 mise, `mise.toml`의 Node.js와 그 npm을 `var/tools`에 설치하는 `make install-tools TOOLS=npm`과, 그 npm으로 공유 도구의 package `@polyspec/kit`을 포함한 `package-lock.json`을 설치하는 `make install-packages`를 실행합니다. 그다음 `make install`은 그 Rust toolchain을 rustup으로 설치하고, `mise.lock`의 도구를 `mise install --locked`로 Git이 무시하고 Makefile이 그 shim을 `PATH` 앞에 두는 checkout의 `var/tools/mise`에 설치합니다(`@polyspec/kit`의 설치 도구를 실행하는 `make install-tools`). 기계의 도구는 사용하지도 바꾸지도 않습니다. `make install-tools`는 모든 도구를 선언대로 설치하고, 도구를 실행하는 모든 target이 이에 의존하며, 다른 도구마다 기대 버전과 실제 버전을 밝히며 실패합니다. `GOTOOLCHAIN=local`과 `RUSTUP_AUTO_INSTALL=0`은 실행 중에 go와 rustup이 다른 toolchain을 내려받거나 설치하지 못하게 하고, 모든 cargo 명령은 `--locked`를 사용합니다.

표는 선언된 최소 버전이며 모든 최소 버전에서 테스트했다는 의미는 아닙니다. 실제 버전은 commit을 검증하는 실행의 [기록](validation.ko.md#records)에 기록합니다. JavaScript, Rust, Go, Python은 외부 런타임 라이브러리에 의존하지 않습니다.

<a id="checkout"></a>
## 소스 체크아웃

~~~sh
git clone https://github.com/polyspec/ordered-json.git
cd ordered-json
~~~

복제본에는 모든 구현 패키지가 포함됩니다. 패키지 디렉터리 또는 게시된 패키지가 준비된 경우 게시 패키지를 사용합니다. 레지스트리 설치와 게시는 검증되지 않았습니다. [배포](distribution.ko.md)를 확인합니다.

- JavaScript: `packages/js/index.js`에서 가져옵니다. TypeScript 선언은 `packages/js/index.d.ts`에 있습니다.
- Rust: `path`가 `packages/rust/`를 지정하는 로컬 Cargo 의존성을 설정합니다.
- Go: `github.com/polyspec/ordered-json/packages/go` 모듈의 로컬 `replace`가 `packages/go/`를 지정하도록 설정합니다.
- PHP: `packages/php/`를 Composer path 저장소로 사용합니다. Composer는 그 class를 PSR-4로, 함수를 `files`로 load합니다.
- Python: release의 wheel asset을 pip로 설치하거나 `packages/python/src`를 import 경로에 둡니다.

~~~sh
pip install "https://github.com/polyspec/ordered-json/releases/download/vX.Y.Z/polyspec_ordered_json-X.Y.Z-py3-none-any.whl"
~~~

<a id="release-assets"></a>
## 릴리스 asset

GitHub Release `vX.Y.Z`마다 `polyspec-ordered-json-X.Y.Z.tgz`, `polyspec-ordered-json-php-X.Y.Z.zip`, `polyspec-ordered-json-php-ext-X.Y.Z.zip`과 wheel `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`이 있습니다. 각 archive는 자기 package의 manifest를 바꾸지 않고 담습니다. `packages/js/`의 `package.json`, `packages/php/`와 `packages/php-ext/`의 `composer.json`이며, 모두 `version` X.Y.Z를 선언하고 `repositories`와 `@dev`가 없습니다. Python 패키지는 wheel만 릴리스합니다. pip는 위 설치 절의 wheel asset URL로 설치하며, git tag로는 설치하지 않습니다.

npm은 tarball을 경로로 설치합니다.

~~~sh
mkdir app && cd app
npm init -y
npm install ./polyspec-ordered-json-X.Y.Z.tgz
~~~

Composer는 zip들을 담은 디렉터리인 artifact repository에서 zip을 설치합니다. `composer.json` 옆의 `assets/`에 zip이 있을 때:

~~~json
{
  "repositories": [
    {"type": "artifact", "url": "assets"},
    {"packagist.org": false}
  ],
  "require": {"polyspec/ordered-json": "X.Y.Z"}
}
~~~

~~~sh
composer install
~~~

Composer는 두 zip을 모두 읽습니다. type이 `php-ext`인 package `polyspec/ordered-json-php-ext`은 설치하지 않으며, PIE가 빌드하고 설치합니다([네이티브 PHP](#native-php)).

이 저장소의 package는 다른 package에 의존하지 않으므로 저장소에는 npm workspaces와 비공개 개발 manifest가 없습니다. 루트의 `package.json`과 `composer.json`은 checkout에서 설치하도록 `packages/js/`, `packages/php/`와 같은 package를 같은 `version`으로 선언하며 `repositories`가 없습니다. consumer는 저장소 밖에서 release를 패키지 관리자로 설치합니다. npm은 release tarball `polyspec-ordered-json-X.Y.Z.tgz`를 설치하고, Composer는 PHP 패키지를 release zip의 artifact repository에서 require합니다.

<a id="native-php"></a>
## 네이티브 PHP

확장을 로드할 PHP 런타임에 맞춰 저장소 루트에서 빌드합니다.

~~~sh
make build-php-ext
~~~

kit의 확장 유틸리티를 실행하는 `make build-php-ext`는 stub에서 `make php-ext-arginfo`가 쓴 arginfo header가 그 stub의 것임을 확인한 뒤 `packages/php-ext`의 복사본에서 phpize로 확장을 빌드하고 `var/php-ext/polyspec_ordered_json.so`를 게시합니다. 사용자는 PIE(`polyspec/ordered-json-php-ext`)로 빌드하고 설치합니다. 모듈을 로드하려면 다음과 같이 실행합니다.

~~~sh
php -n -d extension="$PWD/var/php-ext/polyspec_ordered_json.so" script.php
~~~

`script.php`는 확장을 사용하는 임의의 PHP 스크립트입니다. `php -n`은 php.ini를 무시하며 필수 내장 JSON 및 PCRE 지원은 사용할 수 있어야 합니다. 소스에는 `config.w32`가 포함돼 있지만 Windows와 ZTS 빌드는 검증되지 않았습니다. PIE에는 `pkg-config`를 포함한 빌드 도구가 필요하며 macOS의 Homebrew 패키지는 `pkgconf`입니다. 재현 가능한 PIE 빌드와 공통 검증 절차는 [PIE 산출물 검사](validation.ko.md#pie)를 참조합니다.

macOS의 configure는 명시된 `MACOSX_DEPLOYMENT_TARGET`을 유지하며 값이 없으면 `CFLAGS`의 대상 플래그를 포함한 현재 C 컴파일러에서 구합니다. 로드 가능한 번들은 최신 대상에서 동적 심볼 조회를 사용하고 사용하지 않는 동적 라이브러리 단일 모듈 플래그 검사를 제외합니다.

공통 PHP API와 파서 선택 규칙은 [API 계약](api.ko.md#php)에 정의합니다. 네이티브 소스나 PHP 빌드 설정을 변경하면 모듈을 다시 빌드합니다.
