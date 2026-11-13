<!-- doc-id: performance-benchmarks -->
# Performance benchmarks

`run.mts` compares the ordered-json implementation with the conventional JSON
implementation available in each runtime. The benchmark uses the same input
documents, warm-up count, iteration count, and sample count for every
implementation. Rust always uses the release profile.

The benchmark reports parse, stringify, and parse-plus-stringify timings. It
also checks a digest of the produced output so a fast but incorrect ordered-json
implementation is not reported as a valid measurement. Results are
machine-specific. Each measurement stores raw samples, median, p95, input
digests, build profile, runtime fingerprint, and Git working-tree state in
`benchmarks/results.json`.
The result file is committed so the measurement history and exact protocol are
visible in the repository.

Native timings are separate baselines, not claims of equivalent behavior:
standard native APIs generally do not retain object order or exact number
tokens. The ordered-json implementations must agree with each other; native
output digests may differ for those intentional reasons.

Each measurement warms up for at least the declared iteration count and at least
the declared duration. A process runs below its steady speed until it has been
busy for a while, and a warm-up counted only in iterations ends in microseconds
on a small input: whichever fixtures a process measured first then read 1.5 to
1.7 times slower than the same fixtures measured last, in the native baseline as
well as in ordered-json. Reversing the fixture order moved the slowdown with the
position rather than with the fixture.

`workload.json` is the authority for fixture digests, byte counts, node counts,
scalar counts, maximum depth, warm-up count and duration, iterations, samples,
and regression tolerances. The runner rejects changed inputs, missing or duplicate
implementation rows, incorrect reported input sizes, and workload structure
metadata that does not match the parsed fixture. Output byte counts
remain observable results because native serialization can differ.

Nanosecond values cannot be identical across different machines. A run is
comparable only when its recorded environment fingerprint matches the committed
result. Matching environments allow a 10% median and 30% p95 increase after
taking the median ratio across fixtures for each ordered-json implementation
and metric; this avoids treating one noisy small fixture as a regression. Other
environments are recorded as `not-comparable`. The command writes the current
result unless `--check` is supplied.
When a comparable run exceeds the tolerance, the runner preserves the committed
baseline and writes the failed measurement to `.cache/benchmark.current.json`.
Use `--update-baseline` only after reviewing that measurement; an explicit
baseline update is recorded as `baseline-updated`.

Run from the repository root:

```sh
make benchmark
node benchmarks/run.mts --check
node benchmarks/run.mts --update-baseline
node benchmarks/run.mts --iterations 10000 --warmup 1000 --samples 9
```

The Rust baseline is `serde_json`, because Rust does not provide a JSON parser
in its standard library. The JavaScript, Go, and PHP baselines use their
runtime-native JSON APIs. PHP reports both the pure PHP implementation and the
native extension implementation.

<a id="python-parse"></a>
## Python parse ratio

`make python-parse-budget` (`python-parse/run.py`) parses one generated document of 50,000 flat objects of eight members
each (6.15 MB) with the Python package and with the pure PHP package, each in its own process, interleaved, three runs each.
Each process reports the CPU time of its own parse, so the load of the machine slows both sides alike; no wall-clock budget
exists. The check prints every run, both medians and their ratio, and fails when the Python median exceeds three times the
PHP median. It is no target of `make check`: a person runs it after a change of the Python parser.

<a id="host-cost"></a>
## Cost of the conversion for a binding

`make benchmark-host` (`host-cost.mts`, which runs `examples/host_cost.rs` of the Rust package in the release profile)
measures the conversion of RQ-036, `value_out` and `value_in`, against the same walk that gives and takes each string as a
Rust `String`, on a document of one large string and a document of 100,000 small strings, in four directions: out, out and
in as UTF-8, in as UTF-8 and in as UTF-16. Each time is the median of 21 runs after one run that is not counted. The
example prints one JSON line per measurement, and the script reads each line with the load average of the machine at that
moment and writes `var/report/bench/host-cost-rust.json`, which Git ignores, by one rename. The record is a list with one
entry per measurement: `language`, `document`, `direction`, `runs`, `host_ms`, `text_ms`, `ratio` (`host_ms` divided by
`text_ms`) and `load_average` (the averages of 1, 5 and 15 minutes).

A ratio never fails the measurement: a ratio above the limit 1.5 prints a `WARNING` line with the value and the limit, and
the target passes. The script fails only for a usage error, a command that fails, a line that is no measurement and a run
without a measurement. A measurement taken while the machine is loaded is no final result, so the load average is read
with each ratio. It is no target of `make check`.
