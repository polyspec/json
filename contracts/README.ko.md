<!-- doc-id: contracts-readme -->
<!-- source-sha256: caf9f9f48958fe392fb9bfa93995a47a47f9053ec41b6a610464d144f9385039 -->
# 계약

[English](README.md)

[`core.json`](core.json)은 Rust 코어와 바인딩의 case를 binding의 case 규약(G-5)으로 담는다.
`packages/rust/interface.json`의 member 이름을 가진 group은 그 계약의 `cases`에 연결된다. `<member>.<corpus>` group은 그
member의 case를 더 담고, 코어의 Rust 시험은 각각을 그 member의 case로 실행한다:

- `.fixtures`: [`fixtures/valid`](fixtures/valid)와 [`fixtures/invalid`](fixtures/invalid)의 각 파일을 `source`로 담는다
  (텍스트, 또는 UTF-8 텍스트가 아니거나 byte order mark로 시작하는 바이트는 `{"hex"}`). 유효한 입력은 `stringify`의 case이기도
  하며, 그 텍스트는 독립 참조(`scripts/reference.mts`)의 compact 텍스트다.
- `.official`: [`examples/official.json`](../examples/official.json)의 각 예제를 compact 텍스트를 가진 `stringify`의 case로
  담는다.
- `.arguments`: [`fixtures/arguments.json`](fixtures/arguments.json)의 case 가운데 기본 group에 없는 것.
- `.api`: `legacy/` 아래 언어 패키지 시험의 동작.
- `.parsed`: 수신자나 값이 binding GN-13f의 instance value `{"new": "parse", ...}`인 case.
- `.chained`: 수신자가 `value.get`이나 `value.get_units`가 찾는 member인 case.

`tests/scripts/case-corpus.test.mts`는 case가 없는 fixture, 공식 예제, argument case를 실패시킨다. `.chained`
group을 빼고 모든 group이 인터페이스 계약의 `cases`에 연결된다: `value.get`과 `value.get_units`의 결과는 optional이고, binding은
class를 반환하는 member에서만 수신자를 만들므로(GN-13f), 그 group은 코어의 Rust 시험만 실행한다.
[`fixtures/`](fixtures)는 검증기의 공유 case도 담는다([AGENTS.md](../AGENTS.ko.md#implementations)).
