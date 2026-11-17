<?php

declare(strict_types=1);

// The modes: native-json measures ext-json, and extension the binding extension Polyspec\Json, which the run loads with
// -d extension (T3.25-3).

use function Polyspec\Json\parse;
use function Polyspec\Json\stringify;

$iterations = (int)($_SERVER['OJ_BENCH_ITERATIONS'] ?? 1000);
$warmup = (int)($_SERVER['OJ_BENCH_WARMUP'] ?? 1000);
$warmupMs = (int)($_SERVER['OJ_BENCH_WARMUP_MS'] ?? 50);
$samples = (int)($_SERVER['OJ_BENCH_SAMPLES'] ?? 9);
$mode = $argv[1] ?? 'custom';
$files = array_slice($argv, 2);
$clock = static fn(): float => hrtime(true);
$digest = static fn(string $value): string => hash('sha256', $value);
$sink = null;
$percentile = static function (array $values, float $p): float {
    sort($values, SORT_NUMERIC);
    return $values[min(count($values) - 1, (int)ceil(count($values) * $p) - 1)];
};
$measure = static function (callable $fn) use ($iterations, $warmup, $warmupMs, $samples, $clock, $percentile): array {
    // A process runs below its steady speed until it has been busy for a while,
    // and a warm-up counted in iterations ends in microseconds on a small
    // input, so the count is a floor and the duration decides.
    $warming = $clock();
    do {
        for ($i = 0; $i < $warmup; $i++) {
            $fn();
        }
    } while (($clock() - $warming) < $warmupMs * 1e6);
    $values = [];
    $result = '';
    for ($sample = 0; $sample < $samples; $sample++) {
        $start = $clock();
        for ($i = 0; $i < $iterations; $i++) {
            $result = $fn();
        }
        $values[] = ($clock() - $start) / $iterations;
    }
    sort($values, SORT_NUMERIC);
    $stats = [
        'median' => $values[(int)floor(count($values) / 2)],
        'p95' => $percentile($values, 0.95),
        'samples' => $values,
    ];
    return [$stats, $result];
};
foreach ($files as $file) {
    $source = file_get_contents($file);
    if ($source === false) {
        throw new RuntimeException("Cannot read $file");
    }
    $parseFn = $mode === 'native-json'
        ? static fn() => json_decode($source, false, 512, JSON_THROW_ON_ERROR)
        : static fn() => parse($source, 256);
    $stringifyFn = $mode === 'native-json'
        ? static fn($value) => json_encode($value, JSON_THROW_ON_ERROR)
        : static fn($value) => stringify($value);
    [$parseStats] = $measure(function () use ($parseFn, &$sink) {
        $sink = $parseFn();
        return $sink;
    });
    $value = $parseFn();
    [$stringifyStats, $output] = $measure(fn() => $stringifyFn($value));
    [$roundtripStats] = $measure(fn() => $stringifyFn($parseFn()));
    echo implode("\t", [$file, $mode, $parseStats['median'], $stringifyStats['median'], $roundtripStats['median'],
        $parseStats['p95'], $stringifyStats['p95'], $roundtripStats['p95'],
        json_encode([
            'parse' => $parseStats['samples'],
            'stringify' => $stringifyStats['samples'],
            'roundtrip' => $roundtripStats['samples'],
        ], JSON_PRESERVE_ZERO_FRACTION),
        $digest($output), strlen($source), strlen($output)]), "\n";
}
