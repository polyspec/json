//! Package tests for `ErrorKind`: every error of the crate carries a named kind, each kind has a site that accepts and a
//! site that refuses, and the names of the parse rejections are those of the shared list of the specification.
use polyspec_ordered_json::{
    parse, parse_bytes, parse_bytes_reject_duplicates, parse_with_max_depth, Error, ErrorKind,
    OrderedMap, Value, MAX_DEPTH,
};
use std::collections::BTreeSet;

/// Every variant, in declaration order; `position` keeps this list complete.
const ALL: [ErrorKind; 18] = [
    ErrorKind::ExpectedValue,
    ErrorKind::ExpectedDigit,
    ErrorKind::ExpectedColon,
    ErrorKind::ExpectedDelimiter,
    ErrorKind::ExpectedObjectKey,
    ErrorKind::InvalidEscape,
    ErrorKind::InvalidUnicodeEscape,
    ErrorKind::UnfinishedEscape,
    ErrorKind::UnterminatedString,
    ErrorKind::UnescapedControlCharacter,
    ErrorKind::InvalidUtf8,
    ErrorKind::MaximumDepthExceeded,
    ErrorKind::TrailingInput,
    ErrorKind::DuplicateObjectKey,
    ErrorKind::NonStringKey,
    ErrorKind::WrongKind,
    ErrorKind::InvalidNumberLiteral,
    ErrorKind::DepthLimitOutOfRange,
];

/// An exhaustive match without a wildcard arm: it compiles in this outside crate only while the enum is exhaustive, and
/// a new variant fails it until `ALL` lists it.
fn position(kind: ErrorKind) -> usize {
    match kind {
        ErrorKind::ExpectedValue => 0,
        ErrorKind::ExpectedDigit => 1,
        ErrorKind::ExpectedColon => 2,
        ErrorKind::ExpectedDelimiter => 3,
        ErrorKind::ExpectedObjectKey => 4,
        ErrorKind::InvalidEscape => 5,
        ErrorKind::InvalidUnicodeEscape => 6,
        ErrorKind::UnfinishedEscape => 7,
        ErrorKind::UnterminatedString => 8,
        ErrorKind::UnescapedControlCharacter => 9,
        ErrorKind::InvalidUtf8 => 10,
        ErrorKind::MaximumDepthExceeded => 11,
        ErrorKind::TrailingInput => 12,
        ErrorKind::DuplicateObjectKey => 13,
        ErrorKind::NonStringKey => 14,
        ErrorKind::WrongKind => 15,
        ErrorKind::InvalidNumberLiteral => 16,
        ErrorKind::DepthLimitOutOfRange => 17,
    }
}

/// The kinds of the crate that the shared list does not hold: the strict parse and the refused arguments.
const OUTSIDE_SHARED_LIST: [ErrorKind; 5] = [
    ErrorKind::DuplicateObjectKey,
    ErrorKind::NonStringKey,
    ErrorKind::WrongKind,
    ErrorKind::InvalidNumberLiteral,
    ErrorKind::DepthLimitOutOfRange,
];

type Site = fn() -> Result<(), Error>;

