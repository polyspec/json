<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson\Tests;

use InvalidArgumentException;
use LogicException;
use PHPUnit\Framework\TestCase;
use Polyspec\OrderedJson\ParseError;
use Polyspec\OrderedJson\Value;
use Throwable;
use TypeError;
use UnexpectedValueException;

use function Polyspec\OrderedJson\parse;
use function Polyspec\OrderedJson\stringify;

/**
 * The value API, run by PHPUnit. The pure PHP library and
 * the extension that registers the same API answer identically, so `make test-php` runs these tests without the
 * extension and `make test-php-ext` with it.
 *
 * Requirements: RQ-001, RQ-002, RQ-003, RQ-004, RQ-005, RQ-006, RQ-007, RQ-008, RQ-009, RQ-010, RQ-011, RQ-012,
 * RQ-013, RQ-014, RQ-015, RQ-016, RQ-017, RQ-018, RQ-019, RQ-020, RQ-023, RQ-024.
 */
final class ValueApiTest extends TestCase
{
    /** Runs $body and requires an error of $class whose message contains $message. */
    private static function expectThrown(string $class, string $message, callable $body): void
    {
        try {
            $body();
        } catch (Throwable $error) {
            self::assertInstanceOf($class, $error, get_class($error) . ': ' . $error->getMessage());
            if ($message !== '') {
                self::assertStringContainsString($message, $error->getMessage());
            }
            return;
        }
        self::fail('expected ' . $class . ', no error was raised');
    }

    public function testDepthArgumentIsBounded(): void
    {
        self::expectThrown(InvalidArgumentException::class, 'maxDepth', static fn() => Value::parse('[]', -1));
        self::expectThrown(InvalidArgumentException::class, 'maxDepth', static fn() => Value::parse('[]', 257));
    }

    public function testDepthLimitIsEnforced(): void
    {
        self::assertSame(1, count(Value::parse('[[1]]', 2)->items()));
        self::expectThrown(ParseError::class, 'Maximum nesting depth', static fn() => Value::parse('[[1]]', 1));
    }

    public function testValuesComeOnlyFromTheLibrary(): void
    {
        self::expectThrown(\Error::class, '', static fn() => new Value());
        self::expectThrown(TypeError::class, '', static fn() => \Polyspec\OrderedJson\stringify(new \stdClass()));
    }

    public function testReturnedCollectionsAreImmutable(): void
    {
        $value = Value::parse('{"a":1,"b":2}');
        $members = $value->members();
        unset($members['a']);
        self::assertSame(2, count($value->members()));
        $array = Value::parse('[1,2]');
        $items = $array->items();
        array_pop($items);
        self::assertSame(2, count($array->items()));
    }

    public function testWrongKindAccessIsReported(): void
    {
        self::expectThrown(
            LogicException::class,
            'Expected object, got array',
            static fn() => Value::parse('[]')->members(),
        );
        self::expectThrown(
            LogicException::class,
            'Expected array, got object',
            static fn() => Value::parse('{}')->items(),
        );
        self::expectThrown(
            LogicException::class,
            'Expected string, got number',
            static fn() => Value::parse('1')->stringValue(),
        );
        self::expectThrown(
            LogicException::class,
            'Expected number, got string',
            static fn() => Value::parse('"a"')->numberLiteral(),
        );
        self::expectThrown(
            LogicException::class,
            'Expected boolean, got null',
            static fn() => Value::parse('null')->booleanValue(),
        );
        self::expectThrown(
            LogicException::class,
            'Expected object, got array',
            static fn() => Value::parse('[]')->get('a'),
        );
    }

    public function testUnpairedSurrogateStaysInUnits(): void
    {
        $lone = Value::parse('"a\ud800"');
        self::assertSame([0x61, 0xd800], $lone->stringUnits());
    }

