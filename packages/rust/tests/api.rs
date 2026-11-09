//! Package tests for the Rust value API. The shared cases exercise the JSON
//! contract through the adapter; constructor arguments, map building, UTF-16
//! units and wrong-kind access are reachable only from here.
use polyspec_ordered_json::{
    parse, parse_bytes, parse_with_max_depth, stringify, Kind, OrderedMap, Value, MAX_DEPTH,
};

// Requirements: RQ-006
#[test]
fn depth_argument_is_bounded() {
    let error = parse_with_max_depth("[]", MAX_DEPTH + 1).unwrap_err();
    assert_eq!(error.message(), "max_depth exceeds 256");
    assert_eq!(error.offset, 0);
}

// Requirements: RQ-006
#[test]
fn depth_limit_is_enforced() {
    assert!(parse_with_max_depth("[[1]]", 2).is_ok());
    let shallow = parse_with_max_depth("[[1]]", 1).unwrap_err();
    assert_eq!(shallow.message(), "maximum nesting depth exceeded");
}

// Requirements: RQ-007
#[test]
fn bytes_input_is_validated() {
    let error = parse_bytes(b"[\"\xff\"]").unwrap_err();
    assert_eq!(error.message(), "invalid UTF-8");
    assert_eq!(error.offset, 2);
    assert_eq!(
        parse_bytes("[\"\u{d55c}\"]".as_bytes()).unwrap().compact(),
        "[\"한\"]"
    );
}

// Requirements: RQ-005
#[test]
fn rejection_names_its_kind() {
    // The wording is Rust's own; the kind is the shared contract.
    for (document, kind) in [
        ("[1,]", "expected_value"),
        ("{1:2}", "expected_object_key"),
        ("[1.]", "expected_digit"),
        ("\"a\u{1}b\"", "unescaped_control_character"),
        ("[1] x", "trailing_input"),
    ] {
        let error = parse(document).unwrap_err();
        assert_eq!(
            error.kind().as_str(),
            kind,
            "{document}: {}",
            error.message()
        );
    }
}

// Requirements: RQ-004, RQ-007
#[test]
fn invalid_utf8_reports_the_first_bad_byte() {
    // The bad byte sits at index 2 of ["<bad>"]; the error names that position.
    let error = parse_bytes(b"[\"\xff\"]").unwrap_err();
    assert_eq!(error.message(), "invalid UTF-8");
    assert_eq!(error.offset, 2);
}

// Requirements: RQ-007
#[test]
fn utf8_validation_holds_for_long_multibyte_text() {
    let text = "\u{d55c}\u{1f30d}".repeat(64);
    let value = parse_bytes(format!("{{\"key\":\"{text}\"}}").as_bytes()).unwrap();
    assert_eq!(
        value.get("key").unwrap().string_value().unwrap(),
        text.as_bytes()
    );
    let error = parse_bytes(b"[\"\xff\"]").unwrap_err();
    assert_eq!(error.message(), "invalid UTF-8");
    assert_eq!(error.offset, 2);
}

// Requirements: RQ-004
#[test]
fn parse_errors_report_offsets() {
    let error = parse("[1,]").unwrap_err();
    assert_eq!(error.offset, 3);
    assert_eq!(error.to_string(), "expected JSON value at byte 3");
}

// Requirements: RQ-016
#[test]
fn ordered_map_rejects_non_string_key() {
    let mut members = OrderedMap::new();
    let error = members
        .insert(Value::number("1").unwrap(), Value::null())
        .unwrap_err();
    assert_eq!(error.message(), "object key must be a string");
    assert!(members.is_empty());
}

// Requirements: RQ-001
#[test]
fn repeated_key_keeps_first_position_and_last_value() {
    let mut members = OrderedMap::new();
    members
        .insert(Value::string("a"), Value::number("1").unwrap())
        .unwrap();
    members
        .insert(Value::string("b"), Value::number("2").unwrap())
        .unwrap();
    let replaced = members
        .insert(Value::string("a"), Value::number("3").unwrap())
        .unwrap();
    assert_eq!(replaced.map(|value| value.compact()), Some("1".to_owned()));
    assert_eq!(members.len(), 2);
    let listed: Vec<String> = members
        .iter()
        .map(|(key, value)| format!("{}:{}", key.compact(), value.compact()))
        .collect();
    assert_eq!(listed, vec!["\"a\":3".to_owned(), "\"b\":2".to_owned()]);
    assert_eq!(
        Value::object(&members).unwrap().compact(),
        "{\"a\":3,\"b\":2}"
    );
}

