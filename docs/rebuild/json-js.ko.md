<!-- doc-id: rebuild-json-js -->
<!-- source-sha256: 0b84629a41e3fab489db00e7bb7bc48f2ba03183e55c8045405ada566352c566 -->
# 재구현 기록: JavaScript JSON parser

[English](json-js.md)

판정: **맞는 도구 없음.** JavaScript package는 자체 parser를 유지합니다. 2026-10-20에 측정했습니다.

## 대상

- `legacy/packages/js/index.js`

## 요구사항

parser는 문서를 손실 없는 순서 값으로 읽습니다: 모든 깊이의 key 순서, 반복된 key의 첫 위치와 마지막 값, 모든 number
token의 표기, `{}`와 `[]`의 구분, 첫 잘못된 byte의 byte offset과 공통 목록의 kind로 하는 거부, 256의 nesting 한도
(`docs/spec/json-contract.md`의 RQ-001부터 RQ-024).

## 평가한 도구

| 도구 | 결과 |
|---|---|
| JSON.parse와 reviver(`context.source`), Node.js 26.11 | `examples/official.json`과 `contracts/fixtures`의 106 of 115 case(받아들인 tree 또는 거부)가 성립합니다 |

| 요구사항 | 실패 이유 | 실패한 case |
|---|---|---|
| RQ-001 | 정수 모양의 key는 reviver가 보기 전에 순서가 바뀝니다 | `official/document-order`, `official/nested-objects`, `official/objects-in-arrays`, `official/whitespace`, `official/nested-duplicate-keys`, `official/numeric-key-overwrite`, `valid/nested-order.json`, `valid/numeric-keys.json` |
| RQ-006 | 256의 nesting 한도가 없습니다 | `invalid/depth-exceeded.json` is accepted |
| RQ-004, RQ-005 | 오류는 message 안의 문자 위치만 가지며 공통 kind가 없습니다 | every rejection |
| RQ-018 | `context.source`는 primitive에만 있어서 container의 source 구간이 없습니다 | the raw span of a nested value |

## 맞는 도구가 없는 이유

생태계의 표준 reader는 native 값으로 decode하도록 만들어져 위의 offset, kind, 한도, 표기를 줄 수 없습니다. 유효한
문서에는 그것을 감싸고 오류에는 자체 scanner를 두면 하나의 contract 뒤에 parser가 둘이 됩니다.

## 재시도 조건

reader가 첫 잘못된 byte의 byte offset을 보고하고 token 표기를 보존할 때 다시 검토합니다.
