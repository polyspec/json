//! Ordered, immutable JSON values. See [`parse`] and [`Value`].
use std::{
    collections::{hash_map::RandomState, HashMap},
    fmt,
    hash::{BuildHasher, BuildHasherDefault, Hasher},
    sync::{Arc, OnceLock},
};

pub const MAX_DEPTH: usize = 256;

mod serde;

/// Why the crate refused an input, named by the shared lists of rejection kinds and argument kinds of
/// docs/spec/json-contract.md; `DuplicateObjectKey` is the rejection of the strict parse, and the last four are the
/// refused arguments of the API. Every error of the crate carries one of them, and no other kind exists.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ErrorKind {
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
    InvalidUtf8,
    MaximumDepthExceeded,
    TrailingInput,
    DuplicateObjectKey,
    /// `OrderedMap::insert` of a key that is not a string.
    NonStringKey,
    /// `Value::string_value` of a value of another kind.
    WrongKind,
    /// `Value::number` of a literal that is a JSON value of another kind or holds whitespace.
    InvalidNumberLiteral,
    /// `parse_with_max_depth` with a limit above [`MAX_DEPTH`].
    DepthLimitOutOfRange,
}
impl ErrorKind {
    /// The name of the kind, the same in every implementation.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::ExpectedValue => "expected_value",
            Self::ExpectedDigit => "expected_digit",
            Self::ExpectedColon => "expected_colon",
            Self::ExpectedDelimiter => "expected_delimiter",
            Self::ExpectedObjectKey => "expected_object_key",
            Self::InvalidEscape => "invalid_escape",
            Self::InvalidUnicodeEscape => "invalid_unicode_escape",
            Self::UnfinishedEscape => "unfinished_escape",
            Self::UnterminatedString => "unterminated_string",
            Self::UnescapedControlCharacter => "unescaped_control_character",
            Self::InvalidUtf8 => "invalid_utf8",
            Self::MaximumDepthExceeded => "maximum_depth_exceeded",
            Self::TrailingInput => "trailing_input",
            Self::DuplicateObjectKey => "duplicate_object_key",
            Self::NonStringKey => "non_string_key",
            Self::WrongKind => "wrong_kind",
            Self::InvalidNumberLiteral => "invalid_number_literal",
            Self::DepthLimitOutOfRange => "depth_limit_out_of_range",
        }
    }
    /// The Rust wording of the kind.
    pub fn message(self) -> &'static str {
        match self {
            Self::ExpectedValue => "expected JSON value",
            Self::ExpectedDigit => "expected digit",
            Self::ExpectedColon => "expected colon",
            Self::ExpectedDelimiter => "expected comma or closing delimiter",
            Self::ExpectedObjectKey => "expected string",
            Self::InvalidEscape => "invalid escape",
            Self::InvalidUnicodeEscape => "invalid Unicode escape",
            Self::UnfinishedEscape => "unfinished escape",
            Self::UnterminatedString => "unterminated string",
            Self::UnescapedControlCharacter => "unescaped control character",
            Self::InvalidUtf8 => "invalid UTF-8",
            Self::MaximumDepthExceeded => "maximum nesting depth exceeded",
            Self::TrailingInput => "unexpected trailing input",
            Self::DuplicateObjectKey => "duplicate object key",
            Self::NonStringKey => "object key must be a string",
            Self::WrongKind => "expected a string value",
            Self::InvalidNumberLiteral => "expected a number literal without whitespace",
            Self::DepthLimitOutOfRange => "max_depth exceeds 256",
        }
    }
}
impl fmt::Display for ErrorKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Error {
    /// Byte offset into the UTF-8 input (zero for an argument error).
    pub offset: usize,
    kind: ErrorKind,
}
impl Error {
    /// Why the input was refused.
    pub fn kind(&self) -> ErrorKind {
        self.kind
    }
    pub fn message(&self) -> &'static str {
        self.kind.message()
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} at byte {}", self.message(), self.offset)
    }
}
impl std::error::Error for Error {}
type Result<T> = std::result::Result<T, Error>;
/// An argument error, which has no position in an input.
fn error(kind: ErrorKind) -> Error {
    Error { offset: 0, kind }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Object,
    Array,
    String,
    Number,
    Boolean,
    Null,
}

/// Objects with more members than this keep a hash index; smaller ones scan linearly.
const LINEAR_MEMBERS: usize = 8;
/// The value serializes to exactly its source token: it contains no
/// insignificant whitespace and no duplicate object keys.
const COMPACT: u8 = 1;
/// A parse result; its raw text includes surrounding whitespace.
const ROOT: u8 = 2;
/// A string token that contains escape sequences.
const ESCAPED: u8 = 4;

