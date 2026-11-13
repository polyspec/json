//! Ordered, immutable JSON values: the Rust core of json (docs/spec/json-contract.md). See [`parse`],
//! [`stringify`] and [`Value`].

mod error;
mod host;
mod map;
mod number;
mod parse;
mod serde;
mod value;
mod write;

pub use error::Error;
pub use host::{value_in, value_out, ValueOut};
pub use map::OrderedMap;
pub use number::number_text;
pub use parse::{parse, ParseOptions};
pub use value::{Kind, Value};
pub use write::{stringify, StringifyOptions};

/// The fault injection points of the crate (binding design G-5, X-1; RQ-033), which the interface contract names in
/// `faults`. A point does nothing unless the feature `fault-test` is on.
pub mod fault {
    /// The position of a member of an ordered map, treated as outside its entries: the kind `internal`, which no input
    /// reaches.
    #[doc(hidden)]
    pub const INTERNAL: &str = "json.internal";
}

// Byte positions and lengths become u64 offsets with `as`, which is exact while usize has at most 64 bits.
const _: () = assert!(usize::BITS <= u64::BITS);

/// The largest nesting depth of parsing, the default of `max_depth` (RQ-006, RQ-035).
pub const MAX_DEPTH: u64 = 256;
/// The default of [`ParseOptions::reject_duplicates`] (RQ-035).
pub const DEFAULT_REJECT_DUPLICATES: bool = false;
/// The default of [`StringifyOptions::html_safe`] (RQ-031).
pub const DEFAULT_HTML_SAFE: bool = false;
