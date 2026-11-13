//! The immutable value and its constructors and accessors (RQ-012 to RQ-015, RQ-027 to RQ-033).

use std::{
    char::DecodeUtf16Error,
    convert::Infallible,
    sync::{Arc, OnceLock},
};

use crate::{
    number::number_text,
    parse::{parse, ParseOptions},
    write::{quote_char, quote_unit},
    Error, OrderedMap,
};

/// The kind of a value, with the names of the shared contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Kind {
    Object,
    Array,
    String,
    Number,
    Boolean,
    Null,
}

impl Kind {
    /// The name of the kind: `object`, `array`, `string`, `number`, `boolean` or `null`.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Object => "object",
            Self::Array => "array",
            Self::String => "string",
            Self::Number => "number",
            Self::Boolean => "boolean",
            Self::Null => "null",
        }
    }
}

/// The value serializes to exactly its source token: it contains no insignificant whitespace and no duplicate object
/// keys.
pub(crate) const COMPACT: u8 = 1;
/// A parse result or a constructed value; its raw text includes surrounding whitespace.
pub(crate) const ROOT: u8 = 2;
/// A string token that contains escape sequences.
pub(crate) const ESCAPED: u8 = 4;

#[derive(Debug, Clone)]
pub(crate) enum Node {
    Object(OrderedMap),
    Array(Vec<Value>),
    /// UTF-16 units, decoded from the source token on first use.
    String(OnceLock<Box<[u16]>>),
    Number,
    Boolean,
    Null,
}

/// A JSON value that keeps its source tokens (RQ-010, RQ-018); it is immutable and only the parser and the
/// constructors make one (RQ-012).
#[derive(Debug, Clone)]
pub struct Value {
    pub(crate) source: Arc<str>,
    /// The value token; a root's raw text also includes surrounding whitespace.
    pub(crate) start: usize,
    pub(crate) end: usize,
    pub(crate) flags: u8,
    pub(crate) node: Node,
}

/// Decodes the contents of a validated string token.
fn decode_units(content: &str) -> Result<Box<[u16]>, Error> {
    const BROKEN: Error = Error::Internal {
        what: "a validated string token ends inside an escape",
    };
    let mut units = Vec::with_capacity(content.len());
    let mut chars = content.chars();
    while let Some(ch) = chars.next() {
        if ch != '\\' {
            units.extend_from_slice(ch.encode_utf16(&mut [0; 2]));
            continue;
        }
        let escape = chars.next().ok_or(BROKEN)?;
        units.push(match escape {
            'u' => {
                let mut unit: u32 = 0;
                for _ in 0..4 {
                    let digit = chars.next().ok_or(BROKEN)?;
                    let Some(value) = digit.to_digit(16) else {
                        return Err(Error::Internal {
                            what:
                                "a validated \\u escape holds a character that is not a hex digit",
                        });
                    };
                    unit = unit * 16 + value;
                }
                match u16::try_from(unit) {
                    Ok(unit) => unit,
                    Err(_) => return Err(BROKEN),
                }
            }
            'b' => 8,
            'f' => 12,
            'n' => 10,
            'r' => 13,
            't' => 9,
            '"' => 34,
            '\\' => 92,
            '/' => 47,
            _ => {
                return Err(Error::Internal {
                    what: "a validated string token holds an escape outside the grammar",
                })
            }
        });
    }
    Ok(units.into_boxed_slice())
}

/// UTF-16 code units from the integers of a caller (RQ-029).
pub(crate) fn code_units(units: &[u64]) -> Result<Vec<u16>, Error> {
    units
        .iter()
        .map(|&unit| match u16::try_from(unit) {
            Ok(unit) => Ok(unit),
            Err(_) => Err(Error::InvalidCodeUnit),
        })
        .collect()
}

impl Value {
    /// A value of a token that the crate wrote and that the grammar accepts.
    fn of_token(token: String, flags: u8, node: Node) -> Self {
        let end = token.len();
        Self {
            source: Arc::from(token),
            start: 0,
            end,
            flags: flags | COMPACT | ROOT,
            node,
        }
    }

    /// The kind of the value.
    #[must_use]
    pub fn kind(&self) -> Kind {
        match self.node {
            Node::Object(_) => Kind::Object,
            Node::Array(_) => Kind::Array,
            Node::String(_) => Kind::String,
            Node::Number => Kind::Number,
            Node::Boolean => Kind::Boolean,
            Node::Null => Kind::Null,
        }
    }

    /// The source text of the value; the root's includes its surrounding whitespace (RQ-018).
    #[must_use]
    pub fn raw(&self) -> &str {
        if self.flags & ROOT != 0 {
            &self.source
        } else {
            self.token()
        }
    }

    pub(crate) fn token(&self) -> &str {
        &self.source[self.start..self.end]
    }

    fn content(&self) -> &str {
        &self.source[self.start + 1..self.end - 1]
    }