// Requirements: RQ-002, RQ-019
#[test]
fn member_lookup_uses_decoded_names() {
    let value = parse("{\"a\\u00e9\":1,\"b\":2}").unwrap();
    assert_eq!(
        value.get("aé").map(|child| child.compact()),
        Some("1".to_owned())
    );
    assert!(value.get("missing").is_none());
    assert_eq!(
        value.get_units(&[0x62]).map(|child| child.compact()),
        Some("2".to_owned())
    );
    assert!(value.get_units(&[0x63]).is_none());
}

// Requirements: RQ-009
#[test]
fn unpaired_surrogate_stays_in_units() {
    let lone = Value::from_units(&[0x61, 0xd800]);
    assert_eq!(lone.compact(), "\"a\\ud800\"");
    assert_eq!(lone.string_units(), Some(&[0x61u16, 0xd800][..]));
    assert_eq!(lone.string_value().unwrap(), b"a\xed\xa0\x80");
}

// Requirements: RQ-009
#[test]
fn surrogate_pair_decodes() {
    let pair = parse("\"\\ud83c\\udf0d\"").unwrap();
    assert_eq!(pair.string_units(), Some(&[0xd83cu16, 0xdf0d][..]));
    assert_eq!(pair.string_value().unwrap(), "🌍".as_bytes());
}

// Requirements: RQ-015
#[test]
fn factories_validate_arguments() {
    assert_eq!(
        Value::number(" 1").unwrap_err().message(),
        "expected a number literal without whitespace"
    );
    assert_eq!(
        Value::number("x").unwrap_err().message(),
        "expected JSON value"
    );
    assert_eq!(
        Value::array(&[Value::boolean(true), Value::null()])
            .unwrap()
            .compact(),
        "[true,null]"
    );
    assert_eq!(Value::string("\"q\"").compact(), "\"\\\"q\\\"\"");
    assert_eq!(Value::object(&OrderedMap::new()).unwrap().compact(), "{}");
}

// Requirements: RQ-014
#[test]
fn wrong_kind_access_is_reported() {
    let array = parse("[1]").unwrap();
    let object = parse("{\"a\":1}").unwrap();
    assert!(array.members().is_none());
    assert!(object.items().is_none());
    assert_eq!(object.number_literal(), None);
    assert_eq!(parse("null").unwrap().boolean_value(), None);
    assert!(parse("1").unwrap().string_units().is_none());
    assert_eq!(array.kind(), Kind::Array);
    assert_eq!(object.kind(), Kind::Object);
}

// Requirements: RQ-018
#[test]
fn root_keeps_surrounding_text() {
    let value = parse("  [1] \n").unwrap();
    assert_eq!(value.raw(), "  [1] \n");
    assert_eq!(value.compact(), "[1]");
    assert_eq!(stringify(&value), value.compact());
    assert_eq!(value.items().unwrap()[0].raw(), "1");
}

#[test]
fn public_api_exports_the_entry_points() {
    // RQ-023: the parse, serialization, factory and accessor functions are exported.
    let built = Value::object(&{
        let mut members = OrderedMap::new();
        members
            .insert(
                Value::string("a"),
                Value::array(&[
                    Value::string("x"),
                    Value::number("1").unwrap(),
                    Value::boolean(true),
                    Value::null(),
                ])
                .unwrap(),
            )
            .unwrap();
        members
    })
    .unwrap();
    assert_eq!(stringify(&built), "{\"a\":[\"x\",1,true,null]}");
    let parsed = parse(&stringify(&built)).unwrap();
    let items = parsed.members().unwrap().get("a").unwrap().items().unwrap();
    let kinds: Vec<Kind> = items.iter().map(Value::kind).collect();
    assert_eq!(
        kinds,
        [Kind::String, Kind::Number, Kind::Boolean, Kind::Null]
    );
    assert_eq!(items[0].string_value().unwrap(), b"x");
    assert_eq!(items[1].number_literal(), Some("1"));
    assert_eq!(items[2].boolean_value(), Some(true));
    assert_eq!(parse_bytes(b"[]").unwrap().compact(), "[]");
}

#[test]
fn parse_error_exposes_kind_offset_and_message() {
    // RQ-024: a parse error exposes its kind, its offset and its message.
    let error = parse("[1,]").unwrap_err();
    assert_eq!(error.kind().as_str(), "expected_value");
    assert_eq!(error.offset, 3);
    assert_eq!(error.message(), "expected JSON value");
}

