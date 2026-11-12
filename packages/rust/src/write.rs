//! The serializer (RQ-011, RQ-031, RQ-034) and the escapes of the string constructors (RQ-028).

use std::fmt;

use crate::{
    value::{Node, COMPACT},
    Value, DEFAULT_HTML_SAFE,
};

const HEX: &[u8; 16] = b"0123456789abcdef";

/// Writes `\u` and the four lowercase hex digits of a code unit (RQ-028).
pub(crate) fn quote_unit(out: &mut String, unit: u16) {
    out.push_str("\\u");
    for shift in [12, 8, 4, 0] {
        out.push(char::from(HEX[usize::from((unit >> shift) & 0xf)]));
    }
}

/// Writes a character of a string token with the escapes of RQ-028 and tells whether it wrote an escape.
pub(crate) fn quote_char(out: &mut String, ch: char) -> bool {
    let escape = match ch {
        '"' => "\\\"",
        '\\' => "\\\\",
        '\u{8}' => "\\b",
        '\t' => "\\t",
        '\n' => "\\n",
        '\u{c}' => "\\f",
        '\r' => "\\r",
        '\u{0}'..='\u{1f}' => {
            let mut units = [0; 2];
            for &unit in ch.encode_utf16(&mut units).iter() {
                quote_unit(out, unit);
            }
            return true;
        }
        _ => {
            out.push(ch);
            return false;
        }
    };
    out.push_str(escape);
    true
}

/// The options of [`stringify`] (RQ-031, RQ-035). A field left `None` takes its default.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct StringifyOptions {
    /// Writes `<`, `>`, `&`, U+2028 and U+2029 of string tokens as `\u` escapes; [`DEFAULT_HTML_SAFE`] by default.
    pub html_safe: Option<bool>,
}

/// The JSON text of a value: each object key once, in its first position, with its last value, and the source tokens
/// of scalars and keys (RQ-011), with the escapes of `html_safe` (RQ-031).
#[must_use]
pub fn stringify(value: &Value, options: &StringifyOptions) -> String {
    let text = value.to_string();
    let html_safe = match options.html_safe {
        Some(html_safe) => html_safe,
        None => DEFAULT_HTML_SAFE,
    };
    if !html_safe {
        return text;
    }
    // RQ-031: these characters stand in a JSON text only inside string tokens, so the whole text is rewritten.
    let mut out = String::with_capacity(text.len());
    for ch in text.chars() {
        match ch {
            '<' => out.push_str("\\u003c"),
            '>' => out.push_str("\\u003e"),
            '&' => out.push_str("\\u0026"),
            '\u{2028}' => out.push_str("\\u2028"),
            '\u{2029}' => out.push_str("\\u2029"),
            _ => out.push(ch),
        }
    }
    out
}

impl Value {
    /// Appends the compact text of the value.
    pub(crate) fn write_json(&self, out: &mut String) {
        if self.flags & COMPACT != 0 {
            out.push_str(self.token());
            return;
        }
        match &self.node {
            Node::Object(members) => {
                out.push('{');
                for (position, (key, value)) in members.iter().enumerate() {
                    if position > 0 {
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
                for (position, item) in items.iter().enumerate() {
                    if position > 0 {
                        out.push(',');
                    }
                    item.write_json(out);
                }
                out.push(']');
            }
            Node::String(_) | Node::Number | Node::Boolean | Node::Null => {
                out.push_str(self.token())
            }
        }
    }
}

/// The text of [`stringify`] with the default options: the string hook of every language (RQ-034).
impl fmt::Display for Value {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.flags & COMPACT != 0 {
            return f.write_str(self.token());
        }
        let mut out = String::with_capacity(self.end - self.start);
        self.write_json(&mut out);
        f.write_str(&out)
    }
}
