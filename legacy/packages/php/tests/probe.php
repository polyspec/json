<?php

declare(strict_types=1);

// The library is whatever the run loaded: the Composer autoloader of the package (auto_prepend_file) or the extension.
require __DIR__ . '/ProbeTree.php';

use Polyspec\OrderedJson\ArgumentError;
use Polyspec\OrderedJson\ParseError;
use Polyspec\OrderedJson\Tests\ProbeTree;
use Polyspec\OrderedJson\UsageError;
use Polyspec\OrderedJson\Value;

use function Polyspec\OrderedJson\parse;
use function Polyspec\OrderedJson\stringify;

// The reply to an argument request {"call": call, "argument": argument} of the shared verifier. A PHP object key is
// an array key, never a Value, so object_key cannot be written, as the JSON contract states for non_string_key.
$call = static function (string $line): string {
    $request = parse($line);
    $argument = $request->get('argument');
    try {
        match ($request->get('call')->stringValue()) {
            'number' => Value::number($argument->stringValue()),
            'max_depth' => parse('1', (int)$argument->numberLiteral()),
            'string_value' => $argument->stringValue(),
            'object_key' => null,
        };
    } catch (ParseError | ArgumentError | UsageError $e) {
        return '{"ok":false,"kind":' . ProbeTree::quote($e->kind) . '}';
    }
    return $request->get('call')->stringValue() === 'object_key' ? '{"absent":true}' : '{"ok":true}';
};

// No test cases or expectations here; the common verifier supplies documents.
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
        echo '{"ok":false,"offset":', $e->offset, ',"unit":"byte","kind":', ProbeTree::quote($e->kind), '}', "\n";
        continue;
    }
    $serialized = stringify($value);
    $roundtrip = parse($serialized);
    $factory = Value::string("quote \" slash \\ line\n 한 🌍")->compact();
    echo '{"ok":true',
        ',"raw":', ProbeTree::quote($value->raw()),
        ',"serialized":', ProbeTree::quote($serialized),
        ',"compact":', ProbeTree::quote($value->compact()),
        ',"tree":', ProbeTree::tree($value),
        ',"roundtrip":', ProbeTree::quote(stringify($roundtrip)),
        ',"roundtrip_tree":', ProbeTree::tree($roundtrip),
        ',"rebuilt":', ProbeTree::quote(ProbeTree::rebuild($value)->compact()),
        ',"factory":', ProbeTree::quote($factory),
        "}\n";
}
