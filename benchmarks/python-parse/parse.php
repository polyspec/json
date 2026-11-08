<?php

// One parse of the document of argv[2] with the pure PHP package of the folder argv[1]; prints the CPU seconds of the
// parse (user and system time of getrusage). benchmarks/python-parse/run.py starts it with php -n and the folder of the
// implementation php of config/implementations.json.
declare(strict_types=1);

require $argv[1] . '/vendor/autoload.php';

$cpuSeconds = static function (): float {
    $usage = getrusage();
    return $usage['ru_utime.tv_sec'] + $usage['ru_utime.tv_usec'] / 1e6
        + $usage['ru_stime.tv_sec'] + $usage['ru_stime.tv_usec'] / 1e6;
};

$data = file_get_contents($argv[2]);
$started = $cpuSeconds();
$value = Polyspec\OrderedJson\parse($data);
$elapsed = $cpuSeconds() - $started;
if (count($value->items()) !== (int) $argv[3]) {
    fwrite(STDERR, 'parsed ' . count($value->items()) . ' items, not ' . $argv[3] . PHP_EOL);
    exit(1);
}
printf("%.6f\n", $elapsed);