    /// The members of an object (RQ-001).
    ///
    /// # Errors
    ///
    /// [`Error::WrongKind`] for a value of another kind (RQ-032).
    pub fn members(&self) -> Result<&OrderedMap, Error> {
        match &self.node {
            Node::Object(members) => Ok(members),
            _ => Err(Error::WrongKind),
        }
    }

    /// The items of an array (RQ-003).
    ///
    /// # Errors
    ///
    /// [`Error::WrongKind`] for a value of another kind (RQ-032).
    pub fn items(&self) -> Result<&[Value], Error> {
        match &self.node {
            Node::Array(items) => Ok(items),
            _ => Err(Error::WrongKind),
        }
    }

    /// The UTF-16 code units of a string, decoded on first use.
    pub(crate) fn units(&self) -> Result<&[u16], Error> {
        let Node::String(cell) = &self.node else {
            return Err(Error::WrongKind);
        };
        if let Some(units) = cell.get() {
            return Ok(units);
        }
        let decoded = decode_units(self.content())?;
        Ok(cell.get_or_init(|| decoded))
    }

    /// The UTF-16 code units of a string, which keep an unpaired surrogate (RQ-027).
    ///
    /// # Errors
    ///
    /// [`Error::WrongKind`] for a value of another kind (RQ-032).
    pub fn string_units(&self) -> Result<Vec<u64>, Error> {
        Ok(self.units()?.iter().map(|&unit| u64::from(unit)).collect())
    }

    /// The Unicode text of a string (RQ-027).
    ///
    /// # Errors
    ///
    /// [`Error::UnpairedSurrogate`] for a string that holds an escaped unpaired surrogate, and [`Error::WrongKind`]
    /// for a value of another kind (RQ-032).
    pub fn string_value(&self) -> Result<String, Error> {
        match self.string_text()? {
            Some(text) => Ok(text),
            None => Err(Error::UnpairedSurrogate),
        }
    }

    /// The Unicode text of a string, or `None` for a string that holds an escaped unpaired surrogate, whose code units
    /// [`Value::string_units`] gives (RQ-027): one call tells a text from a string that only its code units hold.
    ///
    /// # Errors
    ///
    /// [`Error::WrongKind`] for a value of another kind (RQ-032).
    pub fn string_text(&self) -> Result<Option<String>, Error> {
        if !matches!(self.node, Node::String(_)) {
            return Err(Error::WrongKind);
        }
        if self.flags & ESCAPED == 0 {
            return Ok(Some(self.content().to_owned()));
        }
        let mut text = String::with_capacity(self.content().len());
        for unit in char::decode_utf16(self.units()?.iter().copied()) {
            match unit {
                Ok(ch) => text.push(ch),
                Err(_) => return Ok(None),
            }
        }
        Ok(Some(text))
    }

    /// The token of a number, exactly as written (RQ-010).
    ///
    /// # Errors
    ///
    /// [`Error::WrongKind`] for a value of another kind (RQ-032).
    pub fn number_literal(&self) -> Result<&str, Error> {
        match self.node {
            Node::Number => Ok(self.token()),
            _ => Err(Error::WrongKind),
        }
    }

    /// The value of a boolean.
    ///
    /// # Errors
    ///
    /// [`Error::WrongKind`] for a value of another kind (RQ-032).
    pub fn boolean_value(&self) -> Result<bool, Error> {
        match self.node {
            Node::Boolean => Ok(self.token() == "true"),
            _ => Err(Error::WrongKind),
        }
    }

    /// The member of an object with a decoded name, or `None` when the object does not hold it (RQ-019, RQ-032).
    ///
    /// # Errors
    ///
    /// [`Error::WrongKind`] for a value that is not an object.
    pub fn get(&self, key: &str) -> Result<Option<&Value>, Error> {
        self.members()?.get(key)
    }

    /// The member of an object with a name given as UTF-16 code units (RQ-009, RQ-032).
    ///
    /// # Errors
    ///
    /// [`Error::WrongKind`] for a value that is not an object, and [`Error::InvalidCodeUnit`] for a unit above 65535.
    pub fn get_units(&self, key: &[u64]) -> Result<Option<&Value>, Error> {
        self.members()?.get_units(key)
    }

    /// The standard JSON serialization hook of a binding, which refuses (RQ-034).
    ///
    /// # Errors
    ///
    /// Always [`Error::HostSerializationRefused`]: the serializer of the library is [`crate::stringify`].
    pub fn host_json(&self) -> Result<Infallible, Error> {
        Err(Error::HostSerializationRefused)
    }

    /// A string of Unicode text, written as UTF-8 with the escapes of RQ-028.
    #[must_use]
    pub fn string(text: &str) -> Self {
        match Self::quoted(text.chars().map(Ok::<char, Infallible>), text.len()) {
            Ok(value) => value,
            Err(never) => match never {},
        }
    }

