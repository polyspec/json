//! The conversion of a json value for a binding of another repository (RQ-036, binding GN-6x): the class `value` names
//! these two functions in `core: {in, out}`. A value leaves one level at a time as the `OutValue` of binding_core, a
//! string as its text and a string with an unpaired surrogate as its UTF-16 code units, and enters from the description
//! that the `in` row of the class gives.

use crate::value::Node;
use crate::{Error, OrderedMap, Value, MAX_DEPTH};
use binding_core::{
    Failure, Handle, HostText, HostValue, HostValues, MapOut, OutValue, OutValues, ValueKind,
};

/// Builds a value from the description of an instance of the class `value` that a generated binding gives: a text in
/// any units of its language by its UTF-16 code units, a number by its token, a list and a map of members by the
/// constructors (RQ-015, RQ-036). The children of a container are asked for through `host`. The walk keeps the open
/// containers on a stack of its own, so its use of the call stack does not grow with the depth of the value.
///
/// # Errors
///
/// `Failure::Kind` with [`Error::InvalidUtf8`] for a text of bytes that is not UTF-8, with
/// [`Error::MaximumDepthExceeded`] for a container deeper than [`MAX_DEPTH`], with [`Error::NonStringKey`] for a key
/// that is a container, with the error of a constructor, and with [`Error::Internal`] for a description that no `in`
/// row of `value` gives; `Failure::Raised` with the exception that language code raised while the binding answered a
/// question.
pub fn value_in(host: &mut dyn HostValues, value: HostValue) -> Result<Value, Failure<Error>> {
    let mut open: Vec<Open> = Vec::new();
    let mut next = value;
    loop {
        let mut done = match resolve(host, next)? {
            Resolved::Done(value) => Some(value),
            Resolved::List { handle, len } => {
                deeper(&open)?;
                open.push(Open::List {
                    handle,
                    len,
                    items: Vec::new(),
                });
                None
            }
            Resolved::Map { handle, len } => {
                deeper(&open)?;
                open.push(Open::Map {
                    handle,
                    len,
                    members: OrderedMap::new(),
                    key: None,
                });
                None
            }
        };
        // Gives the finished value to the container that waits for it, and asks for the next child, or closes the
        // containers that have all their children.
        next = loop {
            let Some(top) = open.last_mut() else {
                return match done {
                    Some(value) => Ok(value),
                    None => Err(Failure::Kind(BROKEN)),
                };
            };
            match top {
                Open::List { handle, len, items } => {
                    if let Some(value) = done.take() {
                        items.push(value);
                    }
                    let index = count(items.len());
                    if index < *len {
                        break host.item(*handle, index)?;
                    }
                    let value = Value::array(items).map_err(Failure::Kind)?;
                    open.pop();
                    done = Some(value);
                }
                Open::Map {
                    handle,
                    len,
                    members,
                    key,
                } => {
                    if let Some(value) = done.take() {
                        let Some(key) = key.take() else {
                            return Err(Failure::Kind(BROKEN));
                        };
                        members.insert(key, value).map_err(Failure::Kind)?;
                    }
                    let index = members.len();
                    if index < *len {
                        let (named, item) = host.entry(*handle, index)?;
                        *key = Some(match resolve(host, named)? {
                            Resolved::Done(value) => value,
                            Resolved::List { .. } | Resolved::Map { .. } => {
                                return Err(Failure::Kind(Error::NonStringKey))
                            }
                        });
                        break item;
                    }
                    let value = Value::object(members).map_err(Failure::Kind)?;
                    open.pop();
                    done = Some(value);
                }
            }
        };
    }
}

/// A container whose children the walk of [`value_in`] asks for, with the children it has.
enum Open {
    List {
        handle: Handle,
        len: u64,
        items: Vec<Value>,
    },
    Map {
        handle: Handle,
        len: u64,
        members: OrderedMap,
        key: Option<Value>,
    },
}

/// A description read to its content: a value without children, or a container that the walk opens.
enum Resolved {
    Done(Value),
    List { handle: Handle, len: u64 },
    Map { handle: Handle, len: u64 },
}

