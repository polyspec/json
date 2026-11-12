//! Requirements: RQ-015 to RQ-035. The cases of contracts/core.json, one group per member of the interface contract in
//! the case convention of binding G-5, one trial `<group>::<id>` each. A failure is compared by its kind, its category
//! and the properties that the case names (plan F-3).
use std::fmt::Display;

use libtest_mimic::{Arguments, Failed, Trial};
use polyspec_json::{parse, stringify, Error, OrderedMap, ParseOptions, StringifyOptions, Value};
use serde_json::Value as Json;

const CONTRACT: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../contracts/core.json");

fn failed(message: impl Display) -> Failed {
    Failed::from(message.to_string())
}

fn field<'a>(case: &'a Json, name: &str) -> Result<&'a Json, Failed> {
    case.get(name)
        .ok_or_else(|| failed(format!("the case has no {name}")))
}

fn text<'a>(case: &'a Json, name: &str) -> Result<&'a str, Failed> {
    field(case, name)?
        .as_str()
        .ok_or_else(|| failed(format!("{name} is no text")))
}

fn integer(value: &Json) -> Result<u64, Failed> {
    value
        .as_u64()
        .ok_or_else(|| failed(format!("{value} is no unsigned integer")))
}

fn integers(case: &Json, name: &str) -> Result<Vec<u64>, Failed> {
    field(case, name)?
        .as_array()
        .ok_or_else(|| failed(format!("{name} is no list")))?
        .iter()
        .map(integer)
        .collect()
}

fn boolean(value: &Json) -> Result<bool, Failed> {
    value
        .as_bool()
        .ok_or_else(|| failed(format!("{value} is no boolean")))
}

/// The category of a kind (plan F-3): the classes of packages/rust/interface.json.
fn category(error: &Error) -> &'static str {
    match error {
        Error::NonStringKey | Error::WrongKind | Error::HostSerializationRefused => "type",
        Error::Internal { .. } => "internal",
        _ => "value",
    }
}

/// A `source` of G-5: its text, or `{"hex": ...}` for bytes that are no text.
fn source(value: &Json) -> Result<Vec<u8>, Failed> {
    if let Some(text) = value.as_str() {
        return Ok(text.as_bytes().to_vec());
    }
    let hex = text(value, "hex")?;
    (0..hex.len())
        .step_by(2)
        .map(|at| {
            hex.get(at..at + 2)
                .ok_or_else(|| failed("an odd number of hex digits"))
                .and_then(|pair| u8::from_str_radix(pair, 16).map_err(failed))
        })
        .collect()
}

/// The record parse_options of the case: every field is given (G-5).
fn parse_options(case: &Json) -> Result<ParseOptions, Failed> {
    let given = field(case, "options")?;
    Ok(ParseOptions {
        max_depth: Some(integer(field(given, "max_depth")?)?),
        reject_duplicates: Some(boolean(field(given, "reject_duplicates")?)?),
    })
}

/// A json_value of G-5, `{"kind", "value"}`, made by the constructors of the crate.
fn json_value(value: &Json) -> Result<Value, Failed> {
    let content = || field(value, "value");
    match text(value, "kind")? {
        "null" => Ok(Value::null()),
        "bool" => Ok(Value::boolean(boolean(content()?)?)),
        "number" => {
            Value::number(content()?.as_str().ok_or("a number is its literal")?).map_err(failed)
        }
        "text" => Ok(Value::string(
            content()?.as_str().ok_or("a text is no text")?,
        )),
        "list" => {
            let items = content()?
                .as_array()
                .ok_or("a list is no array")?
                .iter()
                .map(json_value)
                .collect::<Result<Vec<_>, _>>()?;
            Value::array(&items).map_err(failed)
        }
        "map" => Value::object(&ordered_map(content()?)?).map_err(failed),
        other => Err(failed(format!("no value kind {other}"))),
    }
}

/// The members of an object as the case gives them: `[key, value]` pairs in order.
fn ordered_map(pairs: &Json) -> Result<OrderedMap, Failed> {
    let mut members = OrderedMap::new();
    for pair in pairs.as_array().ok_or("the members are no array")? {
        let key = pair
            .get(0)
            .and_then(Json::as_str)
            .ok_or("a key is no text")?;
        let value = json_value(pair.get(1).ok_or("a pair has no value")?)?;
        members.insert(Value::string(key), value).map_err(failed)?;
    }
    Ok(members)
}

