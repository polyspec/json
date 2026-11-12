<!-- doc-id: rebuild-json-python -->
<!-- source-sha256: c8cd18b101c8a5c7db78519c65a4807e9aa8a9254105d8a53cdec8214065cb2f -->
# 재구현 기록: Python JSON parser

[English](json-python.md)

판정: **맞는 도구 없음.** Python package는 자체 parser를 유지합니다. 2026-10-20에 측정했습니다.

## 대상

- `legacy/packages/python/src/polyspec/ordered_json/__init__.py`

## 요구사항

parser는 문서를 손실 없는 순서 값으로 읽습니다: 모든 깊이의 key 순서, 반복된 key의 첫 위치와 마지막 값, 모든 number
token의 표기, `{}`와 `[]`의 구분, 첫 잘못된 byte의 byte offset과 공통 목록의 kind로 하는 거부, 256의 nesting 한도
(`docs/spec/json-contract.md`의 RQ-001부터 RQ-024).

## 평가한 도구

| 도구 | 결과 |
|---|---|
| `json.loads`와 `object_pairs_hook`, `parse_int`, `parse_float`, `parse_constant` | `examples/official.json`과 `contracts/fixtures`의 114 of 115 case(받아들인 tree 또는 거부)가 성립합니다 |

| 요구사항 | 실패 이유 | 실패한 case |
|---|---|---|
| RQ-006 | 256의 nesting 한도가 없고 깊이 100000에서 `RecursionError`가 납니다 | `invalid/depth-exceeded.json` is accepted |
| RQ-004 | `JSONDecodeError.pos`는 문자 offset이며 62개 거부 중 39개에서만 contract의 byte offset과 같습니다 | `invalid/array-trailing-comma.json`, `invalid/bare-minus.json`, `invalid/exponent-no-digit.json`, `invalid/invalid-escape.json`, `invalid/invalid-u-hex.json` and 18 more |
| RQ-005 | 오류가 공통 kind를 말하지 않습니다 | every rejection |
| RQ-018 | 중첩된 값의 구간이 없습니다 | the raw span of a nested value |

## 맞는 도구가 없는 이유

생태계의 표준 reader는 native 값으로 decode하도록 만들어져 위의 offset, kind, 한도, 표기를 줄 수 없습니다. 유효한
문서에는 그것을 감싸고 오류에는 자체 scanner를 두면 하나의 contract 뒤에 parser가 둘이 됩니다.

## 재시도 조건

reader가 첫 잘못된 byte의 byte offset을 보고하고 token 표기를 보존할 때 다시 검토합니다.
