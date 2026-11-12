//! The errors of the crate (RQ-005, RQ-025, RQ-033): one variant per kind of the shared lists of
//! docs/spec/json-contract.md, so a caller matches every kind without a wildcard arm.

use std::fmt;

/// Why the crate refused an input or an argument. [`Error::kind`] is the name of the kind of the shared lists, the same
/// in every binding; a parse rejection carries the byte offset of the first byte that makes the input invalid (RQ-004).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    /// The grammar expects a value at the offset.
    ExpectedValue { offset: u64 },
    /// The grammar expects a digit at the offset.
    ExpectedDigit { offset: u64 },
    /// The grammar expects `:` at the offset.
    ExpectedColon { offset: u64 },
    /// The grammar expects `,` or the closing delimiter at the offset.
    ExpectedDelimiter { offset: u64 },
    /// The grammar expects a string, an object key, at the offset.
    ExpectedObjectKey { offset: u64 },
    /// The character after `\` is no escape of the grammar.
    InvalidEscape { offset: u64 },
    /// A `\u` escape lacks a hex digit at the offset.
    InvalidUnicodeEscape { offset: u64 },
    /// The input ends inside an escape.
    UnfinishedEscape { offset: u64 },
    /// The input ends inside a string.
    UnterminatedString { offset: u64 },
    /// A string holds a character U+0000 to U+001F unescaped.
    UnescapedControlCharacter { offset: u64 },
    /// The input is not UTF-8 from the offset (RQ-007, RQ-026).
    InvalidUtf8 { offset: u64 },
    /// A container is nested deeper than the limit (RQ-006). A constructor has no input position, so its offset is
    /// `None` (RQ-033).
    MaximumDepthExceeded { offset: Option<u64> },
    /// Input follows the root value.
    TrailingInput { offset: u64 },
    /// The strict parse found a repeated decoded key (RQ-017).
    DuplicateObjectKey { offset: u64 },
    /// `OrderedMap::insert` of a key that is not a string (RQ-016).
    NonStringKey,
    /// An accessor or a lookup of a value of another kind (RQ-014, RQ-032).
    WrongKind,
    /// `Value::number` of a literal that is a JSON value of another kind or holds whitespace (RQ-015).
    InvalidNumberLiteral,
    /// A `max_depth` above [`crate::MAX_DEPTH`] (RQ-035).
    DepthLimitOutOfRange,
    /// A UTF-16 code unit above 65535 (RQ-029).
    InvalidCodeUnit,
    /// `Value::string_value` of a string that holds an unpaired surrogate (RQ-027).
    UnpairedSurrogate,
    /// A number built from NaN or an infinity (RQ-030).
    NonFiniteNumber,
    /// The standard JSON serialization hook of a language (RQ-034).
    HostSerializationRefused,
    /// A broken invariant of the crate: a defect, never a refused input (RQ-033).
    Internal { what: &'static str },
}