    public function testSurrogatePairDecodes(): void
    {
        self::assertSame([0xd83c, 0xdf0d], Value::parse('"\ud83c\udf0d"')->stringUnits());
        self::assertSame("\u{1f30d}", Value::parse('"\ud83c\udf0d"')->stringValue());
    }

    public function testMemberLookupUsesDecodedNames(): void
    {
        $value = Value::parse('{"a\u00e9":1,"b":2}');
        self::assertSame('1', $value->get("a\u{e9}")->raw());
        self::assertSame(null, $value->get('missing'));
        self::assertSame('2', $value->getUnits([0x62])->raw());
        self::assertSame(null, $value->getUnits([0x63]));
    }

    public function testRepeatedKeyKeepsFirstPositionAndLastValue(): void
    {
        $members = Value::parse('{"a":1,"b":2,"a":3}')->members();
        self::assertSame(['a', 'b'], array_keys($members));
        self::assertSame('3', $members['a']->raw());
    }

    public function testRootKeepsSurroundingText(): void
    {
        self::assertSame("  [1] \n", Value::parse("  [1] \n")->raw());
        self::assertSame('[1]', Value::parse("  [1] \n")->compact());
    }

    public function testFactoriesValidateArguments(): void
    {
        self::expectThrown(
            InvalidArgumentException::class,
            'UTF-16 code units',
            static fn() => Value::fromUnits([65536]),
        );
        self::expectThrown(
            InvalidArgumentException::class,
            'UTF-16 code units',
            static fn() => Value::fromUnits(['a']),
        );
        self::expectThrown(InvalidArgumentException::class, 'without whitespace', static fn() => Value::number(' 1'));
        self::expectThrown(
            InvalidArgumentException::class,
            'list of values',
            static fn() => Value::array(['k' => Value::null()]),
        );
        self::assertSame('"\ud800"', Value::fromUnits([0xd800])->compact());
        self::assertSame('{"a":1}', Value::object(['a' => Value::number('1')])->compact());
    }

    public function testHostSerializationBoundary(): void
    {
        self::expectThrown(
            LogicException::class,
            'Polyspec\\OrderedJson\\stringify',
            static fn() => json_encode(Value::parse('[1]')),
        );
        self::assertSame('[1]', (string)Value::parse('[1]'));
    }

    public function testRejectionNamesItsKind(): void
    {
        // The wording is PHP's own; the kind is the shared contract.
        $kinds = [
            '[1,]' => 'expected_value',
            '{1:2}' => 'expected_object_key',
            '[1.]' => 'expected_digit',
            "\"a\x01b\"" => 'unescaped_control_character',
            '[1] x' => 'trailing_input',
        ];
        foreach ($kinds as $document => $kind) {
            try {
                Value::parse($document);
            } catch (ParseError $error) {
                self::assertSame($kind, $error->kind);
                continue;
            }
            self::fail('accepted ' . $document);
        }
    }

    public function testInvalidUtf8ReportsTheFirstBadByte(): void
    {
        // The bad byte sits at index 2 of ["<bad>"]; the error names that position.
        try {
            Value::parse("[\"\xff\"]");
        } catch (ParseError $error) {
            self::assertSame('Invalid UTF-8', substr($error->getMessage(), 0, 13));
            self::assertSame(2, $error->offset);
            return;
        }
        self::fail('expected ParseError for invalid UTF-8');
    }

    public function testParseErrorsReportOffsets(): void
    {
        try {
            Value::parse('[1,]');
        } catch (ParseError $error) {
            self::assertSame(3, $error->offset);
            return;
        }
        self::fail('expected ParseError');
    }

    public function testStrictParseRejectsDuplicateKeys(): void
    {
        $sources = [
            '{"a":1,"a":2}',
            '{"a":1,"\u0061":2}',
            '{"nested":{"a":1,"a":2}}',
            '[{"a":1,"a":2}]',
            '{"\ud800":1,"\ud800":2}',
        ];
        foreach ($sources as $source) {
            Value::parse($source);
            $offset = strrpos($source, ',"') + 1;
            try {
                Value::parseRejectDuplicates($source);
            } catch (ParseError $error) {
                self::assertSame('Duplicate object key at byte ' . $offset, $error->getMessage());
                self::assertSame('duplicate_object_key', $error->kind);
                self::assertSame($offset, $error->offset);
                continue;
            }
            self::fail('accepted ' . $source);
        }
    }

