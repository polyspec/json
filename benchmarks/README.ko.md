<!-- doc-id: performance-benchmarks -->
<!-- source-sha256: 6fdc2f715f43cfa53918823da36b4be4273215d67aa4639dd6add5ac51700fab -->
# 성능 벤치마크

`run.mts`는 모든 런타임에서 같은 입력 문서, 워밍업 횟수, 반복 횟수,
샘플 수를 사용해 ordered-json 구현과 일반적인 네이티브 JSON 구현을
비교합니다. Rust는 항상 release 프로필로 실행합니다.

파싱, 직렬화, 파싱 후 직렬화 시간을 측정하고 결과 digest도 확인합니다.
각 측정의 원본 샘플, median, p95, 입력 digest, 빌드 프로필, 런타임
fingerprint와 Git 작업 트리 상태를 `benchmarks/results.json`에 저장합니다.
결과 파일도 커밋하여
측정 이력과 정확한 프로토콜을 저장소에서 확인할 수 있게 합니다.

Rust 표준 라이브러리에는 JSON 파서가 없으므로 네이티브 비교 기준은
사실상 표준인 `serde_json`입니다. JavaScript, Go, PHP는 각 런타임의
네이티브 JSON API를 사용합니다. PHP는 순수 PHP 구현과 네이티브 확장도
별도로 측정합니다.

네이티브 측정값은 동등한 동작이라고 주장하는 값이 아니라 별도의 기준값입니다.
일반적인 네이티브 API는 객체 순서나 정확한 숫자 토큰을 보존하지 않습니다.
ordered-json 구현체끼리는 출력 digest가 일치해야 하며, 이러한 의도적인
동작 차이로 네이티브 출력 digest는 달라질 수 있습니다.

각 측정은 선언된 반복 횟수 이상, 그리고 선언된 시간 이상 워밍업합니다.
프로세스는 일정 시간 일하기 전까지 정상 속도에 이르지 못하는데, 횟수로만
정의한 워밍업은 작은 입력에서 수 마이크로초 만에 끝납니다. 그 결과 프로세스가
먼저 측정한 fixture는 나중에 측정한 같은 fixture보다 1.5~1.7배 느리게 나왔으며,
ordered-json뿐 아니라 네이티브 기준값에서도 같았습니다. fixture 순서를 뒤집으면
느려지는 대상도 fixture가 아니라 위치를 따라 옮겨갔습니다.

`workload.json`은 fixture의 입력 digest, 바이트 수, 노드 수, scalar 수,
최대 깊이, 워밍업 횟수와 시간, 반복 횟수, 샘플 수, 회귀 허용오차를 정의하는
기준입니다.
실행기는 입력 변경, 구현체 행 누락·중복, 잘못 보고된 입력 바이트 수,
파싱한 fixture와 일치하지 않는 workload 구조 메타데이터를 거부합니다.
네이티브 직렬화가 달라질 수 있으므로 출력 바이트 수는 측정 결과로
기록합니다.

나노초 값은 다른 컴퓨터에서 동일할 수 없습니다. 커밋된 결과와 환경
fingerprint가 일치할 때만 비교할 수 있습니다. 같은 환경에서는 median 증가
10%와 p95 증가 30%까지 허용합니다. 각 ordered-json 구현과 metric별로
fixture 비율의 median을 사용하므로 작은 fixture 하나의 타이머 노이즈를
회귀로 판정하지 않습니다. 다른 환경은 `not-comparable`로 기록합니다.
`--check`를 사용하지 않으면 실행 결과를 현재 결과 파일에 저장합니다.
비교 가능한 실행이 허용오차를 초과하면 커밋된 기준을 보존하고 실패한
측정값을 `.cache/benchmark.current.json`에 저장합니다. 해당 측정값을 검토한
뒤에만 `--update-baseline`으로 기준을 갱신하며, 명시적인 기준 갱신은
`baseline-updated`로 기록합니다.

저장소 루트에서 다음처럼 실행합니다.

~~~sh
make benchmark
node benchmarks/run.mts --check
node benchmarks/run.mts --update-baseline
node benchmarks/run.mts --iterations 10000 --warmup 1000 --samples 9
~~~

<a id="python-parse"></a>
## Python parse 비율

`make python-parse-budget`(`python-parse/run.py`)는 member 여덟 개짜리 평평한 객체 50,000개를 생성한 문서 하나(6.15 MB)를
Python 패키지와 순수 PHP 패키지로 각자의 process에서 번갈아 세 번씩 parse합니다. 각 process는 자기 parse의 CPU 시간을
보고하므로 기계의 부하는 양쪽을 똑같이 느리게 하며, wall-clock 예산은 없습니다. 검사는 모든 실행, 두 중앙값과 그 비율을
출력하고, Python 중앙값이 PHP 중앙값의 세 배를 넘으면 실패합니다. `make check`의 target이 아니며, Python parser를 바꾼 뒤
사람이 실행합니다.

<a id="host-cost"></a>
## 바인딩을 위한 변환의 비용

`make benchmark-host`(`host-cost.mts`, Rust 패키지의 `examples/host_cost.rs`를 release profile로 실행합니다)는 RQ-036의
변환인 `value_out`과 `value_in`을, 문자열을 Rust `String`으로 주고받는 같은 순회와 견주어 측정합니다. 문서는 큰 문자열
하나짜리와 작은 문자열 100,000개짜리이고, 방향은 out, UTF-8의 out과 in, UTF-8의 in, UTF-16의 in 네 가지입니다. 각 시간은
세지 않는 실행 한 번 뒤 21번 실행의 중앙값입니다. example은 측정마다 JSON 한 줄을 출력하고, script는 각 줄을 그 순간
기계의 load average와 함께 읽어 Git이 무시하는 `var/report/bench/host-cost-rust.json`을 rename 한 번으로 씁니다. 기록은
측정마다 항목 하나를 가진 list입니다. 항목은 `language`, `document`, `direction`, `runs`, `host_ms`, `text_ms`,
`ratio`(`host_ms`를 `text_ms`로 나눈 값), `load_average`(1분, 5분, 15분 평균)를 가집니다.

비율은 측정을 실패시키지 않습니다. 한도 1.5를 넘는 비율은 값과 한도를 담은 `WARNING` 줄을 출력하고 target은 통과합니다.
script는 사용법 오류, 실패한 명령, 측정이 아닌 줄, 측정이 없는 실행에서만 실패합니다. 기계에 부하가 있을 때의 측정은 최종
결과가 아니므로 비율마다 load average를 함께 읽습니다. `make check`의 target이 아닙니다.
