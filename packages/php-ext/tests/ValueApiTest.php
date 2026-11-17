<?php

declare(strict_types=1);

namespace Polyspec\Json\Tests;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Polyspec\Json\JsonTypeError;
use Polyspec\Json\JsonValueError;
use Polyspec\Json\Kind;
use Polyspec\Json\OrderedMap;
use Polyspec\Json\ParseError;
use Polyspec\Json\Value;
use Throwable;
use TypeError;

use function Polyspec\Json\parse;
use function Polyspec\Json\stringify;

use const Polyspec\Json\MAX_DEPTH;

/**
 * The value API of the binding extension Polyspec\Json, run by PHPUnit (`make test-binding-php`). The test of the
 * legacy package with no change beyond the changes of packages/rust/interface.json, each named where it applies
 * (T3.25-3). change-messages: the message of an error is no part of the interface, so a refusal is asserted by its
 * class and its kind where the legacy test read its wording.
 *
 * Requirements: RQ-001, RQ-002, RQ-003, RQ-004, RQ-005, RQ-006, RQ-007, RQ-008, RQ-009, RQ-010, RQ-011, RQ-012,
 * RQ-013, RQ-014, RQ-015, RQ-016, RQ-017, RQ-018, RQ-019, RQ-020, RQ-023, RQ-024.
 */
final class ValueApiTest extends TestCase
{
    /** Runs $body and requires an error of $class whose kind is $kind. */
    private static function expectThrown(string $class, string $kind, callable $body): void
    {
        try {
            $body();
        } catch (Throwable $error) {
            self::assertInstanceOf($class, $error, get_class($error) . ': ' . $error->getMessage());
            self::assertTrue(method_exists($error, 'kind'), get_class($error));
            self::assertSame($kind, $error->kind());
            return;
        }
        self::fail('expected ' . $class . ', no error was raised');
    }

    /** The ParseError that $body throws. */
    private static function rejection(callable $body): ParseError
    {
        try {
            $body();
        } catch (ParseError $error) {
            return $error;
        }
        self::fail('expected ParseError');
    }

    /** The members of an object as [name, raw] pairs in their order (change-ordered-map: the keys are values). */
    private static function pairs(Value $object): array
    {
        $pairs = [];
        foreach ($object->members() as $key => $member) {
            $pairs[] = [$key->stringValue(), $member->raw()];
        }
        return $pairs;
    }

    /** An object of $members, each a name and a value (change-ordered-map: an object takes an OrderedMap). */
    private static function object(array $members): Value
    {
        $map = new OrderedMap();
        foreach ($members as [$name, $value]) {
            $map->insert(Value::string($name), $value);
        }
        return Value::object($map);
    }

    public function testDepthArgumentIsBounded(): void
    {
        self::expectThrown(JsonValueError::class, 'depth_limit_out_of_range', static fn() => parse('[]', -1));
        self::expectThrown(JsonValueError::class, 'depth_limit_out_of_range', static fn() => parse('[]', 257));
    }

    public function testDepthLimitIsEnforced(): void
    {
        self::assertSame(1, count(parse('[[1]]', 2)->items()));
        self::expectThrown(ParseError::class, 'maximum_depth_exceeded', static fn() => parse('[[1]]', 1));
    }

    public function testValuesComeOnlyFromTheLibrary(): void
    {
        self::expectThrown(JsonTypeError::class, 'direct_construction', static fn() => new Value());
        self::expectThrown(JsonTypeError::class, 'invalid_argument_type', static fn() => stringify(new \stdClass()));
    }

    public function testReturnedCollectionsAreImmutable(): void
    {
        // change-collections: members() gives an OrderedMap that shares no state with the value.
        $value = parse('{"a":1,"b":2}');
        $members = $value->members();
        $members->insert(Value::string('c'), Value::null());
        $members->insert(Value::string('a'), Value::null());
        self::assertSame(2, $value->members()->size());
        self::assertSame('{"a":1,"b":2}', stringify($value));
        $array = parse('[1,2]');
        $items = $array->items();
        array_pop($items);
        self::assertSame(2, count($array->items()));
    }

    public function testWrongKindAccessIsReported(): void
    {
        $reads = [
            static fn() => parse('[]')->members(),
            static fn() => parse('{}')->items(),
            static fn() => parse('1')->stringValue(),
            static fn() => parse('"a"')->numberLiteral(),
            static fn() => parse('null')->booleanValue(),
            static fn() => parse('[]')->get('a'),
        ];
        foreach ($reads as $read) {
            self::expectThrown(JsonTypeError::class, 'wrong_kind', $read);
        }
    }

