<!-- doc-id: contracts-readme -->
<!-- source-sha256: 9735e61293e2e29ee9f5984d9d57f5708f2feeaeff8be043b0ee7ebc7e1959e1 -->
# 계약

[English](README.md)

[`core.json`](core.json)은 Rust 코어와 바인딩의 case를 담는다: `packages/rust/interface.json`의 member 이름을 가진 group은 그
계약의 `cases`에 연결되고 binding의 case 규약(G-5)을 따른다. 이름이 `.parsed`로 끝나는 group은 코어의 Rust 시험만 읽는
규칙 corpus다: 값은 JSON 텍스트 `json`에서 오고, 인터페이스 계약의 `cases`에 연결되지 않는다.
[`fixtures/`](fixtures)는 검증기의 공유 case를 담는다([AGENTS.md](../AGENTS.ko.md#implementations)).