/// Each kind with an input its site accepts, an input it refuses and the offset of that refusal.
fn cases() -> [(ErrorKind, Site, Site, usize); 18] {
    fn text(source: &str) -> Result<(), Error> {
        parse(source).map(drop)
    }
    fn insert(key: Value) -> Result<(), Error> {
        let mut members = OrderedMap::new();
        let inserted = members.insert(key, Value::null()).map(drop);
        assert_eq!(members.len(), usize::from(inserted.is_ok()));
        inserted
    }
    [
        (ErrorKind::ExpectedValue, || text("[1]"), || text("[1,]"), 3),
        (ErrorKind::ExpectedDigit, || text("1.5"), || text("1."), 2),
        (
            ErrorKind::ExpectedColon,
            || text(r#"{"a":1}"#),
            || text(r#"{"a" 1}"#),
            5,
        ),
        (
            ErrorKind::ExpectedDelimiter,
            || text("[1,2]"),
            || text("[1 2]"),
            3,
        ),
        (
            ErrorKind::ExpectedObjectKey,
            || text(r#"{"a":1}"#),
            || text("{1:2}"),
            1,
        ),
        (
            ErrorKind::InvalidEscape,
            || text(r#""\n""#),
            || text(r#""\x""#),
            2,
        ),
        (
            ErrorKind::InvalidUnicodeEscape,
            || text(r#""A""#),
            || text(r#""\u00g1""#),
            5,
        ),
        (
            ErrorKind::UnfinishedEscape,
            || text(r#""\\""#),
            || text("\"\\"),
            2,
        ),
        (
            ErrorKind::UnterminatedString,
            || text(r#""a""#),
            || text("\"a"),
            2,
        ),
        (
            ErrorKind::UnescapedControlCharacter,
            || text(r#""a\tb""#),
            || text("\"a\tb\""),
            2,
        ),
        (
            ErrorKind::InvalidUtf8,
            || parse_bytes("\"한\"".as_bytes()).map(drop),
            || parse_bytes(b"\"\xff\"").map(drop),
            1,
        ),
        (
            ErrorKind::MaximumDepthExceeded,
            || parse_with_max_depth("[[]]", 2).map(drop),
            || parse_with_max_depth("[[]]", 1).map(drop),
            1,
        ),
        (
            ErrorKind::TrailingInput,
            || text("[1] "),
            || text("[1] x"),
            4,
        ),
        (
            ErrorKind::DuplicateObjectKey,
            || parse_bytes_reject_duplicates(br#"{"a":1,"b":2}"#).map(drop),
            || parse_bytes_reject_duplicates(br#"{"a":1,"a":2}"#).map(drop),
            7,
        ),
        (
            ErrorKind::NonStringKey,
            || insert(Value::string("a")),
            || insert(Value::number("1")?),
            0,
        ),
        (
            ErrorKind::WrongKind,
            || parse(r#""x""#)?.string_value().map(drop),
            || parse("1")?.string_value().map(drop),
            0,
        ),
        (
            ErrorKind::InvalidNumberLiteral,
            || Value::number("-0.5e3").map(drop),
            || Value::number(" 1").map(drop),
            0,
        ),
        (
            ErrorKind::DepthLimitOutOfRange,
            || parse_with_max_depth("[]", MAX_DEPTH).map(drop),
            || parse_with_max_depth("[]", MAX_DEPTH + 1).map(drop),
            0,
        ),
    ]
}

// Requirements: RQ-005, RQ-024
#[test]
fn every_kind_has_an_accepting_and_a_refusing_site() {
    let cases = cases();
    for (index, (kind, accept, refuse, offset)) in cases.into_iter().enumerate() {
        assert_eq!(position(kind), index, "{kind}");
        assert_eq!(accept(), Ok(()), "{kind}");
        let error = refuse().unwrap_err();
        assert_eq!(error.kind(), kind, "{kind}: {error}");
        assert_eq!(error.offset, offset, "{kind}: {error}");
        assert_eq!(error.message(), kind.message());
        assert_eq!(
            error.to_string(),
            format!("{} at byte {offset}", kind.message())
        );
    }
}

// Requirements: RQ-005
#[test]
fn every_kind_is_named() {
    let names: BTreeSet<&str> = ALL.iter().map(|kind| kind.as_str()).collect();
    let messages: BTreeSet<&str> = ALL.iter().map(|kind| kind.message()).collect();
    assert_eq!(names.len(), ALL.len());
    assert_eq!(messages.len(), ALL.len());
    for (index, kind) in ALL.into_iter().enumerate() {
        assert_eq!(position(kind), index);
        assert!(
            !kind.as_str().is_empty() && !kind.message().is_empty(),
            "{kind:?}"
        );
        assert!(kind
            .as_str()
            .bytes()
            .all(|b| b == b'_' || b.is_ascii_lowercase() || b.is_ascii_digit()));
        assert_eq!(kind.to_string(), kind.as_str());
    }
}

// Requirements: RQ-014, RQ-015, RQ-016, RQ-006
#[test]
fn argument_errors_carry_their_kind() {
    // A literal that parses as another kind is no number literal; a literal that does not parse keeps its parse kind.
    for literal in ["[]", "\"1\"", "true", "null", "1 "] {
        assert_eq!(
            Value::number(literal).unwrap_err().kind(),
            ErrorKind::InvalidNumberLiteral,
            "{literal}"
        );
    }
    assert_eq!(
        Value::number("x").unwrap_err().kind(),
        ErrorKind::ExpectedValue
    );
    for value in [
        parse("1").unwrap(),
        parse("[]").unwrap(),
        parse("{}").unwrap(),
        Value::null(),
    ] {
        assert_eq!(
            value.string_value().unwrap_err().kind(),
            ErrorKind::WrongKind,
            "{value}"
        );
    }
    let mut members = OrderedMap::new();
    for key in [
        Value::null(),
        Value::boolean(true),
        Value::array(&[]).unwrap(),
    ] {
        assert_eq!(
            members.insert(key, Value::null()).unwrap_err().kind(),
            ErrorKind::NonStringKey
        );
    }
    assert!(members.is_empty());
    assert_eq!(
        parse_with_max_depth("1", usize::MAX).unwrap_err().kind(),
        ErrorKind::DepthLimitOutOfRange
    );
}

// Requirements: RQ-005
#[test]
fn parse_kinds_are_the_shared_list() {
    // The crate names each parse rejection by the shared list of docs/spec/json-contract.md. Its text input is a Rust str,
    // which cannot hold an unpaired surrogate, so it has no unescaped_lone_surrogate; every other kind of the list is a
    // variant, and the variants outside the list are the strict parse and the refused arguments.
    let spec = std::fs::read_to_string(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/spec/json-contract.md"
    ))
    .unwrap();
    let section = spec
        .split(r#"<a id="rejection-kinds"></a>"#)
        .nth(1)
        .unwrap();
    let section = &section[..section.find("\n<a id=").unwrap()];
    let shared: BTreeSet<&str> = section
        .lines()
        .filter_map(|line| line.strip_prefix("- `")?.strip_suffix('`'))
        .filter(|name| *name != "unescaped_lone_surrogate")
        .collect();
    let parse_kinds: BTreeSet<&str> = ALL
        .iter()
        .filter(|kind| !OUTSIDE_SHARED_LIST.contains(kind))
        .map(|kind| kind.as_str())
        .collect();
    assert_eq!(parse_kinds, shared);
    let api = std::fs::read_to_string(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/operations/api.md"
    ))
    .unwrap();
    for kind in OUTSIDE_SHARED_LIST {
        assert!(!shared.contains(kind.as_str()), "{kind}");
        assert!(
            api.contains(&format!("`{}`", kind.as_str())),
            "docs/operations/api.md names no `{kind}`"
        );
    }
}
