<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson;

// The polyfill pattern: when the extension polyspec_ordered_json is loaded, it defines these functions and the
// constant first and takes precedence; this file defines them only where the extension is absent.
if (!\defined('Polyspec\OrderedJson\MAX_DEPTH')) {
    \define('Polyspec\OrderedJson\MAX_DEPTH', 256);
}

if (!\function_exists('Polyspec\OrderedJson\parse')) {
    function parse(string $source, int $maxDepth = MAX_DEPTH): Value
    {
        return Value::parse($source, $maxDepth);
    }
}

if (!\function_exists('Polyspec\OrderedJson\stringify')) {
    function stringify(Value $value): string
    {
        return $value->compact();
    }
}
