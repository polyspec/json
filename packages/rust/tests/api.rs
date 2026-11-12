//! Package tests for the Rust value API: constructor arguments, map building, UTF-16 units and wrong-kind access.
mod common;

use common::{json, text, units, valid};
use polyspec_ordered_json::{
    parse, stringify, Error, Kind, OrderedMap, ParseOptions, StringifyOptions, Value, MAX_DEPTH,
};

// Requirements: RQ-006, RQ-035
#[test]
fn depth_argument_is_bounded() {
    let options = ParseOptions {
        max_depth: Some(MAX_DEPTH + 1),
        ..ParseOptions::default()
    };
    let error = parse(b"[]", &options).unwrap_err();
    assert_eq!(error, Error::DepthLimitOutOfRange);
    assert_eq!(error.offset(), None);
    let error = parse(
        b"1",
        &ParseOptions {
            max_depth: Some(u64::MAX),
            ..options
        },
    )
    .unwrap_err();
    assert_eq!(error.kind(), "depth_limit_out_of_range");
}

// Requirements: RQ-006
#[test]
fn depth_limit_is_enforced() {
    let two = ParseOptions {
        max_depth: Some(2),
        ..ParseOptions::default()
    };
    assert!(parse(b"[[1]]", &two).is_ok());
    let one = ParseOptions {
        max_depth: Some(1),
        ..ParseOptions::default()
    };
    assert_eq!(
        parse(b"[[1]]", &one).unwrap_err(),
        Error::MaximumDepthExceeded { offset: Some(1) }
    );
}

// Requirements: RQ-004, RQ-007, RQ-026
#[test]
fn bytes_input_is_validated() {
    let error = parse(b"[\"\xff\"]", &ParseOptions::default()).unwrap_err();
    assert_eq!(error, Error::InvalidUtf8 { offset: 2 });
    assert_eq!(error.to_string(), "invalid UTF-8 at byte 2");
    assert_eq!(text(&valid("[\"\u{d55c}\"]")), "[\"한\"]");
    let long = "\u{d55c}\u{1f30d}".repeat(64);
    let value = valid(&format!("{{\"key\":\"{long}\"}}"));
    assert_eq!(
        value.get("key").unwrap().unwrap().string_value().unwrap(),
        long
    );
}

// Requirements: RQ-008, RQ-026
#[test]
fn text_input_rejects_lone_surrogates() {
    // A literal unpaired surrogate has only its WTF-8 encoding, which is no UTF-8: it is refused at its byte.
    for source in [
        &b"[\"\xed\xa0\x80\"]"[..],
        b"[\"\xed\xb0\x80\"]",
        b"{\"\xed\xa0\x80\":1}",
        b"[\"\xed\xa0\x80",
    ] {
        let error = parse(source, &ParseOptions::default()).unwrap_err();
        assert_eq!(error, Error::InvalidUtf8 { offset: 2 }, "{source:?}");
    }
}

// Requirements: RQ-004, RQ-005, RQ-024
#[test]
fn rejection_names_its_kind_and_offset() {
    for (document, kind, offset) in [
        ("[1,]", "expected_value", 3),
        ("{1:2}", "expected_object_key", 1),
        ("[1.]", "expected_digit", 3),
        ("\"a\u{1}b\"", "unescaped_control_character", 2),
        ("[1] x", "trailing_input", 4),
    ] {
        let error = json(document).unwrap_err();
        assert_eq!(error.kind(), kind, "{document}");
        assert_eq!(error.offset(), Some(offset), "{document}");
    }
    let error = json("[1,]").unwrap_err();
    assert_eq!(error.message(), "expected JSON value");
    assert_eq!(error.to_string(), "expected JSON value at byte 3");
    assert_eq!(error.status(), None);
}

// Requirements: RQ-016
#[test]
fn ordered_map_rejects_non_string_key() {
    let mut members = OrderedMap::new();
    let error = members
        .insert(Value::number("1").unwrap(), Value::null())
        .unwrap_err();
    assert_eq!(error, Error::NonStringKey);
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
        .insert(Value::string("\u{61}"), Value::number("3").unwrap())
        .unwrap();
    assert_eq!(replaced.map(|value| text(&value)), Some("1".to_owned()));
    assert_eq!(members.len(), 2);
    let listed: Vec<String> = members
        .iter()
        .map(|(key, value)| format!("{}:{}", text(key), text(value)))
        .collect();
    assert_eq!(listed, ["\"a\":3", "\"b\":2"]);
    assert_eq!(text(&Value::object(&members).unwrap()), "{\"a\":3,\"b\":2}");
}