/// Passes through the precomputed key hashes stored in [`Index`].
#[derive(Default)]
struct IdentityHasher(u64);
impl Hasher for IdentityHasher {
    fn finish(&self) -> u64 {
        self.0
    }
    fn write(&mut self, bytes: &[u8]) {
        for &byte in bytes {
            self.0 = self.0.rotate_left(8) ^ u64::from(byte);
        }
    }
    fn write_u64(&mut self, hash: u64) {
        self.0 = hash;
    }
}

/// Key positions by the hash of each key's UTF-16 units, encoded as WTF-8.
#[derive(Debug, Clone, Default)]
struct Index {
    state: RandomState,
    slots: HashMap<u64, usize, BuildHasherDefault<IdentityHasher>>,
}

fn hash_bytes(state: &RandomState, bytes: &[u8]) -> u64 {
    let mut hasher = state.build_hasher();
    hasher.write(bytes);
    hasher.finish()
}
/// Hashes units as WTF-8, which matches the UTF-8 bytes of an unescaped key.
fn hash_units(state: &RandomState, units: &[u16]) -> u64 {
    let mut hasher = state.build_hasher();
    let mut buffer = [0; 4];
    for unit in char::decode_utf16(units.iter().copied()) {
        match unit {
            Ok(ch) => hasher.write(ch.encode_utf8(&mut buffer).as_bytes()),
            Err(lone) => {
                let u = lone.unpaired_surrogate();
                hasher.write(&[
                    0xe0 | (u >> 12) as u8,
                    0x80 | ((u >> 6) & 0x3f) as u8,
                    0x80 | (u & 0x3f) as u8,
                ]);
            }
        }
    }
    hasher.finish()
}

/// An associative map that keeps each key's first insertion position.
#[derive(Debug, Clone, Default)]
pub struct OrderedMap {
    entries: Vec<(Value, Value)>,
    index: Option<Box<Index>>,
}
impl OrderedMap {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn insert(&mut self, key: Value, value: Value) -> Result<Option<Value>> {
        if key.kind() != Kind::String {
            return Err(error(ErrorKind::NonStringKey));
        }
        Ok(self.set(key, value))
    }
    /// Inserts under a string key; a repeated key keeps its first token and position.
    fn set(&mut self, key: Value, value: Value) -> Option<Value> {
        if let Some(position) = self.find(
            |state| key.key_hash(state),
            |existing| existing.same_key(&key),
        ) {
            return Some(std::mem::replace(&mut self.entries[position].1, value));
        }
        let position = self.entries.len();
        if let Some(index) = &mut self.index {
            let hash = key.key_hash(&index.state);
            index.slots.entry(hash).or_insert(position);
        }
        self.entries.push((key, value));
        if self.index.is_none() && self.entries.len() > LINEAR_MEMBERS {
            let mut index = Box::<Index>::default();
            for (position, (key, _)) in self.entries.iter().enumerate() {
                let hash = key.key_hash(&index.state);
                index.slots.entry(hash).or_insert(position);
            }
            self.index = Some(index);
        }
        None
    }
    fn find(
        &self,
        hash: impl FnOnce(&RandomState) -> u64,
        matches: impl Fn(&Value) -> bool,
    ) -> Option<usize> {
        if let Some(index) = &self.index {
            match index.slots.get(&hash(&index.state)) {
                None => return None,
                Some(&position) if matches(&self.entries[position].0) => return Some(position),
                Some(_) => {} // A hash collision; the key may still be present.
            }
        }
        self.entries.iter().position(|(key, _)| matches(key))
    }
    pub fn get(&self, key: &str) -> Option<&Value> {
        self.find(
            |state| hash_bytes(state, key.as_bytes()),
            |existing| existing.key_is_str(key),
        )
        .map(|position| &self.entries[position].1)
    }
    pub fn get_units(&self, key: &[u16]) -> Option<&Value> {
        self.find(
            |state| hash_units(state, key),
            |existing| existing.key_is_units(key),
        )
        .map(|position| &self.entries[position].1)
    }
    pub fn iter(&self) -> impl DoubleEndedIterator<Item = (&Value, &Value)> {
        self.entries.iter().map(|(key, value)| (key, value))
    }
    pub fn len(&self) -> usize {
        self.entries.len()
    }
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

#[derive(Debug, Clone)]
enum Node {
    Object(OrderedMap),
    Array(Vec<Value>),
    /// UTF-16 units, decoded from the source token on first use.
    String(OnceLock<Box<[u16]>>),
    Number,
    Boolean,
    Null,
}

#[derive(Debug, Clone)]
pub struct Value {
    source: Arc<str>,
    /// The value token; a root's raw text also includes surrounding whitespace.
    start: usize,
    end: usize,
    flags: u8,
    node: Node,
}

/// Decodes the contents of a validated string token.
fn decode_units(content: &str) -> Box<[u16]> {
    let bytes = content.as_bytes();
    let mut units = Vec::with_capacity(content.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'\\' => {
                let escape = bytes[i + 1];
                i += 2;
                units.push(match escape {
                    b'u' => {
                        i += 4;
                        u16::from_str_radix(&content[i - 4..i], 16).unwrap()
                    }
                    b'b' => 8,
                    b'f' => 12,
                    b'n' => 10,
                    b'r' => 13,
                    b't' => 9,
                    other => u16::from(other),
                });
            }
            byte if byte < 0x80 => {
                units.push(u16::from(byte));
                i += 1;
            }
            _ => {
                let ch = content[i..].chars().next().unwrap();
                units.extend_from_slice(ch.encode_utf16(&mut [0; 2]));
                i += ch.len_utf8();
            }
        }
    }
    units.into_boxed_slice()
}

