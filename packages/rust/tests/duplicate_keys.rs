use polyspec_ordered_json::{parse_bytes, parse_bytes_reject_duplicates, ErrorKind};

// Requirements: RQ-017
#[test]
fn strict_parse_rejects_duplicate_keys() {
    for source in [
        r#"{"a":1,"a":2}"#,
        r#"{"a":1,"\u0061":2}"#,
        r#"{"nested":{"a":1,"a":2}}"#,
        r#"[{"a":1,"a":2}]"#,
        r#"{"\ud800":1,"\ud800":2}"#,
    ] {
        assert!(parse_bytes(source.as_bytes()).is_ok());
        let error = parse_bytes_reject_duplicates(source.as_bytes()).unwrap_err();
        assert_eq!(error.message(), "duplicate object key", "{source}");
        assert_eq!(error.kind(), ErrorKind::DuplicateObjectKey, "{source}");
        assert_eq!(error.offset, source.rfind(",\"").unwrap() + 1, "{source}");
    }
}

// Requirements: RQ-017
#[test]
fn strict_parse_accepts_unique_keys() {
    let source = br#"{"a":1,"nested":[{"b":2}],"state":null}"#;
    let parsed = parse_bytes_reject_duplicates(source).unwrap();
    assert_eq!(parsed.compact().as_bytes(), source);
    let error = parse_bytes_reject_duplicates(&[0xff]).unwrap_err();
    assert_eq!(error.message(), "invalid UTF-8");
    assert_eq!(error.offset, 0);
}