    public function testStrictParseAcceptsUniqueKeys(): void
    {
        $source = '{"a":1,"nested":[{"b":2}],"state":null}';
        self::assertSame($source, Value::parseRejectDuplicates($source)->compact());
        self::assertSame('2', Value::parseRejectDuplicates($source)->get('nested')->items()[0]->get('b')->raw());
        try {
            Value::parseRejectDuplicates("\xff");
        } catch (ParseError $error) {
            self::assertSame('Invalid UTF-8 at byte 0', $error->getMessage());
            self::assertSame(0, $error->offset);
            return;
        }
        self::fail('expected ParseError for invalid UTF-8');
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
            self::assertSame(str_repeat("\u{d55c}\u{1f30d}", 64), Value::parse($document)->get('key')->stringValue());
            try {
                Value::parse("[\"\xff\"]");
                self::fail('expected ParseError for invalid UTF-8');
            } catch (ParseError $error) {
                self::assertSame('Invalid UTF-8 at byte 2', $error->getMessage());
                self::assertSame(2, $error->offset);
            }
        } finally {
            ini_set('pcre.backtrack_limit', (string)$backtrack);
            ini_set('pcre.recursion_limit', (string)$recursion);
        }
    }

    public function testPublicApiExportsTheEntryPoints(): void
    {
        // RQ-023: the parse, serialization, factory and accessor functions are exported.
        $built = Value::object(['a' => Value::array([
            Value::string('x'),
            Value::number('1'),
            Value::boolean(true),
            Value::null(),
        ])]);
        self::assertSame('{"a":["x",1,true,null]}', stringify($built));
        $items = parse(stringify($built))->get('a')?->items();
        self::assertNotNull($items);
        $kinds = array_map(static fn(Value $item) => $item->kind(), $items);
        self::assertSame(['string', 'number', 'boolean', 'null'], $kinds);
        self::assertSame('x', $items[0]->stringValue());
        self::assertSame('1', $items[1]->numberLiteral());
        self::assertTrue($items[2]->booleanValue());
        self::assertCount(1, $built->members());
    }

    public function testParseErrorExposesKindOffsetAndMessage(): void
    {
        // RQ-024: a parse error exposes its kind, its offset and its message.
        try {
            parse('[1,]');
            self::fail('expected ParseError');
        } catch (ParseError $error) {
            self::assertSame('expected_value', $error->kind);
            self::assertSame(3, $error->offset);
            self::assertNotSame('', $error->getMessage());
        }
    }

    // Requirements: RQ-009
    public function testStringValueKeepsAnUnpairedSurrogate(): void
    {
        // The string value is the library form: UTF-8 with an unpaired surrogate as WTF-8, never replaced by U+FFFD.
        self::assertSame("a\xed\xa0\x80", Value::parse('"a\ud800"')->stringValue());
        self::assertSame("\u{1f30d}", Value::parse('"\ud83c\udf0d"')->stringValue());
    }

    // Requirements: RQ-008
    public function testTextInputRejectsLoneSurrogates(): void
    {
        // A literal unpaired surrogate has only its WTF-8 encoding in a PHP string, which is no UTF-8: it is rejected
        // before the grammar is read, at the byte of the surrogate.
        foreach (["[\"\xed\xa0\x80\"]", "[\"\xed\xb0\x80\"]", "{\"\xed\xa0\x80\":1}", "[\"\xed\xa0\x80"] as $source) {
            try {
                Value::parse($source);
                self::fail('expected ParseError for ' . bin2hex($source));
            } catch (ParseError $error) {
                self::assertSame('invalid_utf8', $error->kind);
                self::assertSame(2, $error->offset);
            }
        }
    }

    // Requirements: RQ-007
    public function testBytesInputIsValidated(): void
    {
        // A PHP string is the byte input: invalid UTF-8 is rejected at its first bad byte; multibyte text is kept.
        try {
            Value::parse("[\"\xff\"]");
            self::fail('expected ParseError for invalid UTF-8');
        } catch (ParseError $error) {
            self::assertSame('invalid_utf8', $error->kind);
            self::assertSame(2, $error->offset);
        }
        self::assertSame('{"a":"한"}', Value::parse('{"a":"한"}')->compact());
    }

    // Requirements: RQ-016
    public function testOrderedMapRejectsNonStringKey(): void
    {
        // A PHP array key is a string or an integer, and no other type exists: an integer key is the object key of its
        // decimal digits, and a value that is no Value is rejected.
        $object = Value::object([7 => Value::null(), 'a' => Value::boolean(true)]);
        self::assertSame('{"7":null,"a":true}', $object->compact());
        self::expectThrown(
            InvalidArgumentException::class,
            'Expected ordered_json Value',
            static fn() => Value::object(['a' => 1]),
        );
    }

    // Requirements: RQ-020
    public function testHostSerializationEmbedsValues(): void
    {
        // A native structure that holds a value is refused by the host encoder, which points to the library serializer.
        $value = Value::parse('{"b":1.50,"a":[2]}');
        self::expectThrown(
            LogicException::class,
            'Polyspec\\OrderedJson\\stringify',
            static fn() => json_encode(['props' => $value]),
        );
        self::assertSame('{"b":1.50,"a":[2]}', stringify($value));
    }

    // Requirements: RQ-003
    public function testArraysAndObjectsStayDistinct(): void
    {
        $numbers = array_map(static fn(Value $item) => $item->numberLiteral(), Value::parse('[3,1,2]')->items());
        self::assertSame(['3', '1', '2'], $numbers);
        self::assertSame('array', Value::parse('[]')->kind());
        self::assertSame('object', Value::parse('{}')->kind());
        $text = '{"a":[],"b":{},"c":[{}]}';
        self::assertSame($text, stringify(Value::parse($text)));
    }

    // Requirements: RQ-010
    public function testNumberTokensAreKeptExactly(): void
    {
        $tokens = ['1.0e+2', '-0', '0.10', '123456789012345678901234567890', '1E400'];
        $items = Value::parse('[' . implode(',', $tokens) . ']')->items();
        $kept = array_map(static fn(Value $item) => $item->numberLiteral(), $items);
        self::assertSame($tokens, $kept);
        $rejected = ['NaN' => 'expected_value', 'Infinity' => 'expected_value', '-Infinity' => 'expected_digit'];
        $rejected['[NaN]'] = 'expected_value';
        foreach ($rejected as $source => $kind) {
            try {
                Value::parse((string)$source);
                self::fail("expected ParseError for $source");
            } catch (ParseError $error) {
                self::assertSame($kind, $error->kind);
            }
        }
    }

    // Requirements: RQ-011
    public function testSerializationIsIdempotent(): void
    {
        $once = stringify(Value::parse(' { "b" : 1 , "a" : 2 , "b" : 3 } '));
        self::assertSame('{"b":3,"a":2}', $once);
        self::assertSame($once, stringify(Value::parse($once)));
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
                Value::parse('{"a":1,"b":[true,null],"c":{"d":"e"}}');
                Value::parseRejectDuplicates('[1,{"k":"v"}]');
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
                    Value::parse('{"a":[1,');
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

    public function testParseErrorRefusesAnUnknownMessage(): void
    {
        foreach (['no such message', str_repeat('x', 80), "Expected JSON value\0ignored"] as $message) {
            self::expectThrown(
                LogicException::class,
                'ParseError has no kind',
                static fn() => new ParseError($message, 0),
            );
        }
    }
}