// Requirements: RQ-001, RQ-002
#[test]
fn large_maps_find_every_key() {
    // Past eight members the map keeps a hash index; every spelling of a key finds its member.
    let source = format!(
        "{{{}}}",
        (0..40)
            .map(|i| format!("\"k{i}\":{i}"))
            .collect::<Vec<_>>()
            .join(",")
    );
    let value = valid(&source);
    for i in 0..40 {
        let found = value.get(&format!("k{i}")).unwrap().unwrap();
        assert_eq!(found.number_literal().unwrap(), i.to_string());
    }
    let escaped = valid(&source.replace("\"k39\"", "\"\\u006b39\""));
    assert_eq!(
        escaped
            .get("k39")
            .unwrap()
            .unwrap()
            .number_literal()
            .unwrap(),
        "39"
    );
    assert!(value.get("k40").unwrap().is_none());
}

// Requirements: RQ-002, RQ-019, RQ-032
#[test]
fn member_lookup_uses_decoded_names() {
    let value = valid("{\"a\\u00e9\":1,\"b\":2}");
    assert_eq!(value.get("aé").unwrap().map(text), Some("1".to_owned()));
    assert!(value.get("missing").unwrap().is_none());
    assert_eq!(
        value.get_units(&[0x62]).unwrap().map(text),
        Some("2".to_owned())
    );
    assert!(value.get_units(&[0x63]).unwrap().is_none());
    assert_eq!(
        value.get_units(&[0x1_0000]).unwrap_err(),
        Error::InvalidCodeUnit
    );
    assert_eq!(valid("[]").get("a").unwrap_err(), Error::WrongKind);
}

// Requirements: RQ-009, RQ-027, RQ-028
#[test]
fn unpaired_surrogate_stays_in_units() {
    let lone = Value::from_units(&[0x61, 0xd800]).unwrap();
    assert_eq!(text(&lone), "\"a\\ud800\"");
    assert_eq!(lone.string_units().unwrap(), [0x61, 0xd800]);
    assert_eq!(lone.string_value().unwrap_err(), Error::UnpairedSurrogate);
    let parsed = valid("\"a\\ud800\"");
    assert_eq!(parsed.string_units().unwrap(), [0x61, 0xd800]);
    assert_eq!(
        parsed.string_value().unwrap_err().kind(),
        "unpaired_surrogate"
    );
}

// Requirements: RQ-027
#[test]
fn surrogate_pair_decodes() {
    let pair = valid("\"\\ud83c\\udf0d\"");
    assert_eq!(pair.string_units().unwrap(), units("🌍"));
    assert_eq!(pair.string_value().unwrap(), "🌍");
}

// Requirements: RQ-015, RQ-028
#[test]
fn factories_validate_arguments() {
    assert_eq!(
        Value::number(" 1").unwrap_err(),
        Error::InvalidNumberLiteral
    );
    assert_eq!(
        Value::number("x").unwrap_err(),
        Error::ExpectedValue { offset: 0 }
    );
    for literal in ["[]", "\"1\"", "true", "null", "1 "] {
        assert_eq!(
            Value::number(literal).unwrap_err(),
            Error::InvalidNumberLiteral,
            "{literal}"
        );
    }
    assert_eq!(
        text(&Value::array(&[Value::boolean(true), Value::null()]).unwrap()),
        "[true,null]"
    );
    assert_eq!(text(&Value::string("\"q\"")), "\"\\\"q\\\"\"");
    assert_eq!(text(&Value::string("한")), "\"한\"");
    assert_eq!(text(&Value::object(&OrderedMap::new()).unwrap()), "{}");
}

// Requirements: RQ-030
#[test]
fn floats_become_tokens() {
    assert_eq!(text(&Value::from_f64(-0.0).unwrap()), "0");
    assert_eq!(
        Value::from_f64(1e21).unwrap().number_literal().unwrap(),
        "1e+21"
    );
    assert_eq!(
        Value::from_f64(f64::NAN).unwrap_err(),
        Error::NonFiniteNumber
    );
    assert_eq!(polyspec_ordered_json::number_text(0.1).unwrap(), "0.1");
    assert_eq!(
        polyspec_ordered_json::number_text(f64::NEG_INFINITY).unwrap_err(),
        Error::NonFiniteNumber
    );
}

