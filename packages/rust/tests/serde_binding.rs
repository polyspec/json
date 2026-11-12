//! The Serde integration of `Value`: `serde_json` writes and reads values with their contract bytes, in a structure too.
mod common;

use common::{text, valid};
use polyspec_ordered_json::Value;
use serde::{Deserialize, Serialize};

// Requirements: RQ-020
#[test]
fn host_serialization_boundary() {
    // The Serde traits are the host interface: a value is written with its contract bytes, in order and with its tokens.
    let value = valid(r#"{"b":1.50,"a":[2,{"d":3,"c":4}]}"#);
    assert_eq!(
        serde_json::to_string(&value).unwrap(),
        r#"{"b":1.50,"a":[2,{"d":3,"c":4}]}"#
    );
}

#[derive(Debug, Serialize, Deserialize)]
struct RawWire {
    call: String,
    props: Option<Value>,
    keys: Value,
}

// Requirements: RQ-001, RQ-010, RQ-020
#[test]
fn serde_embedded_values_preserve_order_and_number_tokens() {
    let raw = r#"{"z":123456789012345678901234567890.123456789,"a":[{"b":2,"a":"한"}]}"#;
    let value = RawWire {
        call: "view".into(),
        props: Some(valid(raw)),
        keys: valid(r#"{"second":2,"first":1}"#),
    };
    let expected = format!(r#"{{"call":"view","props":{raw},"keys":{{"second":2,"first":1}}}}"#);
    assert_eq!(serde_json::to_string(&value).unwrap(), expected);
    let decoded: RawWire = serde_json::from_str(&expected).unwrap();
    assert_eq!(text(&decoded.props.unwrap()), raw);
    assert_eq!(text(&decoded.keys), r#"{"second":2,"first":1}"#);
}

// Requirements: RQ-009, RQ-020
#[test]
fn serde_value_preserves_unpaired_surrogate_token() {
    let source = r#"{"k":"a\ud800b"}"#;
    let value: Value = serde_json::from_str(source).unwrap();
    assert_eq!(text(&value), source);
    assert_eq!(serde_json::to_string(&value).unwrap(), source);
}
