//! Requirement RQ-022. The official examples of examples/official.json, run as the trials `official::<id>` of libtest-mimic. A case parses its input and compares the source text, the compact
//! serialization and the value tree with the expected results, then the tree of the reparsed serialization and of the
//! value rebuilt through the factories (docs/spec/json-contract.md#acceptance). The examples are read with the library:
//! their trees hold lone surrogates, which serde_json refuses, and every string of a tree is compared as its UTF-16 code
//! units.
#![allow(
    clippy::unwrap_used,
    reason = "R-1: the examples are tracked inputs, and a harness that cannot read them fails by its panic"
)]

use libtest_mimic::{Arguments, Failed, Trial};
use polyspec_ordered_json::{
    parse as parse_bytes, stringify, Error, Kind, OrderedMap, ParseOptions, StringifyOptions, Value,
};

fn parse(source: &str) -> Result<Value, Error> {
    parse_bytes(source.as_bytes(), &ParseOptions::default())
}

#[derive(Debug, PartialEq)]
enum Tree {
    Object(Vec<(Vec<u64>, Tree)>),
    Array(Vec<Tree>),
    String(Vec<u64>),
    Number(String),
    Boolean(bool),
    Null,
}

fn tree(value: &Value) -> Tree {
    match value.kind() {
        Kind::Object => Tree::Object(
            value
                .members()
                .unwrap()
                .iter()
                .map(|(key, member)| (key.string_units().unwrap(), tree(member)))
                .collect(),
        ),
        Kind::Array => Tree::Array(value.items().unwrap().iter().map(tree).collect()),
        Kind::String => Tree::String(value.string_units().unwrap()),
        Kind::Number => Tree::Number(value.number_literal().unwrap().to_owned()),
        Kind::Boolean => Tree::Boolean(value.boolean_value().unwrap()),
        Kind::Null => Tree::Null,
    }
}

fn text(value: &Value) -> String {
    value.string_value().unwrap()
}

fn expected_tree(value: &Value) -> Tree {
    let parts = value.items().unwrap();
    match text(&parts[0]).as_str() {
        "object" => Tree::Object(
            parts[1]
                .items()
                .unwrap()
                .iter()
                .map(|member| {
                    let pair = member.items().unwrap();
                    (pair[0].string_units().unwrap(), expected_tree(&pair[1]))
                })
                .collect(),
        ),
        "array" => Tree::Array(
            parts[1]
                .items()
                .unwrap()
                .iter()
                .map(expected_tree)
                .collect(),
        ),
        "string" => Tree::String(parts[1].string_units().unwrap()),
        "number" => Tree::Number(text(&parts[1])),
        "boolean" => Tree::Boolean(parts[1].boolean_value().unwrap()),
        _ => Tree::Null,
    }
}

/// Inserts the keys in their first order, then sets the values in reverse order.
fn rebuild(value: &Value) -> Value {
    match value.kind() {
        Kind::Object => {
            let members = value.members().unwrap();
            let mut out = OrderedMap::new();
            for (key, _) in members.iter() {
                out.insert(key.clone(), Value::null()).unwrap();
            }
            for (key, member) in members.iter().rev() {
                out.insert(key.clone(), rebuild(member)).unwrap();
            }
            Value::object(&out).unwrap()
        }
        Kind::Array => Value::array(
            &value
                .items()
                .unwrap()
                .iter()
                .map(rebuild)
                .collect::<Vec<_>>(),
        )
        .unwrap(),
        _ => value.clone(),
    }
}

fn check(input: &str, compact: &str, expected: &Tree) -> Result<(), Failed> {
    let value = parse(input).map_err(|error| error.to_string())?;
    if value.raw() != input {
        return Err(format!("raw() = {:?}, want {input:?}", value.raw()).into());
    }
    let serialized = stringify(&value, &StringifyOptions::default());
    if serialized != compact {
        return Err(format!("stringify() = {serialized:?}, want {compact:?}").into());
    }
    for (name, source) in [
        ("input", input.to_owned()),
        ("serialization", serialized),
        (
            "rebuilt value",
            stringify(&rebuild(&value), &StringifyOptions::default()),
        ),
    ] {
        let actual = tree(&parse(&source).map_err(|error| format!("{name}: {error}"))?);
        if &actual != expected {
            return Err(format!("the tree of the {name} = {actual:?}, want {expected:?}").into());
        }
    }
    Ok(())
}

fn main() {
    let source = std::fs::read(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../examples/official.json"
    ))
    .unwrap();
    let official = parse_bytes(&source, &ParseOptions::default()).unwrap();
    let trials = official
        .get("cases")
        .unwrap()
        .unwrap()
        .items()
        .unwrap()
        .iter()
        .map(|example| {
            let input = text(example.get("input").unwrap().unwrap());
            let compact = text(example.get("compact").unwrap().unwrap());
            let expected = expected_tree(example.get("tree").unwrap().unwrap());
            Trial::test(
                format!("official::{}", text(example.get("id").unwrap().unwrap())),
                move || check(&input, &compact, &expected),
            )
        })
        .collect();
    libtest_mimic::run(&Arguments::from_args(), trials).exit();
}