    public function testUnpairedSurrogateStaysInUnits(): void
    {
        $lone = parse('"a\ud800"');
        self::assertSame([0x61, 0xd800], $lone->stringUnits());
    }

    public function testSurrogatePairDecodes(): void
    {
        self::assertSame([0xd83c, 0xdf0d], parse('"🌍"')->stringUnits());
        self::assertSame("\u{1f30d}", parse('"🌍"')->stringValue());
    }

    public function testMemberLookupUsesDecodedNames(): void
    {
        $value = parse('{"aé":1,"b":2}');
        self::assertSame('1', $value->get("a\u{e9}")->raw());
        self::assertSame(null, $value->get('missing'));
        self::assertSame('2', $value->getUnits([0x62])->raw());
        self::assertSame(null, $value->getUnits([0x63]));
    }

    public function testRepeatedKeyKeepsFirstPositionAndLastValue(): void
    {
        self::assertSame([['a', '3'], ['b', '2']], self::pairs(parse('{"a":1,"b":2,"a":3}')));
    }

    public function testRootKeepsSurroundingText(): void
    {
        self::assertSame("  [1] \n", parse("  [1] \n")->raw());
        // change-stringify: stringify is the one serialization.
        self::assertSame('[1]', stringify(parse("  [1] \n")));
    }

    public function testFactoriesValidateArguments(): void
    {
        self::expectThrown(JsonValueError::class, 'invalid_code_unit', static fn() => Value::fromUnits([65536]));
        // change-code-units: a code unit of another type is refused by the conversion of the argument.
        self::expectThrown(JsonTypeError::class, 'invalid_argument_type', static fn() => Value::fromUnits(['a']));
        self::expectThrown(JsonValueError::class, 'invalid_number_literal', static fn() => Value::number(' 1'));
        self::expectThrown(
            JsonTypeError::class,
            'invalid_argument_type',
            static fn() => Value::array(['k' => Value::null()]),
        );
        self::assertSame('"\ud800"', stringify(Value::fromUnits([0xd800])));
        self::assertSame('{"a":1}', stringify(self::object([['a', Value::number('1')]])));
    }

    public function testHostSerializationBoundary(): void
    {
        $encode = static fn() => json_encode(parse('[1]'));
        self::expectThrown(JsonTypeError::class, 'host_serialization_refused', $encode);
        self::assertSame('[1]', (string)parse('[1]'));
    }

    public function testRejectionNamesItsKind(): void
    {
        $kinds = [
            '[1,]' => 'expected_value',
            '{1:2}' => 'expected_object_key',
            '[1.]' => 'expected_digit',
            "\"a\x01b\"" => 'unescaped_control_character',
            '[1] x' => 'trailing_input',
        ];
        foreach ($kinds as $document => $kind) {
            self::assertSame($kind, self::rejection(static fn() => parse((string)$document))->kind());
        }
    }

    public function testInvalidUtf8ReportsTheFirstBadByte(): void
    {
        // The bad byte sits at index 2 of ["<bad>"]; the error names that position.
        $error = self::rejection(static fn() => parse("[\"\xff\"]"));
        self::assertSame('invalid_utf8', $error->kind());
        self::assertSame(2, $error->offset());
    }

    public function testParseErrorsReportOffsets(): void
    {
        self::assertSame(3, self::rejection(static fn() => parse('[1,]'))->offset());
    }

    public function testStrictParseRejectsDuplicateKeys(): void
    {
        $sources = [
            '{"a":1,"a":2}',
            '{"a":1,"a":2}',
            '{"nested":{"a":1,"a":2}}',
            '[{"a":1,"a":2}]',
            '{"\ud800":1,"\ud800":2}',
        ];
        foreach ($sources as $source) {
            parse($source);
            $offset = strrpos($source, ',"') + 1;
            // change-parse-options: the rejection of duplicates is an option of parse.
            $error = self::rejection(static fn() => parse($source, MAX_DEPTH, true));
            self::assertSame('duplicate_object_key', $error->kind());
            self::assertSame($offset, $error->offset());
        }
    }

    public function testStrictParseAcceptsUniqueKeys(): void
    {
        $source = '{"a":1,"nested":[{"b":2}],"state":null}';
        self::assertSame($source, stringify(parse($source, MAX_DEPTH, true)));
        self::assertSame('2', parse($source, MAX_DEPTH, true)->get('nested')->items()[0]->get('b')->raw());
        $error = self::rejection(static fn() => parse("\xff", MAX_DEPTH, true));
        self::assertSame('invalid_utf8', $error->kind());
        self::assertSame(0, $error->offset());
    }

