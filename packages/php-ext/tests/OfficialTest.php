<?php

declare(strict_types=1);

namespace Polyspec\Json\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Polyspec\Json\Kind;
use Polyspec\Json\OrderedMap;
use Polyspec\Json\Value;

use function Polyspec\Json\parse;
use function Polyspec\Json\stringify;

/**
 * The official examples of examples/official.json, run by PHPUnit against the binding extension Polyspec\Json: each
 * case is the data set of its id of testCase (requirement RQ-022). A case parses its input and compares the source
 * text, the compact serialization and the value tree with the expected results, then the tree of the reparsed
 * serialization and of the value rebuilt through the factories (docs/spec/json-contract.md#acceptance). The examples
 * are read with the library: their trees hold lone surrogates, which json_decode refuses, and every string of a tree is
 * compared as its UTF-16 code units. The test of the legacy package with no change beyond the changes of
 * packages/rust/interface.json, each named where it applies (T3.25-3).
 */
final class OfficialTest extends TestCase
{
    /** @return array<string, array{string, string, array<mixed>}> */
    public static function cases(): array
    {
        // change-parse-source: parse is the one entry of a parse.
        $official = parse((string)file_get_contents(dirname(__DIR__, 3) . '/examples/official.json'));
        $cases = [];
        foreach ($official->get('cases')->items() as $example) {
            $cases[$example->get('id')->stringValue()] = [
                $example->get('source')->stringValue(),
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

    /**
     * @return array<mixed> The tree of a value, each string as its UTF-16 code units (change-accessors and
     * change-ordered-map: the members of an object are an OrderedMap whose keys are values; change-kind-enum: the kind
     * is the enum Kind).
     */
    private static function tree(Value $value): array
    {
        if ($value->kind() === Kind::Object_) {
            $members = [];
            foreach ($value->members() as $key => $member) {
                $members[] = [$key->stringUnits(), self::tree($member)];
            }
            return ['object', $members];
        }
        return match ($value->kind()) {
            Kind::Array_ => ['array', array_map(self::tree(...), $value->items())],
            Kind::String_ => ['string', $value->stringUnits()],
            Kind::Number => ['number', $value->numberLiteral()],
            Kind::Boolean => ['boolean', $value->booleanValue()],
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

    /**
     * Inserts the keys in their first order, then sets the values in reverse order (change-ordered-map: an object takes
     * an OrderedMap, whose insert of a present key keeps its position and sets its value).
     */
    private static function rebuild(Value $value): Value
    {
        if ($value->kind() === Kind::Object_) {
            $keys = [];
            foreach ($value->members() as $key => $_) {
                $keys[] = $key;
            }
            $members = new OrderedMap();
            foreach ($keys as $key) {
                $members->insert($key, Value::null());
            }
            foreach (array_reverse($keys) as $key) {
                $members->insert($key, self::rebuild($value->getUnits($key->stringUnits())));
            }
            return Value::object($members);
        }
        if ($value->kind() === Kind::Array_) {
            return Value::array(array_map(self::rebuild(...), $value->items()));
        }
        return $value;
    }
}
