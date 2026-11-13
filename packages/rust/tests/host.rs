//! Package tests of the conversion of a json value for a binding of another repository (RQ-036, binding GN-6x): a value
//! leaves by `value_out` as the `OutValue` of binding_core, every string as its UTF-16 code units, and enters by
//! `value_in` from the description that the `in` row of the class `value` gives, as the same value.
mod common;

use binding_core::{Failure, Handle, HostText, HostValue, HostValues, OutValue, OutValues, Raised, ValueKind};
use common::json;
use polyspec_json::{stringify, value_in, value_out, Error, StringifyOptions, Value, MAX_DEPTH};

/// The value of a result that the test knows to hold one.
fn ok<T, E: std::fmt::Debug>(result: Result<T, E>, what: &str) -> T {
    match result {
        Ok(value) => value,
        Err(error) => panic!("{what}: {error:?}"),
    }
}

/// A position of a vector, which a u64 of this test holds.
fn position(value: u64) -> usize {
    ok(usize::try_from(value), "position")
}

/// A length, which a u64 holds.
fn count(len: usize) -> u64 {
    ok(u64::try_from(len), "count")
}

/// A language value of the class `value`, as a generated binding holds it.
#[derive(Debug, Clone, PartialEq)]
enum Tree {
    Null,
    Bool(bool),
    Number(String),
    Text(Vec<u16>),
    List(Vec<Tree>),
    Map(Vec<(Tree, Tree)>),
}

/// The tree that the `out` rows make from the `OutValue` of `value_out`.
fn made(out: OutValue, source: &mut dyn OutValues) -> Tree {
    match out {
        OutValue::Null => Tree::Null,
        OutValue::Bool(value) => Tree::Bool(value),
        OutValue::Number(token) => Tree::Number(token),
        OutValue::Text16(units) => Tree::Text(units),
        OutValue::List { handle, len } => Tree::List((0..len).map(|index| { let item = source.item(handle, index); made(item, source) }).collect()),
        OutValue::Map(map) => Tree::Map(
            (0..map.len())
                .map(|index| {
                    let (key, item) = source.entry(map.handle(), index);
                    (made(key, source), made(item, source))
                })
                .collect(),
        ),
        other => panic!("value_out gives {other:?}, which no out row of value makes"),
    }
}

/// The host of the generated binding: each instance is described by the `in` row of `value` without opening it, and
/// its `read` member gives the content; a list and a map hold instances again.
struct Host {
    held: Vec<Tree>,
    containers: Vec<Tree>,
}

impl Host {
    fn new() -> Self {
        Self { held: Vec::new(), containers: Vec::new() }
    }

    fn describe(&mut self, tree: Tree) -> HostValue {
        let kind = match &tree {
            Tree::Null => ValueKind::Null,
            Tree::Bool(_) => ValueKind::Bool,
            Tree::Number(_) => ValueKind::Number,
            Tree::Text(_) => ValueKind::Text16,
            Tree::List(_) => ValueKind::List,
            Tree::Map(_) => ValueKind::Map,
        };
        self.held.push(tree);
        HostValue::Value { kind, handle: Handle::new(count(self.held.len()) - 1) }
    }

    fn container(&mut self, tree: Tree) -> Handle {
        self.containers.push(tree);
        Handle::new(count(self.containers.len()) - 1)
    }
}

impl HostValues for Host {
    fn item(&mut self, list: Handle, index: u64) -> Result<HostValue, Raised> {
        let Some(Tree::List(items)) = self.containers.get(position(list.raw())).cloned() else { panic!("no list {list:?}") };
        let Some(item) = items.get(position(index)).cloned() else { panic!("no item {index}") };
        Ok(self.describe(item))
    }

    fn entry(&mut self, map: Handle, index: u64) -> Result<(HostValue, HostValue), Raised> {
        let Some(Tree::Map(entries)) = self.containers.get(position(map.raw())).cloned() else { panic!("no map {map:?}") };
        let Some((key, item)) = entries.get(position(index)).cloned() else { panic!("no entry {index}") };
        Ok((self.describe(key), self.describe(item)))
    }

    fn read(&mut self, value: Handle) -> Result<HostValue, Raised> {
        let Some(tree) = self.held.get(position(value.raw())).cloned() else { panic!("no value {value:?}") };
        Ok(match tree {
            Tree::Null => panic!("the case null has no read"),
            Tree::Bool(value) => HostValue::Bool(value),
            // value.number_literal gives the token as a text of the language.
            Tree::Number(token) => HostValue::Text(HostText::Bytes(token.into_bytes())),
            // value.string_units gives the code units.
            Tree::Text(units) => HostValue::Text(HostText::Utf16(units)),
            Tree::List(ref items) => {
                let len = count(items.len());
                HostValue::List { handle: self.container(tree), len }
            }
            Tree::Map(ref entries) => {
                let len = count(entries.len());
                HostValue::Map { handle: self.container(tree), len }
            }
        })
    }
}