    // Long multibyte text is valid UTF-8 and only a UTF-8 error is invalid. PHP validates with PCRE, whose backtrack or
    // recursion limit must not be read as invalid UTF-8; low limits are the configuration that caught this.
    public function testUtf8ValidationHoldsForLongMultibyteText(): void
    {
        $backtrack = ini_get('pcre.backtrack_limit');
        $recursion = ini_get('pcre.recursion_limit');
        ini_set('pcre.backtrack_limit', '1');
        ini_set('pcre.recursion_limit', '1');
        try {
            $document = '{"key":"' . str_repeat("\u{d55c}\u{1f30d}", 64) . '"}';
            self::assertSame(str_repeat("\u{d55c}\u{1f30d}", 64), parse($document)->get('key')->stringValue());
            $error = self::rejection(static fn() => parse("[\"\xff\"]"));
            self::assertSame('invalid_utf8', $error->kind());
            self::assertSame(2, $error->offset());
        } finally {
            ini_set('pcre.backtrack_limit', (string)$backtrack);
            ini_set('pcre.recursion_limit', (string)$recursion);
        }
    }

    public function testPublicApiExportsTheEntryPoints(): void
    {
        // RQ-023: the parse, serialization, factory and accessor functions are exported.
        $built = self::object([['a', Value::array([
            Value::string('x'),
            Value::number('1'),
            Value::boolean(true),
            Value::null(),
        ])]]);
        self::assertSame('{"a":["x",1,true,null]}', stringify($built));
        $items = parse(stringify($built))->get('a')?->items();
        self::assertNotNull($items);
        // change-kind-enum: the kind is the enum Kind.
        $kinds = array_map(static fn(Value $item) => $item->kind(), $items);
        self::assertSame([Kind::String_, Kind::Number, Kind::Boolean, Kind::Null_], $kinds);
        self::assertSame('x', $items[0]->stringValue());
        self::assertSame('1', $items[1]->numberLiteral());
        self::assertTrue($items[2]->booleanValue());
        self::assertSame(1, $built->members()->size());
    }

    public function testParseErrorExposesKindOffsetAndMessage(): void
    {
        // RQ-024: a parse error exposes its kind, its offset and its message.
        $error = self::rejection(static fn() => parse('[1,]'));
        self::assertSame('expected_value', $error->kind());
        self::assertSame(3, $error->offset());
        self::assertNotSame('', $error->getMessage());
    }

    // Requirements: RQ-009
    public function testStringValueKeepsAnUnpairedSurrogate(): void
    {
        // change-string-value: the Unicode text of a string that holds an unpaired surrogate is refused, and its code
        // units keep it, never replaced by U+FFFD.
        $text = static fn() => parse('"a\ud800"')->stringValue();
        self::expectThrown(JsonValueError::class, 'unpaired_surrogate', $text);
        self::assertSame(null, parse('"a\ud800"')->stringText());
        self::assertSame([0x61, 0xd800], parse('"a\ud800"')->stringUnits());
        self::assertSame("\u{1f30d}", parse('"🌍"')->stringValue());
    }

    // Requirements: RQ-008
    public function testTextInputRejectsLoneSurrogates(): void
    {
        // A literal unpaired surrogate has only its WTF-8 encoding in a PHP string, which is no UTF-8: it is rejected
        // before the grammar is read, at the byte of the surrogate.
        foreach (["[\"\xed\xa0\x80\"]", "[\"\xed\xb0\x80\"]", "{\"\xed\xa0\x80\":1}", "[\"\xed\xa0\x80"] as $source) {
            $error = self::rejection(static fn() => parse($source));
            self::assertSame('invalid_utf8', $error->kind(), bin2hex($source));
            self::assertSame(2, $error->offset());
        }
    }

    // Requirements: RQ-007
    public function testBytesInputIsValidated(): void
    {
        // A PHP string is the byte input: invalid UTF-8 is rejected at its first bad byte; multibyte text is kept.
        $error = self::rejection(static fn() => parse("[\"\xff\"]"));
        self::assertSame('invalid_utf8', $error->kind());
        self::assertSame(2, $error->offset());
        self::assertSame('{"a":"한"}', stringify(parse('{"a":"한"}')));
    }