impl Error {
    /// The name of the kind, the same in every binding (RQ-005, RQ-025).
    #[must_use]
    pub const fn kind(&self) -> &'static str {
        match self {
            Self::ExpectedValue { .. } => "expected_value",
            Self::ExpectedDigit { .. } => "expected_digit",
            Self::ExpectedColon { .. } => "expected_colon",
            Self::ExpectedDelimiter { .. } => "expected_delimiter",
            Self::ExpectedObjectKey { .. } => "expected_object_key",
            Self::InvalidEscape { .. } => "invalid_escape",
            Self::InvalidUnicodeEscape { .. } => "invalid_unicode_escape",
            Self::UnfinishedEscape { .. } => "unfinished_escape",
            Self::UnterminatedString { .. } => "unterminated_string",
            Self::UnescapedControlCharacter { .. } => "unescaped_control_character",
            Self::InvalidUtf8 { .. } => "invalid_utf8",
            Self::MaximumDepthExceeded { .. } => "maximum_depth_exceeded",
            Self::TrailingInput { .. } => "trailing_input",
            Self::DuplicateObjectKey { .. } => "duplicate_object_key",
            Self::NonStringKey => "non_string_key",
            Self::WrongKind => "wrong_kind",
            Self::InvalidNumberLiteral => "invalid_number_literal",
            Self::DepthLimitOutOfRange => "depth_limit_out_of_range",
            Self::InvalidCodeUnit => "invalid_code_unit",
            Self::UnpairedSurrogate => "unpaired_surrogate",
            Self::NonFiniteNumber => "non_finite_number",
            Self::HostSerializationRefused => "host_serialization_refused",
            Self::Internal { .. } => "internal",
        }
    }

    /// The byte offset of a parse rejection (RQ-004); an argument error and the depth failure of a constructor have
    /// none (RQ-033).
    #[must_use]
    pub const fn offset(&self) -> Option<u64> {
        match self {
            Self::ExpectedValue { offset }
            | Self::ExpectedDigit { offset }
            | Self::ExpectedColon { offset }
            | Self::ExpectedDelimiter { offset }
            | Self::ExpectedObjectKey { offset }
            | Self::InvalidEscape { offset }
            | Self::InvalidUnicodeEscape { offset }
            | Self::UnfinishedEscape { offset }
            | Self::UnterminatedString { offset }
            | Self::UnescapedControlCharacter { offset }
            | Self::InvalidUtf8 { offset }
            | Self::TrailingInput { offset }
            | Self::DuplicateObjectKey { offset } => Some(*offset),
            Self::MaximumDepthExceeded { offset } => *offset,
            Self::NonStringKey
            | Self::WrongKind
            | Self::InvalidNumberLiteral
            | Self::DepthLimitOutOfRange
            | Self::InvalidCodeUnit
            | Self::UnpairedSurrogate
            | Self::NonFiniteNumber
            | Self::HostSerializationRefused
            | Self::Internal { .. } => None,
        }
    }

    /// The HTTP status of the kind: no kind of the crate has one (plan F-2).
    #[must_use]
    pub const fn status(&self) -> Option<u16> {
        None
    }

    /// The Rust wording of the kind; a caller tells failures apart by [`Error::kind`].
    #[must_use]
    pub const fn message(&self) -> &'static str {
        match self {
            Self::ExpectedValue { .. } => "expected JSON value",
            Self::ExpectedDigit { .. } => "expected digit",
            Self::ExpectedColon { .. } => "expected colon",
            Self::ExpectedDelimiter { .. } => "expected comma or closing delimiter",
            Self::ExpectedObjectKey { .. } => "expected string",
            Self::InvalidEscape { .. } => "invalid escape",
            Self::InvalidUnicodeEscape { .. } => "invalid Unicode escape",
            Self::UnfinishedEscape { .. } => "unfinished escape",
            Self::UnterminatedString { .. } => "unterminated string",
            Self::UnescapedControlCharacter { .. } => "unescaped control character",
            Self::InvalidUtf8 { .. } => "invalid UTF-8",
            Self::MaximumDepthExceeded { .. } => "maximum nesting depth exceeded",
            Self::TrailingInput { .. } => "unexpected trailing input",
            Self::DuplicateObjectKey { .. } => "duplicate object key",
            Self::NonStringKey => "object key must be a string",
            Self::WrongKind => "the value is of another kind",
            Self::InvalidNumberLiteral => "expected a number literal without whitespace",
            Self::DepthLimitOutOfRange => "max_depth exceeds 256",
            Self::InvalidCodeUnit => "a UTF-16 code unit exceeds 65535",
            Self::UnpairedSurrogate => "the string holds an unpaired surrogate",
            Self::NonFiniteNumber => "a JSON number is finite",
            Self::HostSerializationRefused => "use stringify, the serializer of the library",
            Self::Internal { what } => what,
        }
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.offset() {
            Some(offset) => write!(f, "{} at byte {offset}", self.message()),
            None => f.write_str(self.message()),
        }
    }
}

impl std::error::Error for Error {}