/// The walk of [`value_in`] gives each finished value to the container on top of its stack; only a defect of the walk
/// reaches this error.
const BROKEN: Error = Error::Internal {
    what: "value_in: the walk lost the place of a value",
};

/// The content of a description: an instance of `value` is read by the `read` member of its case, at most once, since
/// a read gives the content and never an instance again.
fn resolve(host: &mut dyn HostValues, value: HostValue) -> Result<Resolved, Failure<Error>> {
    let content = match value {
        HostValue::Value { kind, handle } => match kind {
            ValueKind::Null => return Ok(Resolved::Done(Value::null())),
            ValueKind::Number => {
                return match host.read(handle)? {
                    // value.number_literal gives the token as a text of the language.
                    HostValue::Text(text) => {
                        match String::from_utf16(&units(text).map_err(Failure::Kind)?) {
                            Ok(token) => Value::number(&token)
                                .map(Resolved::Done)
                                .map_err(Failure::Kind),
                            Err(_) => Err(Failure::Kind(Error::InvalidNumberLiteral)),
                        }
                    }
                    _ => Err(Failure::Kind(not_described())),
                };
            }
            ValueKind::Bool
            | ValueKind::Text
            | ValueKind::Text16
            | ValueKind::List
            | ValueKind::Map => host.read(handle)?,
            _ => return Err(Failure::Kind(not_described())),
        },
        other => other,
    };
    match content {
        HostValue::Null => Ok(Resolved::Done(Value::null())),
        HostValue::Bool(value) => Ok(Resolved::Done(Value::boolean(value))),
        HostValue::Text(text) => string(text).map(Resolved::Done).map_err(Failure::Kind),
        HostValue::List { handle, len } => Ok(Resolved::List { handle, len }),
        HostValue::Map { handle, len } => Ok(Resolved::Map { handle, len }),
        _ => Err(Failure::Kind(not_described())),
    }
}

/// [`Error::MaximumDepthExceeded`] when one more open container would be deeper than [`MAX_DEPTH`] (RQ-006).
fn deeper(open: &[Open]) -> Result<(), Failure<Error>> {
    if count(open.len()) >= MAX_DEPTH {
        return Err(Failure::Kind(Error::MaximumDepthExceeded { offset: None }));
    }
    Ok(())
}

/// The UTF-16 code units of a text of a language: JavaScript gives them, Python gives code points, and PHP and Go give
/// bytes, which are UTF-8 or [`Error::InvalidUtf8`] at the offset of the first byte that is not (RQ-007).
fn units(text: HostText) -> Result<Vec<u16>, Error> {
    match text {
        HostText::Utf16(units) => Ok(units),
        HostText::CodePoints(points) => {
            let mut units = Vec::with_capacity(points.len());
            for point in points {
                match u16::try_from(point) {
                    Ok(unit) => units.push(unit),
                    Err(_) => match char::from_u32(point) {
                        Some(ch) => units.extend_from_slice(ch.encode_utf16(&mut [0; 2])),
                        None => return Err(Error::InvalidCodeUnit),
                    },
                }
            }
            Ok(units)
        }
        HostText::Bytes(bytes) => match std::str::from_utf8(&bytes) {
            Ok(text) => Ok(text.encode_utf16().collect()),
            Err(error) => Err(Error::InvalidUtf8 {
                offset: count(error.valid_up_to()),
            }),
        },
    }
}

/// A string from a text of a language: a Unicode text by [`Value::string`], and only a text with an unpaired surrogate
/// by its UTF-16 code units, so that a common text is not taken apart into units and built again (binding B2.89).
fn string(text: HostText) -> Result<Value, Error> {
    let units = match text {
        HostText::Bytes(bytes) => {
            return match String::from_utf8(bytes) {
                Ok(text) => Ok(Value::string(&text)),
                Err(error) => Err(Error::InvalidUtf8 {
                    offset: count(error.utf8_error().valid_up_to()),
                }),
            }
        }
        HostText::Utf16(units) => match Value::string_of_utf16(&units) {
            Ok(value) => return Ok(value),
            // An unpaired surrogate: the string is built from its code units below.
            Err(_unpaired) => units,
        },
        HostText::CodePoints(points) => {
            let mut text = String::with_capacity(points.len());
            let mut whole = true;
            for &point in &points {
                match char::from_u32(point) {
                    Some(ch) => text.push(ch),
                    None => {
                        whole = false;
                        break;
                    }
                }
            }
            if whole {
                return Ok(Value::string(&text));
            }
            units(HostText::CodePoints(points))?
        }
    };
    let units: Vec<u64> = units.into_iter().map(u64::from).collect();
    Value::from_units(&units)
}