// Requirements: RQ-012
#[test]
fn values_come_only_from_the_library() {
    // A Value has private fields and no public constructor besides the parser and the factories, and each of them validates,
    // so a rejected input yields an error and never a Value.
    assert!(parse("[1,]").is_err());
    assert!(parse_bytes(b"\xff").is_err());
    assert!(Value::number("x").is_err());
    assert!(Value::number(" 1").is_err());
    assert_eq!(Value::null().compact(), "null");
    assert_eq!(Value::string("a").compact(), "\"a\"");
    assert_eq!(Value::boolean(false).compact(), "false");
    assert_eq!(Value::from_units(&[0x61]).compact(), "\"a\"");
    assert_eq!(parse("[1]").unwrap().compact(), "[1]");
}

// Requirements: RQ-013
#[test]
fn returned_collections_are_immutable() {
    // members() and items() return shared references, which allow no change; a changed copy leaves the value as it was.
    let value = parse("{\"a\":[1,2]}").unwrap();
    let members: &OrderedMap = value.members().unwrap();
    let mut copy = members.clone();
    copy.insert(Value::string("b"), Value::null()).unwrap();
    assert_eq!(copy.len(), 2);
    assert_eq!(value.members().unwrap().len(), 1);
    let items: &[Value] = value.members().unwrap().get("a").unwrap().items().unwrap();
    assert_eq!(items.len(), 2);
    assert_eq!(stringify(&value), "{\"a\":[1,2]}");
}

// Requirements: RQ-009
#[test]
fn string_value_keeps_an_unpaired_surrogate() {
    // The string value is the library form: UTF-8 with an unpaired surrogate as WTF-8, never replaced by U+FFFD.
    let lone = parse("\"a\\ud800\"").unwrap();
    assert_eq!(lone.string_value().unwrap(), b"a\xed\xa0\x80");
    assert_eq!(lone.string_units(), Some(&[0x61u16, 0xd800][..]));
    assert_eq!(
        parse("\"\\ud83c\\udf0d\"").unwrap().string_value().unwrap(),
        "\u{1f30d}".as_bytes()
    );
}

// Requirements: RQ-008
#[test]
fn text_input_rejects_lone_surrogates() {
    // A literal unpaired surrogate has only its WTF-8 encoding in UTF-8 text, which is no UTF-8: it is rejected before the
    // grammar is read, at the byte of the surrogate.
    for source in [
        &b"[\"\xed\xa0\x80\"]"[..],
        b"[\"\xed\xb0\x80\"]",
        b"{\"\xed\xa0\x80\":1}",
        b"[\"\xed\xa0\x80",
    ] {
        let error = parse_bytes(source).unwrap_err();
        assert_eq!(error.message(), "invalid UTF-8", "{source:?}");
        assert_eq!(error.offset, 2, "{source:?}");
    }
}

// Requirements: RQ-003
#[test]
fn arrays_and_objects_stay_distinct() {
    let array = parse("[3,1,2]").unwrap();
    let numbers: Vec<&str> = array
        .items()
        .unwrap()
        .iter()
        .map(|item| item.number_literal().unwrap())
        .collect();
    assert_eq!(numbers, ["3", "1", "2"]);
    assert_eq!(parse("[]").unwrap().kind(), Kind::Array);
    assert_eq!(parse("{}").unwrap().kind(), Kind::Object);
    let text = r#"{"a":[],"b":{},"c":[{}]}"#;
    assert_eq!(stringify(&parse(text).unwrap()), text);
}

// Requirements: RQ-010
#[test]
fn number_tokens_are_kept_exactly() {
    let tokens = [
        "1.0e+2",
        "-0",
        "0.10",
        "123456789012345678901234567890",
        "1E400",
    ];
    let value = parse(&format!("[{}]", tokens.join(","))).unwrap();
    let kept: Vec<&str> = value
        .items()
        .unwrap()
        .iter()
        .map(|item| item.number_literal().unwrap())
        .collect();
    assert_eq!(kept, tokens);
    for (source, kind) in [
        ("NaN", "expected_value"),
        ("Infinity", "expected_value"),
        ("-Infinity", "expected_digit"),
        ("[NaN]", "expected_value"),
    ] {
        assert_eq!(parse(source).unwrap_err().kind().as_str(), kind, "{source}");
    }
}

// Requirements: RQ-011
#[test]
fn serialization_is_idempotent() {
    let once = stringify(&parse(" { \"b\" : 1 , \"a\" : 2 , \"b\" : 3 } ").unwrap());
    assert_eq!(once, r#"{"b":3,"a":2}"#);
    assert_eq!(stringify(&parse(&once).unwrap()), once);
}
