<?php

declare(strict_types=1);

// The probe of the shared verifier for the binding extension Polyspec\Json, which the run loads (-d extension). The
// probe of the legacy package with no change beyond the changes of packages/rust/interface.json, each named where it
// applies (T3.25-3).
require __DIR__ . '/ProbeTree.php';

use Polyspec\Json\JsonTypeError;
use Polyspec\Json\JsonValueError;
use Polyspec\Json\OrderedMap;
use Polyspec\Json\ParseError;
use Polyspec\Json\Tests\ProbeTree;
use Polyspec\Json\Value;

use function Polyspec\Json\parse;
use function Polyspec\Json\stringify;

// The reply to an argument request {"call": call, "argument": argument} of the shared verifier.
$call = static function (string $line): string {
    $request = parse($line);
    $argument = $request->get('argument');
    try {
        match ($request->get('call')->stringValue()) {
            'number' => Value::number($argument->stringValue()),
            'max_depth' => parse('1', (int)$argument->numberLiteral()),
            'string_value' => $argument->stringValue(),
            // change-ordered-map: an object takes an OrderedMap whose keys are values, so a key of another kind is
            // written.
            'object_key' => (new OrderedMap())->insert($argument, Value::null()),
        };
    } catch (JsonValueError | JsonTypeError $e) {
        // change-errors: the error classes of the categories; a ParseError is a JsonValueError.
        return '{"ok":false,"kind":' . ProbeTree::quote($e->kind()) . '}';
    }
    return '{"ok":true}';
};

// No test cases or expectations here; the shared verifier supplies documents.
while (($line = fgets(STDIN)) !== false) {
    if (str_starts_with($line, '{')) {
        echo $call(rtrim($line, "\r\n")), "\n";
        continue;
    }
    $source = file_get_contents(rtrim($line, "\r\n"));
    if ($source === false) {
        throw new RuntimeException('Cannot read document');
    }
    try {
        $value = parse($source);
    } catch (ParseError $e) {
        echo '{"ok":false,"offset":', $e->offset(), ',"unit":"byte","kind":', ProbeTree::quote($e->kind()), '}', "\n";
        continue;
    }
    // change-stringify: stringify is the one serialization, so the compact text is that of stringify.
    $serialized = stringify($value);
    $roundtrip = parse($serialized);
    $factory = stringify(Value::string("quote \" slash \\ line\n 한 🌍"));
    echo '{"ok":true',
        ',"raw":', ProbeTree::quote($value->raw()),
        ',"serialized":', ProbeTree::quote($serialized),
        ',"compact":', ProbeTree::quote($serialized),
        ',"tree":', ProbeTree::tree($value),
        ',"roundtrip":', ProbeTree::quote(stringify($roundtrip)),
        ',"roundtrip_tree":', ProbeTree::tree($roundtrip),
        ',"rebuilt":', ProbeTree::quote(stringify(ProbeTree::rebuild($value))),
        ',"factory":', ProbeTree::quote($factory),
        "}\n";
}
