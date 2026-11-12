//! Ordered, immutable JSON values: the Rust core of ordered-json (docs/spec/json-contract.md). See [`parse`],
//! [`stringify`] and [`Value`].

mod error;
mod map;
mod number;
mod parse;
mod serde;
mod value;
mod write;

pub use error::Error;
pub use map::OrderedMap;
pub use number::number_text;
pub use parse::{parse, ParseOptions};
pub use value::{Kind, Value};
pub use write::{stringify, StringifyOptions};

// Byte positions and lengths become u64 offsets with `as`, which is exact while usize has at most 64 bits.
const _: () = assert!(usize::BITS <= u64::BITS);

/// The largest nesting depth of parsing, the default of `max_depth` (RQ-006, RQ-035).
pub const MAX_DEPTH: u64 = 256;
/// The default of [`ParseOptions::reject_duplicates`] (RQ-035).
pub const DEFAULT_REJECT_DUPLICATES: bool = false;
/// The default of [`StringifyOptions::html_safe`] (RQ-031).
pub const DEFAULT_HTML_SAFE: bool = false;