    // Requirements: RQ-016
    public function testOrderedMapRejectsNonStringKey(): void
    {
        // change-ordered-map, change-argument-types: an object key is a string value, a key of another kind is
        // non_string_key and a key or a member that is no Value is invalid_argument_type.
        $object = self::object([['7', Value::null()], ['a', Value::boolean(true)]]);
        self::assertSame('{"7":null,"a":true}', stringify($object));
        $map = new OrderedMap();
        $insert = static fn(mixed $key, mixed $value) => static fn() => $map->insert($key, $value);
        self::expectThrown(JsonTypeError::class, 'non_string_key', $insert(Value::number('7'), Value::null()));
        self::expectThrown(JsonTypeError::class, 'invalid_argument_type', $insert(7, Value::null()));
        self::expectThrown(JsonTypeError::class, 'invalid_argument_type', $insert(Value::string('a'), 1));
        self::expectThrown(JsonTypeError::class, 'invalid_argument_type', static fn() => Value::object(['a' => 1]));
    }

    // Requirements: RQ-020
    public function testHostSerializationEmbedsValues(): void
    {
        // A native structure that holds a value is refused by the host encoder, which points to the library serializer.
        $value = parse('{"b":1.50,"a":[2]}');
        self::expectThrown(
            JsonTypeError::class,
            'host_serialization_refused',
            static fn() => json_encode(['props' => $value]),
        );
        self::assertSame('{"b":1.50,"a":[2]}', stringify($value));
    }

    // Requirements: RQ-003
    public function testArraysAndObjectsStayDistinct(): void
    {
        $numbers = array_map(static fn(Value $item) => $item->numberLiteral(), parse('[3,1,2]')->items());
        self::assertSame(['3', '1', '2'], $numbers);
        self::assertSame(Kind::Array_, parse('[]')->kind());
        self::assertSame(Kind::Object_, parse('{}')->kind());
        $text = '{"a":[],"b":{},"c":[{}]}';
        self::assertSame($text, stringify(parse($text)));
    }

    // Requirements: RQ-010
    public function testNumberTokensAreKeptExactly(): void
    {
        $tokens = ['1.0e+2', '-0', '0.10', '123456789012345678901234567890', '1E400'];
        $items = parse('[' . implode(',', $tokens) . ']')->items();
        $kept = array_map(static fn(Value $item) => $item->numberLiteral(), $items);
        self::assertSame($tokens, $kept);
        $rejected = ['NaN' => 'expected_value', 'Infinity' => 'expected_value', '-Infinity' => 'expected_digit'];
        $rejected['[NaN]'] = 'expected_value';
        foreach ($rejected as $source => $kind) {
            self::assertSame($kind, self::rejection(static fn() => parse((string)$source))->kind(), (string)$source);
        }
    }

    // Requirements: RQ-011
    public function testSerializationIsIdempotent(): void
    {
        $once = stringify(parse(' { "b" : 1 , "a" : 2 , "b" : 3 } '));
        self::assertSame('{"b":3,"a":2}', $once);
        self::assertSame($once, stringify(parse($once)));
    }

    /**
     * Parsing leaves no reference cycle: a cycle is freed only by the cycle collector, so a large import keeps its
     * memory until the collector runs (limepie P-82).
     */
    public function testParseLeavesNoReferenceCycle(): void
    {
        $enabled = gc_enabled();
        gc_collect_cycles();
        gc_disable();
        try {
            for ($i = 0; $i < 50; $i++) {
                parse('{"a":1,"b":[true,null],"c":{"d":"e"}}');
                parse('[1,{"k":"v"}]', MAX_DEPTH, true);
            }
            self::assertSame(0, gc_collect_cycles());
        } finally {
            if ($enabled) {
                gc_enable();
            }
        }
    }

    /** A parse that fails leaves no reference cycle either. */
    public function testFailedParseLeavesNoReferenceCycle(): void
    {
        $enabled = gc_enabled();
        gc_collect_cycles();
        gc_disable();
        $failures = 0;
        try {
            for ($i = 0; $i < 20; $i++) {
                try {
                    parse('{"a":[1,');
                } catch (ParseError) {
                    $failures++;
                }
            }
            self::assertSame(20, $failures);
            self::assertSame(0, gc_collect_cycles());
        } finally {
            if ($enabled) {
                gc_enable();
            }
        }
    }

    public function testParseErrorRefusesAnUnknownKind(): void
    {
        // change-errors: a ParseError is constructed with a message and a rejection kind, and refuses another kind.
        foreach (['no_such_kind', 'wrong_kind', str_repeat('x', 80), "expected_value\0ignored"] as $kind) {
            $construct = static fn() => new ParseError('m', $kind);
            self::expectThrown(JsonTypeError::class, 'invalid_argument_type', $construct);
        }
        $error = new ParseError('m', 'expected_value');
        self::assertSame('expected_value', $error->kind());
        self::assertInstanceOf(InvalidArgumentException::class, $error);
        self::assertInstanceOf(TypeError::class, new JsonTypeError('m', 'wrong_kind'));
    }
}