    /// A string of the Unicode text that UTF-16 code units hold, written in one pass, so that a text of a language
    /// that gives UTF-16 is not decoded into a `String` first (RQ-036, binding B2.89); the error names the first
    /// unpaired surrogate.
    pub(crate) fn string_of_utf16(units: &[u16]) -> Result<Self, DecodeUtf16Error> {
        Self::quoted(char::decode_utf16(units.iter().copied()), units.len())
    }

    /// A string of the characters, written as UTF-8 with the escapes of RQ-028; the first character that is an error
    /// stops it with that error.
    fn quoted<E>(chars: impl Iterator<Item = Result<char, E>>, len: usize) -> Result<Self, E> {
        let mut token = String::with_capacity(len + 2);
        let mut escaped = false;
        token.push('"');
        for ch in chars {
            escaped |= quote_char(&mut token, ch?);
        }
        token.push('"');
        Ok(Self::of_token(
            token,
            if escaped { ESCAPED } else { 0 },
            Node::String(OnceLock::new()),
        ))
    }

    /// A string of UTF-16 code units, which may hold unpaired surrogates (RQ-028, RQ-029).
    ///
    /// # Errors
    ///
    /// [`Error::InvalidCodeUnit`] for a unit above 65535.
    pub fn from_units(units: &[u64]) -> Result<Self, Error> {
        let units = code_units(units)?;
        let mut token = String::with_capacity(units.len() + 2);
        let mut escaped = false;
        token.push('"');
        for unit in char::decode_utf16(units.iter().copied()) {
            escaped |= match unit {
                Ok(ch) => quote_char(&mut token, ch),
                Err(lone) => {
                    quote_unit(&mut token, lone.unpaired_surrogate());
                    true
                }
            };
        }
        token.push('"');
        Ok(Self::of_token(
            token,
            if escaped { ESCAPED } else { 0 },
            Node::String(OnceLock::new()),
        ))
    }

    /// A number of a JSON number token (RQ-010, RQ-015).
    ///
    /// # Errors
    ///
    /// The rejection of a literal that does not parse, with its offset in the literal, and
    /// [`Error::InvalidNumberLiteral`] for a literal that is another JSON value or holds whitespace.
    pub fn number(literal: &str) -> Result<Self, Error> {
        let value = parse(literal.as_bytes(), &ParseOptions::default())?;
        if value.kind() != Kind::Number || value.token().len() != literal.len() {
            return Err(Error::InvalidNumberLiteral);
        }
        Ok(value)
    }

    /// A number of a binary64 float, written as ECMAScript `Number::toString` writes it (RQ-030).
    ///
    /// # Errors
    ///
    /// [`Error::NonFiniteNumber`] for NaN and the infinities.
    pub fn from_f64(value: f64) -> Result<Self, Error> {
        Ok(Self::of_token(number_text(value)?, 0, Node::Number))
    }

    /// A boolean.
    #[must_use]
    pub fn boolean(value: bool) -> Self {
        let token = if value { "true" } else { "false" };
        Self::of_token(token.to_owned(), 0, Node::Boolean)
    }

    /// The null value.
    #[must_use]
    pub fn null() -> Self {
        Self::of_token("null".to_owned(), 0, Node::Null)
    }

    /// Parses the text that a constructor wrote: only the depth limit can refuse it (RQ-015, RQ-033).
    fn constructed(text: &str) -> Result<Self, Error> {
        parse(text.as_bytes(), &ParseOptions::default()).map_err(|error| match error {
            Error::MaximumDepthExceeded { .. } => Error::MaximumDepthExceeded { offset: None },
            _ => Error::Internal {
                what: "a constructor wrote text that the grammar refuses",
            },
        })
    }

    /// An array of the items in order (RQ-003, RQ-015).
    ///
    /// # Errors
    ///
    /// [`Error::MaximumDepthExceeded`] without an offset when the array is nested deeper than [`crate::MAX_DEPTH`].
    pub fn array(items: &[Value]) -> Result<Self, Error> {
        let mut text = String::from("[");
        for (position, item) in items.iter().enumerate() {
            if position > 0 {
                text.push(',');
            }
            item.write_json(&mut text);
        }
        text.push(']');
        Self::constructed(&text)
    }

    /// An object of the members in their order (RQ-001, RQ-015).
    ///
    /// # Errors
    ///
    /// [`Error::MaximumDepthExceeded`] without an offset when the object is nested deeper than [`crate::MAX_DEPTH`].
    pub fn object(members: &OrderedMap) -> Result<Self, Error> {
        let mut text = String::from("{");
        for (position, (key, value)) in members.iter().enumerate() {
            if position > 0 {
                text.push(',');
            }
            text.push_str(key.token());
            text.push(':');
            value.write_json(&mut text);
        }
        text.push('}');
        Self::constructed(&text)
    }
}
