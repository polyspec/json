<!-- doc-id: installation -->
<!-- source-sha256: 763679af77f0a3828c6bdc5d88d397db02095017f42fa7b1a0b6fdc953647574 -->
# 설치와 실행

[English](installation.md)

<a id="requirements"></a>
## 요구사항과 식별자

| 구성 요소 | 선언된 요구사항 | 현재 식별자 | 메타데이터 |
| --- | --- | --- | --- |
| JavaScript | Node.js, ESM과 CommonJS; `package.json`은 `engines`를 선언하지 않으며 release는 `mise.toml`의 Node.js로 테스트합니다 | `@polyspec/json`과 그 기계의 platform 패키지 | [package.json](https://github.com/polyspec/json/blob/main/packages/ts/package.json) |
| Rust | Rust >= 1.71, edition 2021 | `polyspec-json` | [Cargo.toml](https://github.com/polyspec/json/blob/main/packages/rust/Cargo.toml) |
| Go | Go >= 1.27.3과 cgo | 바인딩 모듈 `github.com/polyspec/json/packages/go`, tag `packages/go/vX.Y.Z`로 release됩니다 | [go.mod](https://github.com/polyspec/json/blob/main/packages/go/go.mod) |
| PHP | PHP >= 8.4 및 PIE | PIE 패키지 `polyspec/json`의 바인딩 확장 `polyspec_json`, `Polyspec\Json` 네임스페이스 | [composer.json](https://github.com/polyspec/json/blob/main/packages/php-ext/composer.json) |
| Python | Python >= 3.14 | `polyspec-json`, `polyspec.json` import | [pyproject.toml](https://github.com/polyspec/json/blob/main/packages/python/pyproject.toml) |
| 저장소 검사 | 고정된 Python, Node.js, Rust, Go, npm release, Git, make, 위 PHP | `make install`, `make check` | [검증](validation.ko.md) |

저장소 검사는 추적 파일이 고정한 정확한 release로 실행합니다. Rust는 `rust-toolchain.toml`, Node.js, Go와 Python은 `mise.toml`에 `@polyspec/kit`의 pin으로(`legacy/packages/go/go.mod`의 `go` 줄도 같은 Go를 정확히 가리킵니다) Composer, uv, lint와 dependency review의 도구와 함께 고정하고 `mise.lock`이 각 digest로 잠그며, PHP는 `.php-version`에 minor release로, npm은 `package.json`의 `devEngines.packageManager` 버전으로 고정하고, 그 tarball의 digest는 `mise.lock`에 둡니다. 새 checkout은 먼저 `make bootstrap`을 실행합니다. 이 target은 `devEngines.packageManager`의 npm release를 checkout 밖에서 `npm exec`로 실행해 `@polyspec/kit`을 포함한 `package-lock.json`을 설치합니다. `make install-tools TOOLS=npm`의 bootstrap은 설치된 kit의 파일이고, 다른 release의 npm은 이 checkout을 거부하기(`EBADDEVENGINES`) 때문입니다. 그다음 mise, `mise.toml`의 Node.js와 그 npm을 `var/tools`에 설치하는 `make install-tools TOOLS=npm`과, 그 npm으로 공유 도구의 package `@polyspec/kit`을 포함한 `package-lock.json`을 설치하는 `make install-packages`를 실행합니다. 그다음 `make install`은 그 Rust toolchain을 rustup으로 설치하고, `mise.lock`의 도구를 `mise install --locked`로 Git이 무시하고 Makefile이 그 shim을 `PATH` 앞에 두는 checkout의 `var/tools/mise`에 설치합니다(`@polyspec/kit`의 설치 도구를 실행하는 `make install-tools`). 기계의 도구는 사용하지도 바꾸지도 않습니다. `make install-tools`는 모든 도구를 선언대로 설치하고, 도구를 실행하는 모든 target이 이에 의존하며, 다른 도구마다 기대 버전과 실제 버전을 밝히며 실패합니다. `GOTOOLCHAIN=local`과 `RUSTUP_AUTO_INSTALL=0`은 실행 중에 go와 rustup이 다른 toolchain을 내려받거나 설치하지 못하게 하고, 모든 cargo 명령은 `--locked`를 사용합니다.

표는 선언된 최소 버전이며 모든 최소 버전에서 테스트했다는 의미는 아닙니다. 실제 버전은 commit을 검증하는 실행의 [기록](validation.ko.md#records)에 기록합니다. JavaScript, Rust, Go, Python은 외부 런타임 라이브러리에 의존하지 않습니다.

<a id="checkout"></a>
## 소스 체크아웃

~~~sh
git clone https://github.com/polyspec/json.git
cd json
~~~

복제본에는 모든 구현 패키지가 포함됩니다. 패키지 디렉터리를 사용하거나, 게시된 패키지가 있으면 그 패키지를 사용합니다. 레지스트리 설치와 게시는 검증되지 않았습니다. [배포](distribution.ko.md)를 확인합니다.

- JavaScript: `make binding-node-addon`이 checkout의 Node addon을 `packages/ts/generated/index.cjs` 옆에 빌드하고, 그 파일이 거기서 addon을 load합니다. 패키지 테스트와 공유 verifier의 probe는 `packages/ts`에서 `@polyspec/json`을 가져옵니다. legacy 패키지 `legacy/packages/js/`는 삭제될 때까지 checkout에 남습니다([전환](../spec/json-contract.ko.md#transition)).
- Rust: `path`가 `packages/rust/`를 지정하는 로컬 Cargo 의존성을 설정합니다.
- Go: `make binding-go-library`가 바인딩 모듈 `packages/go`가 링크하는 static library를 빌드합니다. legacy 패키지 `legacy/packages/go/`(모듈 `github.com/polyspec/ordered-json/packages/go`)는 삭제될 때까지 checkout에 남습니다.
- PHP: 바인딩 확장을 PIE로 설치합니다. `pie install polyspec/json`은 PHP minor와 플랫폼에 맞는 release의 pre-packaged binary를 받습니다([네이티브 PHP](#native-php)).
- Python: `make binding-python-package`가 바인딩의 wheel을 빌드해 venv `var/bindings/venv`에 설치합니다. 사용자는 release의 자기 platform wheel asset을 pip로 설치합니다([릴리스 asset](#release-assets)). legacy 패키지 `legacy/packages/python/`은 삭제될 때까지 checkout에 남습니다.

~~~sh
pip install "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec_json-X.Y.Z-cp314-abi3-macosx_11_0_arm64.whl"
~~~

<a id="release-assets"></a>
## 릴리스 asset

Asset workflow는 native platform마다 non-PHP asset을 한 번 빌드한다. 독립 PHP job은 모든 native platform과 지원 minor 조합을 실행하며 runtime 하나를 선택하고 `make ci-assets-php PHP_MINOR=${{ matrix.php }}`를 실행하며, 그 recipe가 `make release-php-ext PHP=php EXPECTED_PHP_MINOR=$(PHP_MINOR)`를 한 번 호출한다. Release가 `assets-*`를 수집할 때 `assets-${{ matrix.platform }}`과 `assets-php-${{ matrix.platform }}-${{ matrix.php }}` artifact는 구분된다. Source assertion은 이 연결을 검증한다. Binding의 expected-minor gate 공개, release recipe 재생성, native job 통과 전까지 native 선택과 전체 CI는 검증되지 않았다.

v0.0.27부터의 GitHub Release는 바인딩 패키지의 플랫폼별 asset을 담습니다. npm 패키지와 그 플랫폼 패키지, abi3 wheel, 그리고 `packages/php-ext/composer.json`의 PHP 범위 하한부터 `config/toolchain.json`의 `phpExtension.minors`가 적는 PHP minor마다 빌드한 플랫폼별 PHP 확장입니다([이행 기간](../spec/json-contract.ko.md#transition)). v0.0.29부터는 `packages/php-ext`의 Composer package `polyspec/json`인 `polyspec-json-php-ext-X.Y.Z.zip`과 release의 Composer 저장소 `packages.json`도 담습니다. PIE는 그 저장소에서 확장을 설치하고, 자기 플랫폼과 PHP minor의 빌드를 같은 release에서 내려받습니다.

~~~sh
pie repository:add composer https://github.com/polyspec/json/releases/download/vX.Y.Z/packages.json
pie install polyspec/json:X.Y.Z
~~~

아래 세 설치는 macOS arm64에서 v0.0.35에 대해 실행했습니다. 어떤 release도 registry에 게시되지 않으므로 각 설치는 release asset의 URL을 적습니다.

npm(Node.js 26.12.0과 npm 12.2.0으로 실행): 사용자의 `package.json`은 `@polyspec/json`을 그 tarball의 URL로, 각 platform 패키지를 그 자신의 URL로 적습니다. `@polyspec/json`의 manifest는 platform 패키지를 적지 않으므로, platform 패키지가 없으면 `require("@polyspec/json")`은 `Cannot find module './json.darwin-arm64.node'`로 실패합니다. npm은 그 기계의 `os`와 `cpu`에 맞는 platform 패키지만 설치합니다. `require`와 `import` 모두 패키지를 load합니다.

~~~json
{
  "dependencies": {
    "@polyspec/json": "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec-json-X.Y.Z.tgz"
  },
  "optionalDependencies": {
    "@polyspec/json-darwin-arm64": "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec-json-darwin-arm64-X.Y.Z.tgz",
    "@polyspec/json-linux-arm64-gnu": "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec-json-linux-arm64-gnu-X.Y.Z.tgz",
    "@polyspec/json-linux-x64-gnu": "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec-json-linux-x64-gnu-X.Y.Z.tgz"
  }
}
~~~

npm 12는 프로젝트의 `.npmrc`가 허용하지 않으면 URL 의존성을 `EALLOWREMOTE`(`Fetching packages of type "remote" have been disabled`)로 거부합니다.

~~~ini
allow-remote=root
~~~

npm 11 이하와 두 Linux platform 패키지는 확인하지 않았습니다.

Python(Python 3.14.8과 pip 26.2.1로 실행): pip는 platform의 wheel을 URL로 설치하고, 코드는 `polyspec.json`을 import합니다. release에는 `macosx_11_0_arm64`, `manylinux_2_34_aarch64`, `manylinux_2_34_x86_64`의 `cp314-abi3` wheel이 있으며, 사용자는 자기 platform의 URL을 적습니다. 두 `manylinux` wheel과 uv 설치는 확인하지 않았습니다.

~~~sh
pip install "https://github.com/polyspec/json/releases/download/vX.Y.Z/polyspec_json-X.Y.Z-cp314-abi3-macosx_11_0_arm64.whl"
~~~

PIE(PIE 1.4.10으로 실행): 위의 두 명령입니다. release에는 확장의 binary가 여섯 개 있습니다. `arm64-darwin`, `arm64-linux-glibc`, `x86_64-linux-glibc` 각각의 PHP 8.4와 8.5이며 모두 NTS입니다. ZTS, musl, `x86_64-darwin`, Windows의 binary는 없습니다. `make release-pie-check`가 실행하는 `pie download`는 macOS arm64에서 PHP 8.4.27과 PHP 8.5.10의 binary를 받았고 PHP가 각각을 load했습니다. `pie install` 자체와 Linux binary는 확인하지 않았습니다.

v0.0.25까지의 release에는 legacy 패키지의 archive인 `polyspec-ordered-json-X.Y.Z.tgz`, `polyspec-ordered-json-php-X.Y.Z.zip`, `polyspec-ordered-json-php-ext-X.Y.Z.zip`과 wheel `polyspec_ordered_json-X.Y.Z-py3-none-any.whl`이 있었습니다. `legacy/packages/php`가 삭제된 뒤(T3.25-3) json에는 순수 PHP 라이브러리가 없습니다.


이 저장소의 package는 다른 package에 의존하지 않으므로 저장소에는 npm workspaces가 없습니다. 루트의 `package.json`은 checkout에서 설치하도록 `legacy/packages/js/`와 같은 package를 같은 `version`으로 선언하며 `repositories`가 없고, 루트의 `composer.json`은 PHP 테스트를 위해 PHPUnit을 설치하는 비공개 개발 manifest `polyspec/json-development`입니다(T3.25-3). consumer는 저장소 밖에서 이 절이 보이는 대로 release의 asset으로 release를 설치합니다.

<a id="native-php"></a>
## 네이티브 PHP

사용자는 바인딩 확장을 PIE로 설치합니다. PIE는 실행할 PHP의 minor, 플랫폼, 스레드 안전 설정에 맞춰 release가 빌드한 pre-packaged binary를 받습니다([릴리스 asset](#release-assets)이 release의 저장소와 binary를 적습니다).

~~~sh
pie install polyspec/json
~~~

checkout에서는 저장소 루트에서 `PATH`의 PHP에 맞춰 확장의 library를 빌드하고 로드합니다.

~~~sh
make binding-php-ext-library
php -n -d extension="$PWD/target/debug/libpolyspec_json.dylib" script.php
~~~

`script.php`는 확장을 사용하는 임의의 PHP 스크립트이며, Linux에서 library는 `libpolyspec_json.so`입니다. `make binding-php-ext-library`는 테스트가 로드하는 대로 바인딩의 테스트 feature로 빌드하고, `make binding-php-ext-release-library`는 `target/release`에 release library를 빌드합니다. Windows와 ZTS 빌드는 검증되지 않았습니다.

공통 PHP API와 backend 선택 규칙은 [API 계약](api.ko.md#php)에 정의합니다. 네이티브 소스나 PHP 빌드 설정을 변경하면 모듈을 다시 빌드합니다.
