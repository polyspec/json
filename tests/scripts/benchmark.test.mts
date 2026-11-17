// The benchmark checks that its workload describes the inputs it names, and compares a measurement with the previous result
// by the median ratio of each metric within its tolerance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { benchmarkArtifacts, compare, profileOf, refusal, sourceState, structure, validateWorkload } from '../../benchmarks/run.mts';
import { checkout } from './checkout.mts';

const SOURCE = '{"a":[1,true,null,"b"],"c":{"d":2}}';

test('the workload describes each input by its size, digest and structure', (context) => {
  const { root, write } = checkout(context);
  write('sample.json', SOURCE);
  const entry = { file: 'sample.json', input_bytes: SOURCE.length, sha256: createHash('sha256').update(SOURCE).digest('hex'), ...structure(JSON.parse(SOURCE)) };
  validateWorkload([entry], root);
  assert.throws(() => validateWorkload([{ ...entry, nodes: entry.nodes + 1 }], root), /does not describe sample.json/);
  assert.throws(() => validateWorkload([{ ...entry, max_depth: entry.max_depth + 1 }], root), /does not describe sample.json/);
  assert.throws(() => validateWorkload([{ ...entry, file: 'other.json' }], root), /names other.json/);
  // The committed manifest counts object keys, so the counter does too.
  assert.deepEqual([structure({ a: 1 }).strings, structure({ a: 1 }).nodes], [1, 3]);
});

test('the source of a result names only whether the checkout is clean', () => {
  assert.deepEqual(Object.keys(sourceState()), ['dirty']);
});

test('a measurement fails when the median ratio of a metric exceeds its tolerance', () => {
  const protocol = { warmup: 1, warmup_ms: 1, iterations: 1, samples: 1, median_tolerance: 0.1, p95_tolerance: 0.3 };
  const row = (file: string, parse: number) => ({ file, implementation: 'js:ordered-json', parse_ns: parse, stringify_ns: 1, roundtrip_ns: 1, parse_p95_ns: 1, stringify_p95_ns: 1, roundtrip_p95_ns: 1, samples: {}, sha256: '', input_bytes: 1, output_bytes: 1 });
  const previous = { environment: 'e', protocol, results: [row('a', 100), row('b', 100), row('c', 100)] };
  assert.equal(compare(undefined, { environment: 'e', protocol, results: [] }).status, 'no-baseline');
  assert.equal(compare(previous, { environment: 'other', protocol, results: [] }).status, 'not-comparable');
  // One slow input does not move the median of three.
  assert.equal(compare(previous, { environment: 'e', protocol, results: [row('a', 105), row('b', 300), row('c', 100)] }).status, 'passed');
  assert.equal(compare(previous, { environment: 'e', protocol, results: [row('a', 120), row('b', 300), row('c', 100)] }).status, 'failed');
});

// T3.63: three rows of the measurements measured a debug build beside release builds (T3.53, T3.59, T3.25-6), each found
// by reading a log. No artifact names the profile of its build, so the benchmark compares the bytes of what a row loads
// with what cargo wrote under target/release and target/debug, and refuses a debug build or one that equals neither.
test('T3.63: an artifact is of the release build only when its bytes are those of target/release', () => {
  const builds = { release: 'a'.repeat(64), debug: 'b'.repeat(64) };
  assert.equal(profileOf(builds.release, builds), 'release');
  assert.equal(profileOf(builds.debug, builds), 'debug');
  assert.equal(profileOf('c'.repeat(64), builds), 'unverified');
  assert.equal(profileOf(builds.release, { release: null, debug: null }), 'unverified');
  assert.equal(refusal('the Node addon', 'release'), null);
  assert.match(refusal('the Node addon', 'debug') ?? '', /the Node addon is a debug build/);
  assert.match(refusal('the Node addon', 'unverified') ?? '', /equals neither the release nor the debug build/);
});

test('T3.63: the benchmark names an artifact for every row that loads a library of cargo', () => {
  const names = benchmarkArtifacts().map(item => item.row);
  // T3.25-6: the go row links the static library of the Go binding.
  assert.deepEqual(names, ['js', 'go', 'php']);
  for (const item of benchmarkArtifacts()) {
    assert.match(item.release, /target\/release\//);
    assert.match(item.debug, /target\/debug\//);
  }
});
