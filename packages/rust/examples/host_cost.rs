//! The cost of the conversion of RQ-036 (binding B2.81, B2.89): value_out, which gives a string as its text and checks
//! first that it holds no unpaired surrogate, and value_in, which takes a string as the text that `value.string_text`
//! gives, as UTF-8 bytes (PHP, Go, Node, WASM) or as UTF-16 units (a built-in string of Node), against the same walk
//! that gives and takes a string as a Rust `String`, on a document of one large string and a document of many small
//! strings. Each measurement is the median of a fixed number of runs and is printed as one JSON line, which
//! benchmarks/host-cost.mts reads, judges against its limit and records (make benchmark-host).
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    reason = "R-1: the measurement is a tool, and a value it cannot build stops it by its panic"
)]

use binding_core::{Handle, HostText, HostValue, HostValues, OutValue, OutValues, Raised};
use polyspec_json::{parse, value_in, value_out, Error, ParseOptions, Value};
use std::{hint::black_box, time::Instant};

const SAMPLES: usize = 21;

/// A string as the generated binding holds it after the out rows made it.
#[derive(Clone)]
enum Made {
    Text(String),
    Units(Vec<u16>),
    List(Vec<Made>),
}

fn made(out: OutValue, source: &mut dyn OutValues) -> Made {
    match out {
        OutValue::Text16(units) => Made::Units(units),
        OutValue::Text(text) => Made::Text(text),
        OutValue::List { handle, len } => Made::List(
            (0..len)
                .map(|index| {
                    let item = source.item(handle, index);
                    made(item, source)
                })
                .collect(),
        ),
        other => panic!("the documents hold strings and arrays, not {other:?}"),
    }
}

/// A text as the UTF-16 units of a language, as Node gives a built-in string to value_in.
fn as_units(value: Made) -> Made {
    match value {
        Made::Text(text) => Made::Units(text.encode_utf16().collect()),
        Made::List(items) => Made::List(items.into_iter().map(as_units).collect()),
        units @ Made::Units(_) => units,
    }
}

/// The text path: the same walk, which gives a string as `String`.
fn made_as_text(value: &Value) -> Made {
    match value.items() {
        Ok(items) => Made::List(items.iter().map(made_as_text).collect()),
        Err(_) => Made::Text(value.string_value().unwrap()),
    }
}

/// The description of a made value, as the in row gives it.
struct Host {
    lists: Vec<Vec<Made>>,
}

impl Host {
    fn describe(&mut self, value: Made) -> HostValue {
        match value {
            Made::Units(units) => HostValue::Text(HostText::Utf16(units)),
            Made::Text(text) => HostValue::Text(HostText::Bytes(text.into_bytes())),
            Made::List(items) => {
                let len = u64::try_from(items.len()).unwrap();
                self.lists.push(items);
                HostValue::List {
                    handle: Handle::new(u64::try_from(self.lists.len() - 1).unwrap()),
                    len,
                }
            }
        }
    }
}

impl HostValues for Host {
    fn item(&mut self, list: Handle, index: u64) -> Result<HostValue, Raised> {
        let items = &mut self.lists[usize::try_from(list.raw()).unwrap()];
        let item = std::mem::replace(
            &mut items[usize::try_from(index).unwrap()],
            Made::Units(Vec::new()),
        );
        Ok(self.describe(item))
    }

    fn entry(&mut self, _map: Handle, _index: u64) -> Result<(HostValue, HostValue), Raised> {
        panic!("the documents hold no object")
    }

    fn read(&mut self, _value: Handle) -> Result<HostValue, Raised> {
        panic!("the measurement describes the content directly")
    }
}

/// The text path in: a value built from each `String` with `Value::string`.
fn built_from_text(value: Made) -> Value {
    match value {
        Made::Text(text) => Value::string(&text),
        Made::List(items) => {
            Value::array(&items.into_iter().map(built_from_text).collect::<Vec<_>>()).unwrap()
        }
        Made::Units(_) => panic!("the text path holds no units"),
    }
}

fn median(mut samples: Vec<f64>) -> f64 {
    samples.sort_by(f64::total_cmp);
    samples[samples.len() / 2]
}

fn measure(mut run: impl FnMut()) -> f64 {
    run();
    median(
        (0..SAMPLES)
            .map(|_| {
                let start = Instant::now();
                run();
                start.elapsed().as_secs_f64() * 1000.0
            })
            .collect(),
    )
}

/// One measurement as a JSON line: the names of the documents and the directions hold only characters that JSON writes
/// as they are.
fn report(document: &str, direction: &str, host: f64, text: f64) {
    println!(
        "{{\"document\":\"{document}\",\"direction\":\"{direction}\",\"runs\":{SAMPLES},\"host_ms\":{host},\"text_ms\":{text}}}"
    );
}

fn main() -> Result<(), Error> {
    let large = format!("\"{}\"", "abcdefghij\u{e9}\u{4e2d}".repeat(100_000));
    let many = format!("[{}]", vec!["\"name\\u00e9\""; 100_000].join(","));
    for (document, source) in [("one large string", large), ("many small strings", many)] {
        let value = parse(source.as_bytes(), &ParseOptions::default())?;
        let out_units = measure(|| {
            let (root, mut source) = value_out(&value);
            black_box(made(root, &mut source));
        });
        let out_text = measure(|| {
            black_box(made_as_text(&value));
        });
        report(document, "out", out_units, out_text);
        let in_bytes = measure(|| {
            let (root, mut source) = value_out(&value);
            let tree = made(root, &mut source);
            let mut host = Host { lists: Vec::new() };
            let described = host.describe(tree);
            black_box(value_in(&mut host, described).unwrap());
        });
        let in_text = measure(|| {
            black_box(built_from_text(made_as_text(&value)));
        });
        report(document, "out and in, UTF-8", in_bytes, in_text);
        // The in direction alone: each run copies the texts that the language holds, as a binding copies them out of
        // its language, and builds the value from them.
        let texts = made_as_text(&value);
        let units = as_units(texts.clone());
        let only_text = measure(|| {
            black_box(built_from_text(texts.clone()));
        });
        for (direction, tree) in [("in, UTF-8", &texts), ("in, UTF-16", &units)] {
            let only_in = measure(|| {
                let mut host = Host { lists: Vec::new() };
                let described = host.describe(tree.clone());
                black_box(value_in(&mut host, described).unwrap());
            });
            report(document, direction, only_in, only_text);
        }
    }
    Ok(())
}
