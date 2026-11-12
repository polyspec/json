<!-- doc-id: rebuild-json-php -->
<!-- source-sha256: 19cea7f4a08cd59094243455dd90c90f75644377693158c5dfb57434bb6e85aa -->
# 재구현 기록: PHP JSON parser

[English](json-php.md)

판정: **맞는 도구 없음.** PHP package는 자체 parser를 유지합니다. 2026-10-20에 측정했습니다.

## 대상

- `legacy/packages/php/src/Value.php`

## 요구사항

parser는 문서를 손실 없는 순서 값으로 읽습니다: 모든 깊이의 key 순서, 반복된 key의 첫 위치와 마지막 값, 모든 number
token의 표기, `{}`와 `[]`의 구분, 첫 잘못된 byte의 byte offset과 공통 목록의 kind로 하는 거부, 256의 nesting 한도
(`docs/spec/json-contract.md`의 RQ-001부터 RQ-024).

## 평가한 도구

| 도구 | 결과 |
|---|---|
| object mode의 `json_decode`(`JSON_THROW_ON_ERROR`) | `examples/official.json`과 `contracts/fixtures`의 99 of 115 case(받아들인 tree 또는 거부)가 성립합니다 |

| 요구사항 | 실패 이유 | 실패한 case |
|---|---|---|
| RQ-010 | 숫자가 int나 float이 되어 token 표기가 사라집니다 | `official/exact-number-tokens`, `valid/decimal.json`, `valid/exponent.json`, `valid/huge-exponent.json`, `valid/huge-integer.json`, `valid/negative-zero.json`, `valid/scalar-whitespace.json`, `valid/tiny-exponent.json` |
| RQ-008, RQ-009 | 이스케이프된 짝 없는 surrogate를 거부합니다 | `official/escaped-surrogates`, `official/unicode-key-overwrite`, `valid/lone-high-surrogate.json`, `valid/lone-low-surrogate.json`, `valid/mixed-surrogates.json`, `valid/surrogate-key.json` |
| RQ-002 | object mode는 속성 이름 "\u0000"을 거부하고 assoc mode는 `{}`와 `[]`를 같은 array로 만듭니다(RQ-003) | `official/empty-and-null-key-overwrite` |
| RQ-006 | 256의 nesting 한도가 없습니다 | `invalid/depth-exceeded.json` is accepted |
| RQ-004, RQ-005 | offset이 없고 kind는 오류 code로만 있습니다 | every rejection |

## 맞는 도구가 없는 이유

생태계의 표준 reader는 native 값으로 decode하도록 만들어져 위의 offset, kind, 한도, 표기를 줄 수 없습니다. 유효한
문서에는 그것을 감싸고 오류에는 자체 scanner를 두면 하나의 contract 뒤에 parser가 둘이 됩니다.

## 재시도 조건

reader가 첫 잘못된 byte의 byte offset을 보고하고 token 표기를 보존할 때 다시 검토합니다.