impl Value {
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
    pub fn raw(&self) -> &str {
        if self.flags & ROOT != 0 {
            &self.source
        } else {
            self.token()
        }
    }
    fn token(&self) -> &str {
        &self.source[self.start..self.end]
    }
    fn content(&self) -> &str {
        &self.source[self.start + 1..self.end - 1]
    }
    pub fn members(&self) -> Option<&OrderedMap> {
        match &self.node {
            Node::Object(members) => Some(members),
            _ => None,
        }
    }
    pub fn items(&self) -> Option<&[Value]> {
        match &self.node {
            Node::Array(items) => Some(items),
            _ => None,
        }
    }
    /// UTF-16 code units also represent escaped, unpaired surrogates losslessly.
    pub fn string_units(&self) -> Option<&[u16]> {
        match &self.node {
            Node::String(units) => Some(units.get_or_init(|| decode_units(self.content()))),
            _ => None,
        }
    }
    /// The UTF-8 bytes of the string; an unpaired surrogate is its three WTF-8 bytes, so the bytes are valid UTF-8 unless
    /// the string holds one, which a Rust `String` cannot.
    pub fn string_value(&self) -> Result<Vec<u8>> {
        if !matches!(self.node, Node::String(_)) {
            return Err(error(ErrorKind::WrongKind));
        }
        if self.flags & ESCAPED == 0 {
            return Ok(self.content().as_bytes().to_vec());
        }
        let units = self.string_units().unwrap();
        let mut bytes = Vec::with_capacity(units.len());
        let mut index = 0;
        while index < units.len() {
            let unit = u32::from(units[index]);
            index += 1;
            let point = match units.get(index).map(|next| u32::from(*next)) {
                Some(low @ 0xdc00..=0xdfff) if (0xd800..=0xdbff).contains(&unit) => {
                    index += 1;
                    0x10000 + ((unit - 0xd800) << 10) + (low - 0xdc00)
                }
                _ => unit,
            };
            match point {
                0..=0x7f => bytes.push(point as u8),
                0x80..=0x7ff => {
                    bytes.extend([0xc0 | (point >> 6) as u8, 0x80 | (point & 63) as u8])
                }
                0x800..=0xffff => bytes.extend([
                    0xe0 | (point >> 12) as u8,
                    0x80 | ((point >> 6) & 63) as u8,
                    0x80 | (point & 63) as u8,
                ]),
                _ => bytes.extend([
                    0xf0 | (point >> 18) as u8,
                    0x80 | ((point >> 12) & 63) as u8,
                    0x80 | ((point >> 6) & 63) as u8,
                    0x80 | (point & 63) as u8,
                ]),
            }
        }
        Ok(bytes)
    }
    pub fn number_literal(&self) -> Option<&str> {
        matches!(self.node, Node::Number).then(|| self.raw().trim())
    }
    pub fn boolean_value(&self) -> Option<bool> {
        matches!(self.node, Node::Boolean).then(|| self.raw().trim() == "true")
    }
    pub fn get(&self, key: &str) -> Option<&Value> {
        self.members().and_then(|members| members.get(key))
    }
    pub fn get_units(&self, key: &[u16]) -> Option<&Value> {
        self.members().and_then(|members| members.get_units(key))
    }
    fn key_hash(&self, state: &RandomState) -> u64 {
        if self.flags & ESCAPED == 0 {
            hash_bytes(state, self.content().as_bytes())
        } else {
            hash_units(state, self.string_units().unwrap())
        }
    }
    // Unescaped string contents are UTF-8, so equal contents mean equal units.
    fn same_key(&self, other: &Value) -> bool {
        if (self.flags | other.flags) & ESCAPED == 0 {
            self.content() == other.content()
        } else {
            self.string_units() == other.string_units()
        }
    }
    fn key_is_str(&self, key: &str) -> bool {
        if self.flags & ESCAPED == 0 {
            self.content() == key
        } else {
            self.string_units()
                .unwrap()
                .iter()
                .copied()
                .eq(key.encode_utf16())
        }
    }
    fn key_is_units(&self, key: &[u16]) -> bool {
        if self.flags & ESCAPED == 0 {
            self.content().encode_utf16().eq(key.iter().copied())
        } else {
            self.string_units() == Some(key)
        }
    }
    pub fn string(text: &str) -> Self {
        Self::from_units(&text.encode_utf16().collect::<Vec<_>>())
    }
    /// Construct a JSON string without replacing unpaired surrogates.
    pub fn from_units(units: &[u16]) -> Self {
        use std::fmt::Write;
        let mut out = String::from("\"");
        for &unit in units {
            match unit {
                34 => out.push_str("\\\""),
                92 => out.push_str("\\\\"),
                8 => out.push_str("\\b"),
                12 => out.push_str("\\f"),
                10 => out.push_str("\\n"),
                13 => out.push_str("\\r"),
                9 => out.push_str("\\t"),
                0x20..=0x7e => out.push(char::from_u32(unit as u32).unwrap()),
                _ => write!(out, "\\u{unit:04x}").unwrap(),
            }
        }
        out.push('"');
        parse(&out).expect("encoded string is valid JSON")
    }
    pub fn number(literal: &str) -> Result<Self> {
        let value = parse(literal)?;
        if value.kind() != Kind::Number || literal.trim() != literal {
            return Err(error(ErrorKind::InvalidNumberLiteral));
        }
        Ok(value)
    }
    pub fn boolean(value: bool) -> Self {
        parse(if value { "true" } else { "false" }).unwrap()
    }
    pub fn null() -> Self {
        parse("null").unwrap()
    }
    pub fn array(items: &[Value]) -> Result<Self> {
        parse(&format!(
            "[{}]",
            items
                .iter()
                .map(Self::compact)
                .collect::<Vec<_>>()
                .join(",")
        ))
    }
    pub fn object(members: &OrderedMap) -> Result<Self> {
        let mut parts = Vec::with_capacity(members.len());
        for (key, value) in members.iter() {
            parts.push(format!("{}:{}", key.raw().trim(), value.compact()));
        }
        parse(&format!("{{{}}}", parts.join(",")))
    }
    /// Serialize the associative maps in insertion order, retaining scalar tokens.
    pub fn compact(&self) -> String {
        if self.flags & COMPACT != 0 {
            return self.token().to_owned();
        }
        let mut out = String::with_capacity(self.end - self.start);
        self.write_json(&mut out);
        out
    }
    fn write_json(&self, out: &mut String) {
        if self.flags & COMPACT != 0 {
            out.push_str(self.token());
            return;
        }
        match &self.node {
            Node::Object(members) => {
                out.push('{');
                for (i, (key, value)) in members.entries.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    out.push_str(key.token());
                    out.push(':');
                    value.write_json(out);
                }
                out.push('}');
            }
            Node::Array(items) => {
                out.push('[');
                for (i, item) in items.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    item.write_json(out);
                }
                out.push(']');
            }
            _ => out.push_str(self.token()),
        }
    }
}
impl fmt::Display for Value {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.compact())
    }
}

