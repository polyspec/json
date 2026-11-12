mod common;

use common::text;
use polyspec_ordered_json::{parse, Error, ParseOptions};

const STRICT: ParseOptions = ParseOptions {
    max_depth: None,
    reject_duplicates: Some(true),
};

// Requirements: RQ-017, RQ-035
#[test]
fn strict_parse_rejects_duplicate_keys() {
    for source in [
        r#"{"a":1,"a":2}"#,
        r#"{"a":1,"\u0061":2}"#,
        r#"{"nested":{"a":1,"a":2}}"#,
        r#"[{"a":1,"a":2}]"#,
        r#"{"\ud800":1,"\ud800":2}"#,
    ] {
        assert!(parse(source.as_bytes(), &ParseOptions::default()).is_ok());
        let error = parse(source.as_bytes(), &STRICT).unwrap_err();
        let offset = u64::try_from(source.rfind(",\"").unwrap() + 1).unwrap();
        assert_eq!(error, Error::DuplicateObjectKey { offset }, "{source}");
        assert_eq!(error.message(), "duplicate object key");
    }
}

// Requirements: RQ-017
#[test]
fn strict_parse_accepts_unique_keys() {
    let source = br#"{"a":1,"nested":[{"b":2}],"state":null}"#;
    let parsed = parse(source, &STRICT).unwrap();
    assert_eq!(text(&parsed).as_bytes(), source);
    assert_eq!(
        parse(&[0xff], &STRICT).unwrap_err(),
        Error::InvalidUtf8 { offset: 0 }
    );
}
