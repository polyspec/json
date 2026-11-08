import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// The package of the JavaScript implementation, which benchmarks/run.mts names by its root in config/implementations.json.
if (!process.env.OJ_PACKAGE) throw new Error('OJ_PACKAGE names the directory of the JavaScript package');
const { parse, stringify } = await import(pathToFileURL(`${process.env.OJ_PACKAGE}/index.js`).href);

const iterations = Number(process.env.OJ_BENCH_ITERATIONS ?? 1000);
const warmup = Number(process.env.OJ_BENCH_WARMUP ?? 1000);
const warmupMs = Number(process.env.OJ_BENCH_WARMUP_MS ?? 50);
const samples = Number(process.env.OJ_BENCH_SAMPLES ?? 9);
const files = process.argv.slice(2);
let sink;
const digest = value => createHash('sha256').update(value).digest('hex');
const percentile = (values, p) => values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];
const measure = fn => {
  // A process runs below its steady speed until it has been busy for a while,
  // and a warm-up counted in iterations ends in microseconds on a small input,
  // so the count is a floor and the duration decides.
  const warming = performance.now();
  do { for (let i = 0; i < warmup; i++) fn(); } while (performance.now() - warming < warmupMs);
  const values = [];
  let result;
  for (let sample = 0; sample < samples; sample++) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) result = fn();
    values.push((performance.now() - start) * 1e6 / iterations);
  }
  values.sort((a, b) => a - b);
  return [{median: values[Math.floor(values.length / 2)], p95: percentile(values, 0.95), samples: values}, result];
};
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const [parseStats] = measure(() => { sink = parse(source); return sink; });
  const value = parse(source);
  const [stringifyStats, output] = measure(() => stringify(value));
  const [roundtripStats] = measure(() => stringify(parse(source)));
  const nativeValue = JSON.parse(source);
  const [nativeParseStats] = measure(() => JSON.parse(source));
  const [nativeStringifyStats, nativeOutput] = measure(() => JSON.stringify(nativeValue));
  const [nativeRoundtripStats] = measure(() => JSON.stringify(JSON.parse(source)));
  const row = (name, stats, stringifyStats, roundtripStats, output) =>
    [file, name, stats.median, stringifyStats.median, roundtripStats.median,
      stats.p95, stringifyStats.p95, roundtripStats.p95, JSON.stringify({parse: stats.samples, stringify: stringifyStats.samples, roundtrip: roundtripStats.samples}),
      digest(output), Buffer.byteLength(source), Buffer.byteLength(output)].join('\t');
  console.log(row('ordered-json', parseStats, stringifyStats, roundtripStats, output));
  console.log(row('native-json', nativeParseStats, nativeStringifyStats, nativeRoundtripStats, nativeOutput));
}