pub fn stringify(value: &Value) -> String {
    value.compact()
}
pub fn parse(source: &str) -> Result<Value> {
    parse_with_max_depth(source, MAX_DEPTH)
}
pub fn parse_bytes(source: &[u8]) -> Result<Value> {
    parse_bytes_internal(source, false)
}
pub fn parse_bytes_reject_duplicates(source: &[u8]) -> Result<Value> {
    parse_bytes_internal(source, true)
}
fn parse_bytes_internal(source: &[u8], reject_duplicates: bool) -> Result<Value> {
    let text = std::str::from_utf8(source).map_err(|e| Error {
        offset: e.valid_up_to(),
        kind: ErrorKind::InvalidUtf8,
    })?;
    parse_internal(text, MAX_DEPTH, reject_duplicates)
}
pub fn parse_with_max_depth(source: &str, max_depth: usize) -> Result<Value> {
    parse_internal(source, max_depth, false)
}
fn parse_internal(source: &str, max_depth: usize, reject_duplicates: bool) -> Result<Value> {
    if max_depth > MAX_DEPTH {
        return Err(error(ErrorKind::DepthLimitOutOfRange));
    }
    let mut p = Parser {
        bytes: source.as_bytes(),
        source: Arc::from(source),
        pos: 0,
        max_depth,
        whitespace: 0,
        duplicates: 0,
        reject_duplicates,
        items: Vec::new(),
    };
    let mut value = p.value(0)?;
    p.ws();
    if p.pos != source.len() {
        return Err(p.error(ErrorKind::TrailingInput));
    }
    value.flags |= ROOT;
    Ok(value)
}