/// The receiver of a method of the value: the factory whose keys the case gives (G-5), or the JSON text `json` of a
/// case that only this test reads.
fn receiver(case: &Json) -> Result<Value, Failed> {
    if let Some(json) = case.get("json") {
        let text = json.as_str().ok_or("json is no text")?;
        return parse(text.as_bytes(), &ParseOptions::default()).map_err(failed);
    }
    if let Some(given) = case.get("text") {
        return Ok(Value::string(given.as_str().ok_or("text is no text")?));
    }
    if case.get("units").is_some() && case.get("key").is_none() {
        return Value::from_units(&integers(case, "units")?).map_err(failed);
    }
    if let Some(literal) = case.get("literal") {
        return Value::number(literal.as_str().ok_or("literal is no text")?).map_err(failed);
    }
    if let Some(given) = case.get("value") {
        return Ok(Value::boolean(boolean(given)?));
    }
    Ok(Value::null())
}

/// Compares an outcome with the case: `raises`, or the result that `check` compares.
fn outcome<T>(
    case: &Json,
    result: Result<T, Error>,
    check: impl FnOnce(T) -> Result<(), Failed>,
) -> Result<(), Failed> {
    match (case.get("raises"), result) {
        (None, Ok(value)) => check(value),
        (None, Err(error)) => Err(failed(format!("raised {} ({error})", error.kind()))),
        (Some(raises), Ok(_)) => Err(failed(format!("returned, but the case raises {raises}"))),
        (Some(raises), Err(error)) => {
            if text(raises, "kind")? != error.kind()
                || text(raises, "category")? != category(&error)
            {
                return Err(failed(format!(
                    "raised {} of {}, want {raises}",
                    error.kind(),
                    category(&error)
                )));
            }
            if field(raises, "status")? != &Json::Null || field(raises, "message")? != &Json::Null {
                return Err(failed(
                    "no error of the crate has a status or a fixed message",
                ));
            }
            if let Some(properties) = raises.get("properties") {
                let offset = match error.offset() {
                    Some(offset) => Json::from(offset),
                    None => Json::Null,
                };
                if properties.get("offset") != Some(&offset) {
                    return Err(failed(format!("offset {offset}, want {properties}")));
                }
            }
            Ok(())
        }
    }
}

fn same<T: PartialEq + std::fmt::Debug>(actual: T, expected: T) -> Result<(), Failed> {
    if actual == expected {
        Ok(())
    } else {
        Err(failed(format!("{actual:?}, want {expected:?}")))
    }
}

/// The member that a case of the found key gives, compared with `result` (null for none).
fn found(case: &Json, result: Result<Option<&Value>, Error>) -> Result<(), Failed> {
    outcome(case, result, |member| {
        let want = field(case, "result")?;
        same(
            member.map(|v| v.raw().to_owned()),
            want.as_str().map(str::to_owned),
        )
    })
}

