<!-- doc-id: rebuild-json-go -->
<!-- source-sha256: 7c07f4ba393a836780e29c0131101a6646617ae673d38c452849306906435899 -->
# 재구현 기록: Go JSON parser

[English](json-go.md)

판정: **맞는 도구 없음.** Go package는 자체 parser를 유지합니다. 2026-10-20에 측정했습니다.

## 대상

- `legacy/packages/go/orderedjson.go`

## 요구사항

parser는 문서를 손실 없는 순서 값으로 읽습니다: 모든 깊이의 key 순서, 반복된 key의 첫 위치와 마지막 값, 모든 number
token의 표기, `{}`와 `[]`의 구분, 첫 잘못된 byte의 byte offset과 공통 목록의 kind로 하는 거부, 256의 nesting 한도
(`docs/spec/json-contract.md`의 RQ-001부터 RQ-024).

## 평가한 도구

| 도구 | 결과 |
|---|---|
| encoding/json의 `Decoder.Token`과 `UseNumber` | `examples/official.json`과 `contracts/fixtures`의 102 of 115 case(받아들인 tree 또는 거부)가 성립합니다 |

| 요구사항 | 실패 이유 | 실패한 case |
|---|---|---|
| RQ-009 | 이스케이프된 짝 없는 surrogate가 U+FFFD가 됩니다 | `official/escaped-surrogates`, `official/unicode-key-overwrite`, `valid/lone-high-surrogate.json`, `valid/lone-low-surrogate.json`, `valid/mixed-surrogates.json`, `valid/surrogate-key.json` |
| RQ-007 | 잘못된 UTF-8을 거부하지 않고 대체합니다(reader 앞의 `utf8.Valid` 검사로 이것만은 해결됩니다) | `invalid/continuation-utf8.json`, `invalid/invalid-utf8.json`, `invalid/out-of-range-utf8.json`, `invalid/overlong-utf8.json`, `invalid/surrogate-utf8.json`, `invalid/truncated-utf8.json` |
| RQ-006 | 256의 nesting 한도가 없습니다 | `invalid/depth-exceeded.json` is accepted |
| RQ-004, RQ-005 | offset이 56개 거부 중 32개에서만 contract offset과 같고 공통 kind가 없습니다 | the other 24 rejections |

## 맞는 도구가 없는 이유

생태계의 표준 reader는 native 값으로 decode하도록 만들어져 위의 offset, kind, 한도, 표기를 줄 수 없습니다. 유효한
문서에는 그것을 감싸고 오류에는 자체 scanner를 두면 하나의 contract 뒤에 parser가 둘이 됩니다.

## 재시도 조건

reader가 첫 잘못된 byte의 byte offset을 보고하고 token 표기를 보존할 때 다시 검토합니다.
