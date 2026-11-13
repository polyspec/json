<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Polyspec\OrderedJson\Value;

use function Polyspec\OrderedJson\parse;
use function Polyspec\OrderedJson\stringify;

/**
 * The official examples of examples/official.json, run by PHPUnit: each case is the data set of its id of testCase
 * (requirement RQ-022). The cases run against the pure PHP
 * library and, through `make test-php-ext`, against the extension that registers the same API. A case parses its
 * input and compares the source text, the compact serialization and the value tree with the expected results, then the
 * tree of the reparsed serialization and of the value rebuilt through the factories
 * (docs/spec/json-contract.md#acceptance). The examples are read with the library: their trees hold lone surrogates,
 * which json_decode refuses, and every string of a tree is compared as its UTF-16 code units.
 */
final class OfficialTest extends TestCase
{
    /** @return array<string, array{string, string, array<mixed>}> */
    public static function cases(): array
    {
        $official = Value::parse((string)file_get_contents(dirname(__DIR__, 4) . '/examples/official.json'));
        $cases = [];
        foreach ($official->get('cases')->items() as $example) {
            $cases[$example->get('id')->stringValue()] = [
                $example->get('input')->stringValue(),
                $example->get('compact')->stringValue(),
                self::expectedTree($example->get('tree')),
            ];
        }
        return $cases;
    }

    /** @param array<mixed> $tree */
    #[DataProvider('cases')]
    public function testCase(string $input, string $compact, array $tree): void
    {
        $value = parse($input);
        self::assertSame($input, $value->raw());
        self::assertSame($compact, stringify($value));
        self::assertSame($tree, self::tree($value));
        self::assertSame($tree, self::tree(parse(stringify($value))));
        self::assertSame($tree, self::tree(parse(stringify(self::rebuild($value)))));
    }

    /** @return array<mixed> The tree of a value, each string as its UTF-16 code units. */
    private static function tree(Value $value): array
    {
        return match ($value->kind()) {
            'object' => ['object', array_map(
                static fn(string|int $key, Value $member) => [ProbeTree::units((string)$key), self::tree($member)],
                array_keys($value->members()),
                array_values($value->members()),
            )],
            'array' => ['array', array_map(self::tree(...), $value->items())],
            'string' => ['string', $value->stringUnits()],
            'number' => ['number', $value->numberLiteral()],
            'boolean' => ['boolean', $value->booleanValue()],
            default => ['null'],
        };
    }

    /** @return array<mixed> The expected tree of official.json in the form of tree(). */
    private static function expectedTree(Value $tree): array
    {
        $parts = $tree->items();
        $kind = $parts[0]->stringValue();
        return match ($kind) {
            'object' => ['object', array_map(
                static fn(Value $member) => [
                    $member->items()[0]->stringUnits(),
                    self::expectedTree($member->items()[1]),
                ],
                $parts[1]->items(),
            )],
            'array' => ['array', array_map(self::expectedTree(...), $parts[1]->items())],
            'string' => ['string', $parts[1]->stringUnits()],
            'number' => ['number', $parts[1]->stringValue()],
            'boolean' => ['boolean', $parts[1]->booleanValue()],
            default => ['null'],
        };
    }

    /** Inserts the keys in their first order, then sets the values in reverse order. */
    private static function rebuild(Value $value): Value
    {
        if ($value->kind() === 'object') {
            $members = [];
            foreach (array_keys($value->members()) as $key) {
                $members[$key] = Value::null();
            }
            foreach (array_reverse(array_keys($members)) as $key) {
                $members[$key] = self::rebuild($value->get((string)$key));
            }
            return Value::object($members);
        }
        if ($value->kind() === 'array') {
            return Value::array(array_map(self::rebuild(...), $value->items()));
        }
        return $value;
    }
}
