//! The probe of the shared verifier (scripts/verify.mts): one JSON reply per document path or argument request.
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    reason = "R-1: the probe is a tool, and a request it cannot read stops it by its panic"
)]

use polyspec_json::{
    parse, stringify, Error, Kind, OrderedMap, ParseOptions, StringifyOptions, Value,
};
use std::{
    fs,
    io::{self, BufRead},
};

fn read(bytes: &[u8]) -> Result<Value, Error> {
    parse(bytes, &ParseOptions::default())
}
fn compact(value: &Value) -> String {
    stringify(value, &StringifyOptions::default())
}
fn quote(s: &str) -> String {
    Value::string(s).raw().to_owned()
}
fn text(v: &Value) -> String {
    Value::from_units(&v.string_units().unwrap())
        .unwrap()
        .raw()
        .to_owned()
}
fn tree(v: &Value) -> String {
    match v.kind() {
        Kind::Object => format!(
            "[\"object\",[{}]]",
            v.members()
                .unwrap()
                .iter()
                .map(|(key, value)| format!("[{},{}]", text(key), tree(value)))
                .collect::<Vec<_>>()
                .join(",")
        ),
        Kind::Array => format!(
            "[\"array\",[{}]]",
            v.items()
                .unwrap()
                .iter()
                .map(tree)
                .collect::<Vec<_>>()
                .join(",")
        ),
        Kind::String => format!("[\"string\",{}]", text(v)),
        Kind::Number => format!("[\"number\",{}]", quote(v.number_literal().unwrap())),
        Kind::Boolean => format!("[\"boolean\",{}]", v.boolean_value().unwrap()),
        Kind::Null => "[\"null\"]".into(),
    }
}
fn rebuild(v: &Value) -> Value {
    match v.kind() {
        Kind::Object => {
            let mut members = OrderedMap::new();
            for (key, _) in v.members().unwrap().iter() {
                members.insert(key.clone(), Value::null()).unwrap();
            }
            for (key, _) in v.members().unwrap().iter().rev() {
                let member = v.get_units(&key.string_units().unwrap()).unwrap().unwrap();
                members.insert(key.clone(), rebuild(member)).unwrap();
            }
            Value::object(&members).unwrap()
        }
        Kind::Array => {
            Value::array(&v.items().unwrap().iter().map(rebuild).collect::<Vec<_>>()).unwrap()
        }
        _ => v.clone(),
    }
}
/// The reply to an argument request {"call": call, "argument": argument} of the shared verifier.
fn call(request: &str) -> String {
    let request = read(request.as_bytes()).expect("an argument request is JSON");
    let argument = request
        .get("argument")
        .unwrap()
        .expect("a request names its argument");
    let call = request
        .get("call")
        .unwrap()
        .expect("a request names its call");
    let outcome: Result<(), Error> = match call.string_value().unwrap().as_str() {
        "number" => Value::number(&argument.string_value().unwrap()).map(drop),
        "max_depth" => {
            let options = ParseOptions {
                max_depth: Some(argument.number_literal().unwrap().parse().unwrap()),
                ..ParseOptions::default()
            };
            parse(b"1", &options).map(drop)
        }
        "string_value" => argument.string_value().map(drop),
        "object_key" => OrderedMap::new()
            .insert(argument.clone(), Value::null())
            .map(drop),
        other => panic!("unknown call {other}"),
    };
    match outcome {
        Ok(()) => "{\"ok\":true}".to_owned(),
        Err(error) => format!("{{\"ok\":false,\"kind\":{}}}", quote(error.kind())),
    }
}
fn main() {
    for line in io::stdin().lock().lines() {
        let line = line.unwrap();
        if line.starts_with('{') {
            println!("{}", call(&line));
            continue;
        }
        let bytes = fs::read(line).expect("cannot read document");
        match read(&bytes) {
            Err(error) => println!(
                "{{\"ok\":false,\"offset\":{},\"unit\":\"byte\",\"kind\":{}}}",
                error.offset().expect("a parse rejection has an offset"),
                quote(error.kind())
            ),
            Ok(v) => {
                let serialized = compact(&v);
                let roundtrip = read(serialized.as_bytes()).unwrap();
                let factory = Value::string("quote \" slash \\ line\n 한 🌍")
                    .raw()
                    .to_owned();
                println!(
                    "{{\"ok\":true,\"raw\":{},\"serialized\":{},\"compact\":{},\"tree\":{},\"roundtrip\":{},\"roundtrip_tree\":{},\"rebuilt\":{},\"factory\":{}}}",
                    quote(v.raw()),
                    quote(&serialized),
                    quote(&v.to_string()),
                    tree(&v),
                    quote(&compact(&roundtrip)),
                    tree(&roundtrip),
                    quote(&compact(&rebuild(&v))),
                    quote(&factory)
                )
            }
        }
    }
}