/// A description that no `in` row of the class `value` gives: the generated binding describes only its instances.
const fn not_described() -> Error {
    Error::Internal {
        what: "value_in: a description that no in row of value gives",
    }
}

/// The source of the children of a value that [`value_out`] gives: the containers in the order of their handles.
pub struct ValueOut<'v> {
    containers: Vec<&'v Value>,
}

/// Gives a value as the `OutValue` of its root and the source of its children (RQ-036): a string, an object key
/// included, as its Unicode text (`Text`), and a string with an unpaired surrogate, which no text holds, as its UTF-16
/// code units (`Text16`), so it leaves with its units.
pub fn value_out(value: &Value) -> (OutValue, ValueOut<'_>) {
    let mut source = ValueOut {
        containers: Vec::new(),
    };
    let root = source.describe(value);
    (root, source)
}

impl<'v> ValueOut<'v> {
    fn describe(&mut self, value: &'v Value) -> OutValue {
        match &value.node {
            Node::Null => OutValue::Null,
            Node::Boolean => OutValue::Bool(value.token() == "true"),
            Node::Number => OutValue::Number(value.token().to_owned()),
            // A string without an escape is its token, and string_value gives it without decoding; only a string
            // with an unpaired surrogate, which string_value refuses, leaves as its code units.
            Node::String(_) => match value.string_value() {
                Ok(text) => OutValue::Text(text),
                Err(_) => match value.units() {
                    Ok(units) => OutValue::Text16(units.to_vec()),
                    // The token of a string was validated when the value was made, so it decodes; only a broken
                    // invariant reaches this arm (RQ-033), and a question of OutValues cannot fail, so it gives no
                    // units.
                    Err(_) => OutValue::Text16(Vec::new()),
                },
            },
            Node::Array(items) => OutValue::List {
                handle: self.hold(value),
                len: count(items.len()),
            },
            // The keys of an object are strings, never the integers of a PHP list.
            Node::Object(members) => {
                OutValue::Map(MapOut::new(self.hold(value), members.len(), false))
            }
        }
    }

    fn hold(&mut self, value: &'v Value) -> Handle {
        self.containers.push(value);
        Handle::new(count(self.containers.len()))
    }

    fn container(&self, handle: Handle) -> Option<&'v Value> {
        let position = match usize::try_from(handle.raw()) {
            Ok(position) => position.checked_sub(1)?,
            // A handle beyond usize was never given.
            Err(_) => return None,
        };
        self.containers.get(position).copied()
    }
}

// A generated binding asks only for the handles and the indexes that value_out gave; another names no child, and since
// a question of OutValues cannot fail, it gives `Null`.
impl OutValues for ValueOut<'_> {
    fn item(&mut self, list: Handle, index: u64) -> OutValue {
        let item = match (
            self.container(list).map(|value| &value.node),
            usize::try_from(index),
        ) {
            (Some(Node::Array(items)), Ok(index)) => items.get(index),
            _ => None,
        };
        match item {
            Some(item) => self.describe(item),
            None => OutValue::Null,
        }
    }

    fn entry(&mut self, map: Handle, index: u64) -> (OutValue, OutValue) {
        let entry = match (
            self.container(map).map(|value| &value.node),
            usize::try_from(index),
        ) {
            (Some(Node::Object(members)), Ok(index)) => members.iter().nth(index),
            _ => None,
        };
        match entry {
            Some((key, item)) => (self.describe(key), self.describe(item)),
            None => (OutValue::Null, OutValue::Null),
        }
    }
}

/// A length, which a u64 holds on every target of the crate (a usize has at most 64 bits there).
fn count(len: usize) -> u64 {
    #[allow(
        clippy::as_conversions,
        reason = "RQ-036: a usize fits in a u64 on every target of the crate"
    )]
    let len = len as u64;
    len
}
