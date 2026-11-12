//! Helpers of the package tests.
#![allow(dead_code, reason = "R-1: each test file uses a part of the helpers")]

use polyspec_ordered_json::{parse, stringify, Error, ParseOptions, StringifyOptions, Value};

/// The default parse of a text.
pub fn json(source: &str) -> Result<Value, Error> {
    parse(source.as_bytes(), &ParseOptions::default())
}

/// The default parse of a text that the test knows to be valid.
pub fn valid(source: &str) -> Value {
    match json(source) {
        Ok(value) => value,
        Err(error) => panic!("{source}: {error}"),
    }
}

/// The default serialization.
pub fn text(value: &Value) -> String {
    stringify(value, &StringifyOptions::default())
}

/// The UTF-16 code units of a text as the integers of the API.
pub fn units(text: &str) -> Vec<u64> {
    text.encode_utf16().map(u64::from).collect()
}
