//! The benchmark of the parser and the serializer (benchmarks/).
#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    reason = "R-1: the benchmark is a tool, and a fixture it cannot read stops it by its panic"
)]

use polyspec_ordered_json::{parse, stringify, ParseOptions, StringifyOptions};
use serde_json::Value as NativeValue;
use sha2::{Digest, Sha256};
use std::{env, fs, hint::black_box, time::Instant};

fn iterations() -> usize {
    setting("OJ_BENCH_ITERATIONS", 1000)
}

struct Stats {
    median: f64,
    p95: f64,
    samples: Vec<f64>,
}
// An unset variable takes the fallback; a value that is not a positive integer stops the benchmark,
// because a silent default would measure a different workload than the one asked for (P8).
fn setting(name: &str, fallback: usize) -> usize {
    match env::var(name) {
        Ok(text) => match text.parse::<usize>() {
            Ok(value) if value > 0 => value,
            _ => panic!("{name} must be a positive integer, got {text:?}"),
        },
        Err(env::VarError::NotPresent) => fallback,
        Err(error) => panic!("{name} is not readable: {error}"),
    }
}
fn measure<F: FnMut() -> Vec<u8>>(
    mut f: F,
    count: usize,
    warmup: usize,
    warmup_ms: usize,
    sample_count: usize,
) -> (Stats, Vec<u8>) {
    // A process runs below its steady speed until it has been busy for a
    // while, and a warm-up counted in iterations ends in microseconds on a
    // small input, so the count is a floor and the duration decides.
    let warming = Instant::now();
    loop {
        for _ in 0..warmup {
            f();
        }
        if warming.elapsed().as_millis() as usize >= warmup_ms {
            break;
        }
    }
    let mut values = Vec::with_capacity(sample_count);
    let mut output = Vec::new();
    for _ in 0..sample_count {
        let start = Instant::now();
        for _ in 0..count {
            output = f();
        }
        values.push(start.elapsed().as_secs_f64() * 1e9 / count as f64);
    }
    values.sort_by(f64::total_cmp);
    // The 95th percentile is the sample of rank ceil(0.95 n), counted from 1.
    let p95 = values[(values.len() * 95)
        .div_ceil(100)
        .saturating_sub(1)
        .min(values.len() - 1)];
    let median = values[values.len() / 2];
    (
        Stats {
            median,
            p95,
            samples: values,
        },
        output,
    )
}

fn digest(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

fn main() {
    let count = iterations();
    let warmup = setting("OJ_BENCH_WARMUP", 1000);
    let warmup_ms = setting("OJ_BENCH_WARMUP_MS", 50);
    let sample_count = setting("OJ_BENCH_SAMPLES", 9);
    for file in env::args().skip(1) {
        let source = fs::read(&file).expect("cannot read benchmark fixture");
        let parse_ordered =
            || parse(&source, &ParseOptions::default()).expect("ordered-json parse failed");
        let (parse_stats, _) = measure(
            || {
                black_box(parse_ordered());
                Vec::new()
            },
            count,
            warmup,
            warmup_ms,
            sample_count,
        );
        let value = parse_ordered();
        let (stringify_stats, output) = measure(
            || stringify(&value, &StringifyOptions::default()).into_bytes(),
            count,
            warmup,
            warmup_ms,
            sample_count,
        );
        let (roundtrip_stats, _) = measure(
            || stringify(&parse_ordered(), &StringifyOptions::default()).into_bytes(),
            count,
            warmup,
            warmup_ms,
            sample_count,
        );

        let (native_parse_stats, _) = measure(
            || {
                serde_json::from_slice::<NativeValue>(&source).unwrap();
                Vec::new()
            },
            count,
            warmup,
            warmup_ms,
            sample_count,
        );
        let native_value: NativeValue = serde_json::from_slice(&source).unwrap();
        let (native_stringify_stats, native_output) = measure(
            || serde_json::to_vec(&native_value).unwrap(),
            count,
            warmup,
            warmup_ms,
            sample_count,
        );
        let (native_roundtrip_stats, _) = measure(
            || {
                let value: NativeValue = serde_json::from_slice(&source).unwrap();
                serde_json::to_vec(&value).unwrap()
            },
            count,
            warmup,
            warmup_ms,
            sample_count,
        );
        let sample_json = |p: &Stats, s: &Stats, r: &Stats| {
            serde_json::json!({"parse": p.samples, "stringify": s.samples, "roundtrip": r.samples})
                .to_string()
        };
        let ordered_samples = sample_json(&parse_stats, &stringify_stats, &roundtrip_stats);
        let native_samples = sample_json(
            &native_parse_stats,
            &native_stringify_stats,
            &native_roundtrip_stats,
        );
        println!(
            "{file}\tordered-json\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}",
            parse_stats.median,
            stringify_stats.median,
            roundtrip_stats.median,
            parse_stats.p95,
            stringify_stats.p95,
            roundtrip_stats.p95,
            ordered_samples,
            digest(&output),
            source.len(),
            output.len()
        );
        println!(
            "{file}\tnative-json\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}",
            native_parse_stats.median,
            native_stringify_stats.median,
            native_roundtrip_stats.median,
            native_parse_stats.p95,
            native_stringify_stats.p95,
            native_roundtrip_stats.p95,
            native_samples,
            digest(&native_output),
            source.len(),
            native_output.len()
        );
    }
}