struct Parser<'a> {
    bytes: &'a [u8],
    source: Arc<str>,
    pos: usize,
    max_depth: usize,
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
    fn error(&self, kind: ErrorKind) -> Error {
        Error {
            offset: self.pos,
            kind,
        }
    }
    fn ws(&mut self) {
        let start = self.pos;
        while matches!(self.peek(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.pos += 1;
        }
        self.whitespace += self.pos - start;
    }
    fn expect(&mut self, byte: u8, kind: ErrorKind) -> Result<()> {
        if self.peek() != Some(byte) {
            return Err(self.error(kind));
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
    fn string(&mut self) -> Result<u8> {
        self.expect(b'"', ErrorKind::ExpectedObjectKey)?;
        let mut flags = COMPACT;
        while let Some(byte) = self.peek() {
            match byte {
                b'"' => {
                    self.pos += 1;
                    return Ok(flags);
                }
                0..=31 => return Err(self.error(ErrorKind::UnescapedControlCharacter)),
                b'\\' => {
                    flags |= ESCAPED;
                    self.pos += 1;
                    let escape = self
                        .peek()
                        .ok_or_else(|| self.error(ErrorKind::UnfinishedEscape))?;
                    self.pos += 1;
                    if escape == b'u' {
                        for _ in 0..4 {
                            if !self.peek().is_some_and(|b| b.is_ascii_hexdigit()) {
                                return Err(self.error(ErrorKind::InvalidUnicodeEscape));
                            }
                            self.pos += 1;
                        }
                    } else if !matches!(
                        escape,
                        b'"' | b'\\' | b'/' | b'b' | b'f' | b'n' | b'r' | b't'
                    ) {
                        // The escape character has been consumed; the offset names it.
                        return Err(Error {
                            offset: self.pos - 1,
                            kind: ErrorKind::InvalidEscape,
                        });
                    }
                }
                _ => self.pos += 1,
            }
        }
        Err(self.error(ErrorKind::UnterminatedString))
    }
    fn digits(&mut self) -> Result<()> {
        if !matches!(self.peek(), Some(b'0'..=b'9')) {
            return Err(self.error(ErrorKind::ExpectedDigit));
        }
        while matches!(self.peek(), Some(b'0'..=b'9')) {
            self.pos += 1;
        }
        Ok(())
    }
    fn value(&mut self, depth: usize) -> Result<Value> {
        self.ws();
        let start = self.pos;
        match self.peek() {
            Some(open @ (b'{' | b'[')) => {
                if depth >= self.max_depth {
                    return Err(self.error(ErrorKind::MaximumDepthExceeded));
                }
                let object = open == b'{';
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
                            let key =
                                self.new_value(key_start, flags, Node::String(OnceLock::new()));
                            if self.reject_duplicates
                                && members.get_units(key.string_units().unwrap()).is_some()
                            {
                                return Err(Error {
                                    offset: key_start,
                                    kind: ErrorKind::DuplicateObjectKey,
                                });
                            }
                            self.ws();
                            self.expect(b':', ErrorKind::ExpectedColon)?;
                            let child = self.value(depth + 1)?;
                            if members.set(key, child).is_some() {
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
                        self.expect(b',', ErrorKind::ExpectedDelimiter)?;
                        self.ws();
                    }
                }
                self.pos += 1;
                let unchanged = (self.whitespace, self.duplicates) == (whitespace, duplicates);
                let node = if object {
                    Node::Object(members)
                } else if depth == 0 {
                    // The root array is the last user of the pending item stack, so it takes the
                    // stack instead of copying every item; large spare capacity is released.
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
                    return Err(self.error(ErrorKind::ExpectedValue));
                };
                self.pos += length;
                Ok(self.new_value(start, COMPACT, node))
            }
        }
    }
}
