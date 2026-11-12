//! The parser (RQ-001 to RQ-010, RQ-017, RQ-026, RQ-035).

use std::sync::{Arc, OnceLock};

use crate::{
    value::{Node, COMPACT, ESCAPED, ROOT},
    Error, OrderedMap, Value, DEFAULT_REJECT_DUPLICATES, MAX_DEPTH,
};

/// The options of [`parse`] (RQ-035). A field left `None` takes its default.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct ParseOptions {
    /// The nesting limit, an integer from 0 through [`MAX_DEPTH`]; [`MAX_DEPTH`] by default (RQ-006).
    pub max_depth: Option<u64>,
    /// Refuses a repeated decoded object key; [`DEFAULT_REJECT_DUPLICATES`] by default (RQ-017).
    pub reject_duplicates: Option<bool>,
}

/// A rejection of the grammar, which takes its offset where it is raised.
#[derive(Debug, Clone, Copy)]
enum Reject {
    ExpectedValue,
    ExpectedDigit,
    ExpectedColon,
    ExpectedDelimiter,
    ExpectedObjectKey,
    InvalidEscape,
    InvalidUnicodeEscape,
    UnfinishedEscape,
    UnterminatedString,
    UnescapedControlCharacter,
    MaximumDepthExceeded,
    TrailingInput,
    DuplicateObjectKey,
}

/// The offset of a byte position: usize is at most 64 bits on every target of the crate (lib.rs).
const fn offset(position: usize) -> u64 {
    position as u64
}

impl Reject {
    fn at(self, position: usize) -> Error {
        let offset = offset(position);
        match self {
            Self::ExpectedValue => Error::ExpectedValue { offset },
            Self::ExpectedDigit => Error::ExpectedDigit { offset },
            Self::ExpectedColon => Error::ExpectedColon { offset },
            Self::ExpectedDelimiter => Error::ExpectedDelimiter { offset },
            Self::ExpectedObjectKey => Error::ExpectedObjectKey { offset },
            Self::InvalidEscape => Error::InvalidEscape { offset },
            Self::InvalidUnicodeEscape => Error::InvalidUnicodeEscape { offset },
            Self::UnfinishedEscape => Error::UnfinishedEscape { offset },
            Self::UnterminatedString => Error::UnterminatedString { offset },
            Self::UnescapedControlCharacter => Error::UnescapedControlCharacter { offset },
            Self::MaximumDepthExceeded => Error::MaximumDepthExceeded {
                offset: Some(offset),
            },
            Self::TrailingInput => Error::TrailingInput { offset },
            Self::DuplicateObjectKey => Error::DuplicateObjectKey { offset },
        }
    }
}

/// Parses a JSON text of UTF-8 bytes (RQ-026).
///
/// # Errors
///
/// [`Error::DepthLimitOutOfRange`] for a `max_depth` above [`MAX_DEPTH`], [`Error::InvalidUtf8`] for bytes that are not
/// UTF-8, and the rejection of the grammar at the first byte that makes the text invalid (RQ-004).
pub fn parse(source: &[u8], options: &ParseOptions) -> Result<Value, Error> {
    let max_depth = match options.max_depth {
        None => MAX_DEPTH,
        Some(limit) if limit <= MAX_DEPTH => limit,
        Some(_) => return Err(Error::DepthLimitOutOfRange),
    };
    let reject_duplicates = match options.reject_duplicates {
        Some(reject) => reject,
        None => DEFAULT_REJECT_DUPLICATES,
    };
    let text = std::str::from_utf8(source).map_err(|error| Error::InvalidUtf8 {
        offset: offset(error.valid_up_to()),
    })?;
    let mut parser = Parser {
        bytes: text.as_bytes(),
        source: Arc::from(text),
        pos: 0,
        max_depth,
        whitespace: 0,
        duplicates: 0,
        reject_duplicates,
        items: Vec::new(),
    };
    let mut value = parser.value(0)?;
    parser.ws();
    if parser.pos != text.len() {
        return Err(parser.error(Reject::TrailingInput));
    }
    value.flags |= ROOT;
    Ok(value)
}

struct Parser<'a> {
    bytes: &'a [u8],
    source: Arc<str>,
    pos: usize,
    max_depth: u64,
    whitespace: usize,
    duplicates: usize,
    reject_duplicates: bool,
    /// Pending items of the open arrays.
    items: Vec<Value>,
}

