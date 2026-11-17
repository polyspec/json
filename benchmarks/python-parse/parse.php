<?php

// One parse of the document of argv[1] with the binding extension Polyspec\Json, which the run loads (-d extension);
// prints the CPU seconds of the parse (user and system time of getrusage). benchmarks/python-parse/run.py starts it
// with php -n and the release library of make binding-php-ext-release-library (T3.25-3).
declare(strict_types=1);

$cpuSeconds = static function (): float {
    $usage = getrusage();
    return $usage['ru_utime.tv_sec'] + $usage['ru_utime.tv_usec'] / 1e6
        + $usage['ru_stime.tv_sec'] + $usage['ru_stime.tv_usec'] / 1e6;
};

$data = file_get_contents($argv[1]);
$started = $cpuSeconds();
$value = Polyspec\Json\parse($data);
$elapsed = $cpuSeconds() - $started;
if (count($value->items()) !== (int) $argv[2]) {
    fwrite(STDERR, 'parsed ' . count($value->items()) . ' items, not ' . $argv[2] . PHP_EOL);
    exit(1);
}
printf("%.6f\n", $elapsed);