fn run(group: &str, case: &Json) -> Result<(), Failed> {
    // A group of the rule corpus, `<member>.parsed`, runs as the member's group with the value of its JSON text.
    let group = match group.strip_suffix(".parsed") {
        Some(member) => member,
        None => group,
    };
    match group {
        "parse" => outcome(
            case,
            parse(&source(field(case, "source")?)?, &parse_options(case)?),
            |_| Ok(()),
        ),
        "stringify" => {
            let html_safe = boolean(field(field(case, "options")?, "html_safe")?)?;
            let options = StringifyOptions {
                html_safe: Some(html_safe),
            };
            let value = match case.get("json") {
                Some(_) => receiver(case)?,
                None => json_value(field(case, "value")?)?,
            };
            same(stringify(&value, &options), text(case, "text")?.to_owned())
        }
        "value.string_value" => outcome(case, receiver(case)?.string_value(), |value| {
            same(value.as_str(), text(case, "result")?)
        }),
        "value.string_units" => outcome(case, receiver(case)?.string_units(), |units| {
            same(units, integers(case, "result")?)
        }),
        "value.string" => same(
            Value::string(text(case, "text")?).raw().to_owned(),
            text(case, "raw")?.to_owned(),
        ),
        "value.from_units" => outcome(case, Value::from_units(&integers(case, "units")?), |made| {
            same(made.raw(), text(case, "raw")?)
        }),
        "value.from_float" => {
            // bits is the exact float of value, which a JSON reader of this test need not round exactly.
            let bits = u64::from_str_radix(text(case, "bits")?, 16).map_err(failed)?;
            outcome(case, Value::from_f64(f64::from_bits(bits)), |made| {
                same(
                    made.number_literal().map_err(failed)?,
                    text(case, "number_literal")?,
                )
            })
        }
        "value.members" => outcome(case, receiver(case)?.members().map(drop), |()| Ok(())),
        "value.items" => outcome(case, receiver(case)?.items().map(drop), |()| Ok(())),
        "value.number_literal" => {
            outcome(
                case,
                receiver(case)?.number_literal().map(drop),
                |()| Ok(()),
            )
        }
        "value.boolean_value" => {
            outcome(case, receiver(case)?.boolean_value().map(drop), |()| Ok(()))
        }
        "value.get" => found(case, receiver(case)?.get(text(case, "key")?)),
        "value.get_units" => {
            // The units are the key here; the receiver is the value of text, json or literal.
            let target = if let Some(given) = case.get("text") {
                Value::string(given.as_str().ok_or("text is no text")?)
            } else if case.get("json").is_some() {
                receiver(case)?
            } else {
                Value::number(text(case, "literal")?).map_err(failed)?
            };
            found(case, target.get_units(&integers(case, "units")?))
        }
        "value.array" => {
            let items = field(case, "items")?
                .as_array()
                .ok_or("items is no array")?
                .iter()
                .map(json_value)
                .collect::<Result<Vec<_>, _>>()?;
            outcome(case, Value::array(&items).map(drop), |()| Ok(()))
        }
        "value.object" => outcome(
            case,
            Value::object(&ordered_map(field(case, "members")?)?).map(drop),
            |()| Ok(()),
        ),
        "ordered_map.insert" => outcome(
            case,
            OrderedMap::new()
                .insert(
                    json_value(field(case, "key")?)?,
                    json_value(field(case, "value")?)?,
                )
                .map(drop),
            |()| Ok(()),
        ),
        "value.number" => outcome(
            case,
            Value::number(text(case, "literal")?).map(drop),
            |()| Ok(()),
        ),
        "value.to_json" => outcome(case, receiver(case)?.host_json().map(drop), |()| Ok(())),
        "value.kind" => same(
            format!("{:?}", receiver(case)?.kind()).to_lowercase(),
            text(case, "result")?.to_owned(),
        ),
        "value.raw" => same(
            receiver(case)?.raw().to_owned(),
            text(case, "result")?.to_owned(),
        ),
        "value.boolean" => same(
            Value::boolean(boolean(field(case, "value")?)?)
                .raw()
                .to_owned(),
            text(case, "raw")?.to_owned(),
        ),
        "value.null" => same(
            Value::null().raw().to_owned(),
            text(case, "raw")?.to_owned(),
        ),
        "value.to_string" => same(
            receiver(case)?.to_string(),
            text(case, "result")?.to_owned(),
        ),
        "ordered_map.constructor" => same(OrderedMap::new().len(), integer(field(case, "size")?)?),
        "ordered_map.get" => found(case, OrderedMap::new().get(text(case, "key")?)),
        "ordered_map.get_units" => {
            found(case, OrderedMap::new().get_units(&integers(case, "units")?))
        }
        "ordered_map.size" => same(OrderedMap::new().len(), integer(field(case, "result")?)?),
        "ordered_map.entries" => same(
            OrderedMap::new().iter().count(),
            field(case, "result")?
                .as_array()
                .ok_or("result is no array")?
                .len(),
        ),
        other => Err(failed(format!("unknown group {other}"))),
    }
}

fn main() -> Result<(), Failed> {
    // A case of RQ-033 nests a value 257 levels deep, past the default recursion limit of serde_json.
    let document = std::fs::read_to_string(CONTRACT).map_err(failed)?;
    let mut reader = serde_json::Deserializer::from_str(&document);
    reader.disable_recursion_limit();
    let contract: Json = serde::Deserialize::deserialize(&mut reader).map_err(failed)?;
    let groups = contract.as_object().ok_or("the contract is no object")?;
    let mut trials = Vec::new();
    for (group, cases) in groups {
        let Some(cases) = cases.as_array() else {
            continue;
        };
        for case in cases {
            let id = text(case, "id")?.to_owned();
            let (group, case) = (group.clone(), case.clone());
            trials.push(Trial::test(format!("{group}::{id}"), move || {
                run(&group, &case)
            }));
        }
    }
    libtest_mimic::run(&Arguments::from_args(), trials).exit()
}
