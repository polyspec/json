<?php

declare(strict_types=1);

/*
 * The differential test of the legacy PHP implementations and the binding (make test-differential-php).
 *
 * Requirements: V-6 (5) of docs/spec/json-contract.md#transition (T3.25-3). Every file of test_parsing of the
 * supplementary suite and every source of examples/official.json parse in the legacy API Polyspec\OrderedJson and in
 * the binding Polyspec\Json, both loaded in the PHP that runs this file, and each gives the same outcome in both: the
 * same compact serialization, or a rejection of the same kind at the same byte offset. make test-differential-php runs
 * it twice, with the legacy API of the pure PHP library and with that of the legacy extension, which registers the same
 * API. A difference fails, since none has a verdict. The examples are read with the binding: their trees hold lone
 * surrogates, which json_decode refuses. It is no test of make test-php, which collects the files *Test.php.
 */

// The compact text that $run returns, or the kind and the offset of the rejection that it throws.
$outcome = static function (callable $run): array {
    try {
        return ['text', $run()];
    } catch (\Polyspec\OrderedJson\ParseError $error) {
        return ['rejection', $error->kind, $error->offset];
    } catch (\Polyspec\Json\ParseError $error) {
        return ['rejection', $error->kind(), $error->offset()];
    }
};

// The difference of the outcomes of $source in the legacy API and in the binding, or null when they agree.
$difference = static function (string $source) use ($outcome): ?array {
    $legacy = $outcome(fn () => \Polyspec\OrderedJson\stringify(\Polyspec\OrderedJson\parse($source)));
    $binding = $outcome(fn () => \Polyspec\Json\stringify(\Polyspec\Json\parse($source)));
    return $legacy === $binding ? null : ['legacy' => $legacy, 'binding' => $binding];
};

$suite = getenv('JSON_TEST_SUITE');
if ($suite === false || $suite === '') {
    fwrite(STDERR, "JSON_TEST_SUITE names the installed supplementary suite (make json-install-suite)\n");
    exit(2);
}
$differences = [];
$parsing = $suite . '/test_parsing';
$files = array_values(array_diff((array)scandir($parsing), ['.', '..']));
foreach ($files as $name) {
    $found = $difference((string)file_get_contents($parsing . '/' . $name));
    if ($found !== null) {
        $differences[$name] = $found;
    }
}
$official = \Polyspec\Json\parse((string)file_get_contents(dirname(__DIR__, 4) . '/examples/official.json'));
$examples = $official->get('cases')->items();
foreach ($examples as $example) {
    $found = $difference($example->get('source')->stringValue());
    if ($found !== null) {
        $differences['official:' . $example->get('id')->stringValue()] = $found;
    }
}
foreach ($differences as $case => $found) {
    fwrite(STDERR, $case . ': ' . json_encode($found, JSON_INVALID_UTF8_SUBSTITUTE) . "\n");
}
printf(
    "%d files of test_parsing and %d official examples, %d differences\n",
    count($files),
    count($examples),
    count($differences),
);
exit($differences === [] ? 0 : 1);