impl Parser<'_> {
    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.pos).copied()
    }

    fn error(&self, reject: Reject) -> Error {
        reject.at(self.pos)
    }

    /// IG-1: whitespace between tokens has no effect on the value; the count keeps a container's text exact.
    fn ws(&mut self) {
        let start = self.pos;
        while matches!(self.peek(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.pos += 1;
        }
        self.whitespace += self.pos - start;
    }

    fn expect(&mut self, byte: u8, reject: Reject) -> Result<(), Error> {
        if self.peek() != Some(byte) {
            return Err(self.error(reject));
        }
        self.pos += 1;
        Ok(())
    }

    fn new_value(&self, start: usize, flags: u8, node: Node) -> Value {
        Value {
            source: self.source.clone(),
            start,
            end: self.pos,
            flags,
            node,
        }
    }

    /// Validates a string token and returns its value flags.
    fn string(&mut self) -> Result<u8, Error> {
        self.expect(b'"', Reject::ExpectedObjectKey)?;
        let mut flags = COMPACT;
        while let Some(byte) = self.peek() {
            match byte {
                b'"' => {
                    self.pos += 1;
                    return Ok(flags);
                }
                0..=31 => return Err(self.error(Reject::UnescapedControlCharacter)),
                b'\\' => {
                    flags |= ESCAPED;
                    self.pos += 1;
                    let Some(escape) = self.peek() else {
                        return Err(self.error(Reject::UnfinishedEscape));
                    };
                    self.pos += 1;
                    if escape == b'u' {
                        for _ in 0..4 {
                            if !self.peek().is_some_and(|b| b.is_ascii_hexdigit()) {
                                return Err(self.error(Reject::InvalidUnicodeEscape));
                            }
                            self.pos += 1;
                        }
                    } else if !matches!(
                        escape,
                        b'"' | b'\\' | b'/' | b'b' | b'f' | b'n' | b'r' | b't'
                    ) {
                        // The escape character has been consumed; the offset names it.
                        return Err(Reject::InvalidEscape.at(self.pos - 1));
                    }
                }
                _ => self.pos += 1,
            }
        }
        Err(self.error(Reject::UnterminatedString))
    }

    fn digits(&mut self) -> Result<(), Error> {
        if !matches!(self.peek(), Some(b'0'..=b'9')) {
            return Err(self.error(Reject::ExpectedDigit));
        }
        while matches!(self.peek(), Some(b'0'..=b'9')) {
            self.pos += 1;
        }
        Ok(())
    }

    fn container(&mut self, depth: u64, object: bool) -> Result<Value, Error> {
        let start = self.pos;
        if depth >= self.max_depth {
            return Err(self.error(Reject::MaximumDepthExceeded));
        }
        let close = if object { b'}' } else { b']' };
        let (whitespace, duplicates) = (self.whitespace, self.duplicates);
        let mut members = OrderedMap::new();
        let base = self.items.len();
        self.pos += 1;
        self.ws();
        if self.peek() != Some(close) {
            loop {
                if object {
                    let key_start = self.pos;
                    let flags = self.string()?;
                    let key = self.new_value(key_start, flags, Node::String(OnceLock::new()));
                    if self.reject_duplicates && members.get_code_units(key.units()?)?.is_some() {
                        return Err(Reject::DuplicateObjectKey.at(key_start));
                    }
                    self.ws();
                    self.expect(b':', Reject::ExpectedColon)?;
                    let child = self.value(depth + 1)?;
                    // IG-2: a later member of the same decoded name replaces the value (RQ-001).
                    if members.set(key, child)?.is_some() {
                        self.duplicates += 1;
                    }
                } else {
                    let child = self.value(depth + 1)?;
                    self.items.push(child);
                }
                self.ws();
                if self.peek() == Some(close) {
                    break;
                }
                self.expect(b',', Reject::ExpectedDelimiter)?;
                self.ws();
            }
        }
        self.pos += 1;
        let unchanged = (self.whitespace, self.duplicates) == (whitespace, duplicates);
        let node = if object {
            Node::Object(members)
        } else if depth == 0 {
            // The root array is the last user of the pending item stack, so it takes the stack instead of copying
            // every item; large spare capacity is released.
            let mut items = std::mem::take(&mut self.items);
            if items.capacity() - items.len() > items.len() / 4 {
                items.shrink_to_fit();
            }
            Node::Array(items)
        } else {
            Node::Array(self.items.drain(base..).collect())
        };
        Ok(self.new_value(start, if unchanged { COMPACT } else { 0 }, node))
    }

    fn value(&mut self, depth: u64) -> Result<Value, Error> {
        self.ws();
        let start = self.pos;
        match self.peek() {
            Some(b'{') => self.container(depth, true),
            Some(b'[') => self.container(depth, false),
            Some(b'"') => {
                let flags = self.string()?;
                Ok(self.new_value(start, flags, Node::String(OnceLock::new())))
            }
            Some(b'-' | b'0'..=b'9') => {
                if self.peek() == Some(b'-') {
                    self.pos += 1;
                }
                if self.peek() == Some(b'0') {
                    self.pos += 1;
                } else {
                    self.digits()?;
                }
                if self.peek() == Some(b'.') {
                    self.pos += 1;
                    self.digits()?;
                }
                if matches!(self.peek(), Some(b'e' | b'E')) {
                    self.pos += 1;
                    if matches!(self.peek(), Some(b'+' | b'-')) {
                        self.pos += 1;
                    }
                    self.digits()?;
                }
                Ok(self.new_value(start, COMPACT, Node::Number))
            }
            _ => {
                let tail = &self.bytes[self.pos..];
                let (length, node) = if tail.starts_with(b"true") {
                    (4, Node::Boolean)
                } else if tail.starts_with(b"false") {
                    (5, Node::Boolean)
                } else if tail.starts_with(b"null") {
                    (4, Node::Null)
                } else {
                    return Err(self.error(Reject::ExpectedValue));
                };
                self.pos += length;
                Ok(self.new_value(start, COMPACT, node))
            }
        }
    }
}