/// The value after it left by value_out and came back by value_in.
fn round_trip(value: &Value) -> Result<Value, Failure<Error>> {
    let (root, mut source) = value_out(value);
    let tree = made(root, &mut source);
    let mut host = Host::new();
    let described = host.describe(tree);
    value_in(&mut host, described)
}

fn kind_of(result: Result<Value, Failure<Error>>) -> &'static str {
    match result {
        Err(Failure::Kind(error)) => error.kind(),
        other => panic!("expected a kind, got {other:?}"),
    }
}

/// The strings of B2.81: an unpaired high surrogate, an unpaired low surrogate, a paired pair, and a text that mixes them.
const STRINGS: [(&str, &[u16]); 4] = [
    (r#""\ud800""#, &[0xd800]),
    (r#""\udc00""#, &[0xdc00]),
    (r#""😀""#, &[0xd83d, 0xde00]),
    (r#""a\udc00😀\ud800""#, &[0x61, 0xdc00, 0xd83d, 0xde00, 0xd800]),
];

#[test]
fn a_string_leaves_as_its_code_units() {
    for (source, units) in STRINGS {
        let value = ok(json(source), source);
        let (root, _source) = value_out(&value);
        assert_eq!(root, OutValue::Text16(units.to_vec()), "{source}");
    }
}

#[test]
fn a_string_with_unpaired_surrogates_comes_back_with_its_units() {
    for (source, units) in STRINGS {
        let value = ok(json(source), source);
        let back = ok(round_trip(&value), source);
        let expected: Vec<u64> = units.iter().map(|&unit| u64::from(unit)).collect();
        assert_eq!(ok(back.string_units(), source), expected, "{source}");
        assert_eq!(back.to_string(), value.to_string(), "{source}");
    }
}

#[test]
fn a_document_comes_back_with_its_keys_tokens_and_order() {
    let source = r#"{"\ud800":["\udc00",1.50,-0,1e400,true,false,null,{"k":"😀","a\udc00":[]}],"b":{}}"#;
    let value = ok(json(source), source);
    let back = ok(round_trip(&value), source);
    let options = StringifyOptions::default();
    assert_eq!(stringify(&back, &options), stringify(&value, &options));
    let members: Vec<Vec<u64>> = ok(back.members(), "object").iter().map(|(key, _)| ok(key.string_units(), "key")).collect();
    assert_eq!(members, vec![vec![0xd800], vec![0x62]]);
}

#[test]
fn a_text_of_any_units_of_a_language_enters_by_its_code_units() {
    let mut host = Host::new();
    // Python gives code points, a paired surrogate included as one point; PHP and Go give UTF-8 bytes.
    let points = ok(value_in(&mut host, HostValue::Text(HostText::CodePoints(vec![0x61, 0x1f600, 0xdc00]))), "points");
    assert_eq!(ok(points.string_units(), "string"), vec![0x61, 0xd83d, 0xde00, 0xdc00]);
    let bytes = ok(value_in(&mut host, HostValue::Text(HostText::Bytes("é".as_bytes().to_vec()))), "bytes");
    assert_eq!(ok(bytes.string_units(), "string"), vec![0xe9]);
    assert_eq!(kind_of(value_in(&mut host, HostValue::Text(HostText::Bytes(vec![0x61, 0xff])))), "invalid_utf8");
}

#[test]
fn a_container_deeper_than_the_limit_is_refused() {
    let mut deep = Tree::Null;
    for _ in 0..=MAX_DEPTH {
        deep = Tree::List(vec![deep]);
    }
    let mut host = Host::new();
    let described = host.describe(deep);
    assert_eq!(kind_of(value_in(&mut host, described)), "maximum_depth_exceeded");
    let mut limit = Tree::Null;
    for _ in 0..MAX_DEPTH {
        limit = Tree::List(vec![limit]);
    }
    let described = host.describe(limit);
    assert!(value_in(&mut host, described).is_ok());
}

#[test]
fn a_description_that_no_in_row_gives_is_internal() {
    let mut host = Host::new();
    assert_eq!(kind_of(value_in(&mut host, HostValue::Int(1))), "internal");
    assert_eq!(kind_of(value_in(&mut host, HostValue::Value { kind: ValueKind::Bytes, handle: Handle::new(0) })), "internal");
}