// Requirements: RQ-014, RQ-032
#[test]
fn wrong_kind_access_is_reported() {
    let array = valid("[1]");
    let object = valid("{\"a\":1}");
    assert_eq!(array.members().unwrap_err(), Error::WrongKind);
    assert_eq!(object.items().unwrap_err(), Error::WrongKind);
    assert_eq!(object.number_literal().unwrap_err(), Error::WrongKind);
    assert_eq!(valid("null").boolean_value().unwrap_err(), Error::WrongKind);
    assert_eq!(valid("1").string_units().unwrap_err(), Error::WrongKind);
    for value in [valid("1"), valid("[]"), valid("{}"), Value::null()] {
        assert_eq!(
            value.string_value().unwrap_err(),
            Error::WrongKind,
            "{value}"
        );
    }
    assert_eq!(array.kind(), Kind::Array);
    assert_eq!(object.kind().as_str(), "object");
}

// Requirements: RQ-018
#[test]
fn root_keeps_surrounding_text() {
    let value = valid("  [1] \n");
    assert_eq!(value.raw(), "  [1] \n");
    assert_eq!(text(&value), "[1]");
    assert_eq!(value.to_string(), "[1]");
    assert_eq!(value.items().unwrap()[0].raw(), "1");
    assert_eq!(valid(" 1 ").number_literal().unwrap(), "1");
}

// Requirements: RQ-023
#[test]
fn public_api_exports_the_entry_points() {
    let mut members = OrderedMap::new();
    let items = Value::array(&[
        Value::string("x"),
        Value::number("1").unwrap(),
        Value::boolean(true),
        Value::null(),
    ])
    .unwrap();
    members.insert(Value::string("a"), items).unwrap();
    let built = Value::object(&members).unwrap();
    assert_eq!(text(&built), "{\"a\":[\"x\",1,true,null]}");
    let parsed = valid(&text(&built));
    let items = parsed
        .members()
        .unwrap()
        .get("a")
        .unwrap()
        .unwrap()
        .items()
        .unwrap();
    let kinds: Vec<Kind> = items.iter().map(Value::kind).collect();
    assert_eq!(
        kinds,
        [Kind::String, Kind::Number, Kind::Boolean, Kind::Null]
    );
    assert_eq!(items[0].string_value().unwrap(), "x");
    assert_eq!(items[1].number_literal().unwrap(), "1");
    assert!(items[2].boolean_value().unwrap());
}

// Requirements: RQ-013
#[test]
fn returned_collections_are_immutable() {
    let value = valid("{\"a\":[1,2]}");
    let members: &OrderedMap = value.members().unwrap();
    let mut copy = members.clone();
    copy.insert(Value::string("b"), Value::null()).unwrap();
    assert_eq!(copy.len(), 2);
    assert_eq!(value.members().unwrap().len(), 1);
    assert_eq!(text(&value), "{\"a\":[1,2]}");
}

// Requirements: RQ-003
#[test]
fn arrays_and_objects_stay_distinct() {
    let array = valid("[3,1,2]");
    let numbers: Vec<&str> = array
        .items()
        .unwrap()
        .iter()
        .map(|item| item.number_literal().unwrap())
        .collect();
    assert_eq!(numbers, ["3", "1", "2"]);
    assert_eq!(valid("[]").kind(), Kind::Array);
    assert_eq!(valid("{}").kind(), Kind::Object);
    let source = r#"{"a":[],"b":{},"c":[{}]}"#;
    assert_eq!(text(&valid(source)), source);
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
    let value = valid(&format!("[{}]", tokens.join(",")));
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
        assert_eq!(json(source).unwrap_err().kind(), kind, "{source}");
    }
}

// Requirements: RQ-011, RQ-031
#[test]
fn serialization_is_idempotent() {
    let once = text(&valid(" { \"b\" : 1 , \"a\" : 2 , \"b\" : 3 } "));
    assert_eq!(once, r#"{"b":3,"a":2}"#);
    assert_eq!(text(&valid(&once)), once);
    let safe = StringifyOptions {
        html_safe: Some(true),
    };
    let html = stringify(&valid(r#"{"<":"&"}"#), &safe);
    assert_eq!(html, r#"{"\u003c":"\u0026"}"#);
    assert_eq!(stringify(&valid(&html), &safe), html);
}

// Requirements: RQ-034
#[test]
fn the_host_hook_refuses() {
    assert_eq!(
        valid("{}").host_json().unwrap_err(),
        Error::HostSerializationRefused
    );
}

// B-6 of the plan: a value that a binding wraps is aligned to at most 16 bytes.
#[test]
fn wrapped_types_are_aligned_to_sixteen_bytes() {
    assert!(std::mem::align_of::<Value>() <= 16);
    assert!(std::mem::align_of::<OrderedMap>() <= 16);
}

// B-5b of the plan: the wrapped types can be shared between threads.
#[test]
fn wrapped_types_are_send_and_sync() {
    fn shared<T: Send + Sync>() {}
    shared::<Value>();
    shared::<OrderedMap>();
    shared::<Error>();
}
