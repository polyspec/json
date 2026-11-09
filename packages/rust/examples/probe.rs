// Adapter only. The shared Python verifier owns examples and expectations.
use polyspec_ordered_json::{
    parse, parse_bytes, parse_with_max_depth, stringify, Error, Kind, OrderedMap, Value,
};
use std::{
    fs,
    io::{self, BufRead},
};

fn quote(s: &str) -> String {
    Value::string(s).raw().to_owned()
}
fn text(v: &Value) -> String {
    Value::from_units(v.string_units().unwrap())
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
                members
                    .insert(
                        key.clone(),
                        rebuild(v.get_units(key.string_units().unwrap()).unwrap()),
                    )
                    .unwrap();
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
    let request = parse(request).expect("an argument request is JSON");
    let argument = request
        .get("argument")
        .expect("a request names its argument");
    let call = request.get("call").expect("a request names its call");
    let outcome: Result<(), Error> = match &call.string_value().unwrap()[..] {
        b"number" => {
            let text = String::from_utf8(argument.string_value().unwrap()).unwrap();
            Value::number(&text).map(drop)
        }
        b"max_depth" => {
            let limit = argument.number_literal().unwrap().parse().unwrap();
            parse_with_max_depth("1", limit).map(drop)
        }
        b"string_value" => argument.string_value().map(drop),
        b"object_key" => OrderedMap::new()
            .insert(argument.clone(), Value::null())
            .map(drop),
        other => panic!("unknown call {}", String::from_utf8_lossy(other)),
    };
    match outcome {
        Ok(()) => "{\"ok\":true}".to_owned(),
        Err(error) => format!("{{\"ok\":false,\"kind\":{}}}", quote(error.kind().as_str())),
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
        match parse_bytes(&bytes) {
            Err(error) => println!(
                "{{\"ok\":false,\"offset\":{},\"unit\":\"byte\",\"kind\":{}}}",
                error.offset,
                quote(error.kind().as_str())
            ),
            Ok(v) => {
                let serialized = stringify(&v);
                let roundtrip = parse_bytes(serialized.as_bytes()).unwrap();
                let factory = Value::string("quote \" slash \\ line\n 한 🌍")
                    .raw()
                    .to_owned();
                println!(
                "{{\"ok\":true,\"raw\":{},\"serialized\":{},\"compact\":{},\"tree\":{},\"roundtrip\":{},\"roundtrip_tree\":{},\"rebuilt\":{},\"factory\":{}}}",
                quote(v.raw()),
                quote(&serialized),
                quote(&v.compact()),
                tree(&v),
                quote(&stringify(&roundtrip)),
                tree(&roundtrip),
                quote(&rebuild(&v).compact()),
                quote(&factory)
                )
            }
        }
    }
}
