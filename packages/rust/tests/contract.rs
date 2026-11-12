//! Requirements: RQ-026 to RQ-035. The cases of contracts/core.json, one trial `<group>::<id>` each. A failure is
//! compared by its kind, its category and the properties that the case names (plan F-3).
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

/// The category of a kind (plan F-3): the classes of packages/rust/interface.json.
fn category(error: &Error) -> &'static str {
    match error {
        Error::NonStringKey | Error::WrongKind | Error::HostSerializationRefused => "type",
        Error::Internal { .. } => "internal",
        _ => "value",
    }
}

/// The input of a case: the text json, the base64 bytes, or nest arrays.
fn source(case: &Json) -> Result<Vec<u8>, Failed> {
    if let Some(json) = case.get("json") {
        return Ok(json.as_str().ok_or("json is no text")?.as_bytes().to_vec());
    }
    if let Some(bytes) = case.get("bytes") {
        use base64::Engine;
        return base64::engine::general_purpose::STANDARD
            .decode(bytes.as_str().ok_or("bytes is no text")?)
            .map_err(failed);
    }
    let nest = usize::try_from(integer(field(case, "nest")?)?).map_err(failed)?;
    Ok(format!("{}{}", "[".repeat(nest), "]".repeat(nest)).into_bytes())
}

fn parse_options(case: &Json) -> Result<ParseOptions, Failed> {
    let mut options = ParseOptions::default();
    if let Some(given) = case.get("options") {
        if let Some(limit) = given.get("max_depth") {
            options.max_depth = Some(integer(limit)?);
        }
        if let Some(reject) = given.get("reject_duplicates") {
            options.reject_duplicates =
                Some(reject.as_bool().ok_or("reject_duplicates is no boolean")?);
        }
    }
    Ok(options)
}

fn value(case: &Json) -> Result<Value, Failed> {
    parse(&source(case)?, &parse_options(case)?).map_err(failed)
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

fn run(group: &str, case: &Json) -> Result<(), Failed> {
    match group {
        "parse" => outcome(case, parse(&source(case)?, &parse_options(case)?), |_| {
            Ok(())
        }),
        "string_value" => outcome(case, value(case)?.string_value(), |text_value| {
            same(text_value.as_str(), text(case, "text")?)
        }),
        "string_units" => outcome(case, value(case)?.string_units(), |units| {
            same(units, integers(case, "units")?)
        }),
        "string" => same(
            Value::string(text(case, "text")?).raw().to_owned(),
            text(case, "token")?.to_owned(),
        ),
        "from_units" => outcome(case, Value::from_units(&integers(case, "units")?), |made| {
            same(made.raw(), text(case, "token")?)
        }),
        "from_float" => {
            let bits = u64::from_str_radix(text(case, "bits")?, 16).map_err(failed)?;
            outcome(case, Value::from_f64(f64::from_bits(bits)), |made| {
                same(made.number_literal().map_err(failed)?, text(case, "token")?)
            })
        }
        "stringify" => {
            let mut options = StringifyOptions::default();
            if let Some(html_safe) = case.get("options").and_then(|o| o.get("html_safe")) {
                options.html_safe = Some(html_safe.as_bool().ok_or("html_safe is no boolean")?);
            }
            same(
                stringify(&value(case)?, &options),
                text(case, "text")?.to_owned(),
            )
        }
        "accessors" => {
            let target = value(case)?;
            let found = |result: Result<Option<&Value>, Error>| {
                outcome(case, result, |member| {
                    let want = field(case, "result")?;
                    same(
                        member.map(|v| v.raw().to_owned()),
                        want.as_str().map(str::to_owned),
                    )
                })
            };
            match text(case, "accessor")? {
                "members" => outcome(case, target.members().map(drop), |()| Ok(())),
                "items" => outcome(case, target.items().map(drop), |()| Ok(())),
                "string_units" => outcome(case, target.string_units().map(drop), |()| Ok(())),
                "string_value" => outcome(case, target.string_value().map(drop), |()| Ok(())),
                "number_literal" => outcome(case, target.number_literal().map(drop), |()| Ok(())),
                "boolean_value" => outcome(case, target.boolean_value().map(drop), |()| Ok(())),
                "get" => found(target.get(text(case, "key")?)),
                "get_units" => found(target.get_units(&integers(case, "units")?)),
                other => Err(failed(format!("unknown accessor {other}"))),
            }
        }
        "constructors" => {
            let built = match text(case, "wrap")? {
                "array" | "object" => {
                    let object = text(case, "wrap")? == "object";
                    let mut made = Ok(Value::null());
                    for _ in 0..integer(field(case, "nest")?)? {
                        made = made.and_then(|inner| {
                            if object {
                                let mut members = OrderedMap::new();
                                members.insert(Value::string("a"), inner)?;
                                Value::object(&members)
                            } else {
                                Value::array(&[inner])
                            }
                        });
                    }
                    made.map(drop)
                }
                "key" => OrderedMap::new()
                    .insert(value(case)?, Value::null())
                    .map(drop),
                "number" => Value::number(text(case, "literal")?).map(drop),
                other => return Err(failed(format!("unknown wrap {other}"))),
            };
            outcome(case, built, |()| Ok(()))
        }
        "hooks" => outcome(case, value(case)?.host_json().map(drop), |()| Ok(())),
        other => Err(failed(format!("unknown group {other}"))),
    }
}

fn main() -> Result<(), Failed> {
    let contract: Json = serde_json::from_str(&std::fs::read_to_string(CONTRACT).map_err(failed)?)
        .map_err(failed)?;
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
