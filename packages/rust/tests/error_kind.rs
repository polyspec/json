//! Package tests for `Error`: every kind has a site that accepts and a site that refuses, and the kinds are the names of
//! the shared lists of the specification (RQ-005, RQ-025, RQ-033).
mod common;

use common::json;
use polyspec_json::{parse, Error, OrderedMap, ParseOptions, Value, MAX_DEPTH};
use std::collections::BTreeSet;

type Site = fn() -> Result<(), Error>;

/// Each error with an input its site accepts and an input it refuses; `Internal` has no input.
fn cases() -> Vec<(Error, Site, Site)> {
    fn text(source: &str) -> Result<(), Error> {
        json(source).map(drop)
    }
    fn with(source: &[u8], options: ParseOptions) -> Result<(), Error> {
        parse(source, &options).map(drop)
    }
    fn depth(limit: u64) -> ParseOptions {
        ParseOptions {
            max_depth: Some(limit),
            ..ParseOptions::default()
        }
    }
    const STRICT: ParseOptions = ParseOptions {
        max_depth: None,
        reject_duplicates: Some(true),
    };
    fn insert(key: Value) -> Result<(), Error> {
        OrderedMap::new().insert(key, Value::null()).map(drop)
    }
    fn nested(depth: usize) -> Result<Value, Error> {
        let mut value = Value::null();
        for _ in 0..depth {
            value = Value::array(&[value])?;
        }
        Ok(value)
    }
    vec![
        (
            Error::ExpectedValue { offset: 3 },
            || text("[1]"),
            || text("[1,]"),
        ),
        (
            Error::ExpectedDigit { offset: 2 },
            || text("1.5"),
            || text("1."),
        ),
        (
            Error::ExpectedColon { offset: 5 },
            || text(r#"{"a":1}"#),
            || text(r#"{"a" 1}"#),
        ),
        (
            Error::ExpectedDelimiter { offset: 3 },
            || text("[1,2]"),
            || text("[1 2]"),
        ),
        (
            Error::ExpectedObjectKey { offset: 1 },
            || text(r#"{"a":1}"#),
            || text("{1:2}"),
        ),
        (
            Error::InvalidEscape { offset: 2 },
            || text(r#""\n""#),
            || text(r#""\x""#),
        ),
        (
            Error::InvalidUnicodeEscape { offset: 5 },
            || text(r#""A""#),
            || text(r#""\u00g1""#),
        ),
        (
            Error::UnfinishedEscape { offset: 2 },
            || text(r#""\\""#),
            || text("\"\\"),
        ),
        (
            Error::UnterminatedString { offset: 2 },
            || text(r#""a""#),
            || text("\"a"),
        ),
        (
            Error::UnescapedControlCharacter { offset: 2 },
            || text(r#""a\tb""#),
            || text("\"a\tb\""),
        ),
        (
            Error::InvalidUtf8 { offset: 1 },
            || text("\"한\""),
            || with(b"\"\xff\"", ParseOptions::default()),
        ),
        (
            Error::MaximumDepthExceeded { offset: Some(1) },
            || with(b"[[]]", depth(2)),
            || with(b"[[]]", depth(1)),
        ),
        (
            Error::MaximumDepthExceeded { offset: None },
            || nested(256).map(drop),
            || nested(257).map(drop),
        ),
        (
            Error::TrailingInput { offset: 4 },
            || text("[1] "),
            || text("[1] x"),
        ),
        (
            Error::DuplicateObjectKey { offset: 7 },
            || with(br#"{"a":1,"b":2}"#, STRICT),
            || with(br#"{"a":1,"a":2}"#, STRICT),
        ),
        (
            Error::NonStringKey,
            || insert(Value::string("a")),
            || insert(Value::number("1")?),
        ),
        (
            Error::WrongKind,
            || json(r#""x""#)?.string_value().map(drop),
            || json("1")?.string_value().map(drop),
        ),
        (
            Error::InvalidNumberLiteral,
            || Value::number("-0.5e3").map(drop),
            || Value::number(" 1").map(drop),
        ),
        (
            Error::DepthLimitOutOfRange,
            || with(b"[]", depth(MAX_DEPTH)),
            || with(b"[]", depth(MAX_DEPTH + 1)),
        ),
        (
            Error::InvalidCodeUnit,
            || Value::from_units(&[0xffff]).map(drop),
            || Value::from_units(&[0x1_0000]).map(drop),
        ),
        (
            Error::UnpairedSurrogate,
            || json(r#""🌍""#)?.string_value().map(drop),
            || json(r#""\ud83c""#)?.string_value().map(drop),
        ),
        (
            Error::NonFiniteNumber,
            || Value::from_f64(1.0).map(drop),
            || Value::from_f64(f64::INFINITY).map(drop),
        ),
        (
            Error::HostSerializationRefused,
            || Ok(()),
            || Value::null().host_json().map(drop),
        ),
    ]
}

// Requirements: RQ-005, RQ-024, RQ-033
#[test]
fn every_kind_has_an_accepting_and_a_refusing_site() {
    for (expected, accept, refuse) in cases() {
        assert_eq!(accept(), Ok(()), "{expected}");
        let error = refuse().unwrap_err();
        assert_eq!(error, expected);
        match error.offset() {
            Some(offset) => assert_eq!(
                error.to_string(),
                format!("{} at byte {offset}", error.message())
            ),
            None => assert_eq!(error.to_string(), error.message()),
        }
        assert_eq!(error.status(), None);
    }
}

/// The items of the list of the section of `anchor` in docs/spec/json-contract.md.
fn listed(spec: &str, anchor: &str) -> Vec<String> {
    let Some((_, section)) = spec.split_once(anchor) else {
        panic!("the specification has no {anchor}");
    };
    let Some(end) = section.find(
        "
<a id=",
    ) else {
        panic!("the section {anchor} has no end");
    };
    section[..end]
        .lines()
        .filter_map(|line| Some(line.strip_prefix("- `")?.split_once('`')?.0.to_owned()))
        .collect()
}

// Requirements: RQ-005, RQ-025, RQ-033
#[test]
fn kinds_are_the_shared_lists() {
    // Every kind of the crate is an item of the shared lists, but duplicate_object_key of the strict parse; the kinds of
    // the lists that the core lacks arise only in the language packages of the transition or in a binding.
    let mut kinds: BTreeSet<&str> = cases().iter().map(|(error, _, _)| error.kind()).collect();
    kinds.insert(Error::Internal { what: "" }.kind());
    let spec = std::fs::read_to_string(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/spec/json-contract.md"
    ))
    .unwrap();
    let listed: BTreeSet<String> = listed(&spec, r#"<a id="rejection-kinds"></a>"#)
        .into_iter()
        .chain(listed(&spec, r#"<a id="argument-kinds"></a>"#))
        .collect();
    for kind in &kinds {
        assert!(
            *kind == "duplicate_object_key" || listed.contains(*kind),
            "{kind} is not listed"
        );
    }
    let absent: BTreeSet<&str> = listed
        .iter()
        .map(String::as_str)
        .filter(|kind| !kinds.contains(kind))
        .collect();
    assert_eq!(
        absent,
        BTreeSet::from([
            "direct_construction",
            "invalid_argument_type",
            "unescaped_lone_surrogate"
        ])
    );
}

// Requirements: RQ-033. The kind interface of the bindings gives the kind of the crate, no status and no errno.
#[test]
fn the_kind_interface_of_the_bindings_is_the_kind() {
    use binding_core::Kinds;
    for (error, _, _) in cases() {
        assert_eq!(Kinds::kind(&error), error.kind());
        assert_eq!(Kinds::status(&error), None);
        assert_eq!(Kinds::errno(&error), None);
    }
}
