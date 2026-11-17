<?php

declare(strict_types=1);

namespace Polyspec\Json\Tests;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Polyspec\Json\JsonTypeError;
use Polyspec\Json\JsonValueError;
use Polyspec\Json\OrderedMap;
use Polyspec\Json\ParseError;
use Polyspec\Json\Value;
use Throwable;
use TypeError;

use function Polyspec\Json\parse;
use function Polyspec\Json\stringify;

use const Polyspec\Json\MAX_DEPTH;

/**
 * The kinds of the errors of the binding extension Polyspec\Json, run by PHPUnit (`make test-binding-php`). Every error
 * that the binding throws names its kind on `kind()`: a ParseError the rejection kinds of the JSON contract, a
 * JsonTypeError or JsonValueError the argument kinds (change-errors). Each kind has an accepting and a refusing site.
 * The test of the legacy package with no change beyond the changes of packages/rust/interface.json, each named where it
 * applies (T3.25-3). The test of the kinds that cannot arise in PHP waits for the removal of the legacy package, as in
 * Python (T3.25-2).
 *
 * Requirements: RQ-005, RQ-025.
 */
final class ErrorKindTest extends TestCase
{
    /** The error that $body throws, which must be an instance of $class. */
    private static function thrown(string $class, callable $body): Throwable
    {
        try {
            $body();
        } catch (Throwable $error) {
            self::assertInstanceOf($class, $error, $error->getMessage());
            return $error;
        }
        self::fail('nothing was thrown');
    }

    /** The kind of the error of $class that $body throws. */
    private static function kind(string $class, callable $body): string
    {
        $error = self::thrown($class, $body);
        self::assertTrue(method_exists($error, 'kind'), $class);
        return $error->kind();
    }

    /** An insert of $key into a new map (change-ordered-map: an object key is a value). */
    private static function insert(mixed $key, mixed $value = null): void
    {
        (new OrderedMap())->insert($key, $value ?? Value::null());
    }

    /** @return list<array{string, class-string, callable, callable}> Each kind with its class and its two sites. */
    private static function cases(): array
    {
        return [
            // change-parse-source: parse is the one entry of a parse.
            ['expected_value', ParseError::class, static fn() => parse('[1]'), static fn() => parse('[1,]')],
            ['expected_digit', ParseError::class, static fn() => parse('1.5'), static fn() => parse('1.')],
            ['expected_colon', ParseError::class, static fn() => parse('{"a":1}'), static fn() => parse('{"a" 1}')],
            ['expected_delimiter', ParseError::class, static fn() => parse('[1,2]'), static fn() => parse('[1 2]')],
            ['expected_object_key', ParseError::class, static fn() => parse('{"a":1}'),
                static fn() => parse('{1:2}')],
            ['invalid_escape', ParseError::class, static fn() => parse('"\n"'), static fn() => parse('"\x"')],
            ['invalid_unicode_escape', ParseError::class, static fn() => parse('"A"'),
                static fn() => parse('"\u00g1"')],
            ['unfinished_escape', ParseError::class, static fn() => parse('"\\\\"'), static fn() => parse('"\\')],
            ['unterminated_string', ParseError::class, static fn() => parse('"a"'), static fn() => parse('"a')],
            ['unescaped_control_character', ParseError::class, static fn() => parse('"a\tb"'),
                static fn() => parse("\"a\tb\"")],
            ['invalid_utf8', ParseError::class, static fn() => parse('"한"'), static fn() => parse("\"\xff\"")],
            ['maximum_depth_exceeded', ParseError::class, static fn() => parse('[[]]', 2),
                static fn() => parse('[[]]', 1)],
            ['trailing_input', ParseError::class, static fn() => parse('[1] '), static fn() => parse('[1] x')],
            // change-parse-options: the rejection of duplicates is an option of parse.
            ['duplicate_object_key', ParseError::class, static fn() => parse('{"a":1,"b":2}', MAX_DEPTH, true),
                static fn() => parse('{"a":1,"a":2}', MAX_DEPTH, true)],
            // change-string-constructor: a text that is no UTF-8 is refused by the binding.
            ['invalid_text', JsonValueError::class, static fn() => Value::string('한'),
                static fn() => Value::string("\xff")],
            // change-argument-types: a key that is a value of another kind than string.
            ['non_string_key', JsonTypeError::class, static fn() => self::insert(Value::string('a')),
                static fn() => self::insert(Value::number('1'))],
            // change-errors: the argument kinds are a JsonTypeError or a JsonValueError.
            ['wrong_kind', JsonTypeError::class, static fn() => parse('"x"')->stringValue(),
                static fn() => parse('1')->stringValue()],
            ['invalid_number_literal', JsonValueError::class, static fn() => Value::number('-0.5e3'),
                static fn() => Value::number(' 1')],
            ['depth_limit_out_of_range', JsonValueError::class, static fn() => parse('1', 256),
                static fn() => parse('1', 257)],
            ['invalid_argument_type', JsonTypeError::class, static fn() => Value::array([Value::null()]),
                static fn() => Value::array([1])],
            ['invalid_code_unit', JsonValueError::class, static fn() => Value::fromUnits([0xffff]),
                static fn() => Value::fromUnits([0x10000])],
            // change-stringify: stringify is the one serialization.
            ['host_serialization_refused', JsonTypeError::class, static fn() => stringify(Value::null()),
                static fn() => json_encode(Value::null(), JSON_THROW_ON_ERROR)],
            // change-errors: a value is made by the library only, as in JavaScript and Python.
            ['direct_construction', JsonTypeError::class, static fn() => Value::null(), static fn() => new Value()],
        ];
    }

    public function testEveryKindHasAnAcceptingAndARefusingSite(): void
    {
        foreach (self::cases() as [$kind, $class, $accept, $refuse]) {
            $accept();
            self::assertSame($kind, self::kind($class, $refuse), $kind);
        }
    }

    public function testEveryRefusedArgumentCarriesItsKind(): void
    {
        foreach (['[]', '"1"', 'true', 'null', '1 ', "\n1"] as $literal) {
            $build = static fn() => Value::number($literal);
            self::assertSame('invalid_number_literal', self::kind(JsonValueError::class, $build));
        }
        self::assertSame('expected_value', self::kind(ParseError::class, static fn() => Value::number('x')));
        $object = parse('{}');
        $array = parse('[]');
        $reads = [
            static fn() => $object->items(), static fn() => $array->members(), static fn() => $object->stringValue(),
            static fn() => $object->stringUnits(), static fn() => $object->numberLiteral(),
            static fn() => $object->booleanValue(), static fn() => $array->get('a'),
            static fn() => $array->getUnits([97]),
        ];
        foreach ($reads as $read) {
            self::assertSame('wrong_kind', self::kind(JsonTypeError::class, $read));
        }
        foreach ([Value::null(), parse('[]'), parse('{}')] as $key) {
            self::assertSame('non_string_key', self::kind(JsonTypeError::class, static fn() => self::insert($key)));
        }
        foreach ([-1, 257] as $limit) {
            $parse = static fn() => parse('1', $limit);
            self::assertSame('depth_limit_out_of_range', self::kind(JsonValueError::class, $parse));
        }
        // change-depth-limit: a limit that is no integer of the contract is refused by the conversion of the
        // argument, a number with invalid_number and a value of another type with invalid_argument_type.
        foreach ([PHP_INT_MAX, 1.5, NAN] as $limit) {
            $parse = static fn() => parse('1', $limit);
            self::assertSame('invalid_number', self::kind(JsonValueError::class, $parse));
        }
        self::assertSame('invalid_argument_type', self::kind(JsonTypeError::class, static fn() => parse('1', '1')));
        // change-code-units: a code unit is an unsigned integer of the contract. The conversion of the argument
        // refuses a number that is no unsigned integer with invalid_number and a value of another type with
        // invalid_argument_type; the core refuses an unsigned integer above 65535 with invalid_code_unit.
        $units = [
            [[0x10000], JsonValueError::class, 'invalid_code_unit'],
            [[-1], JsonValueError::class, 'invalid_number'],
            [[1.0], JsonValueError::class, 'invalid_number'],
            [['a'], JsonTypeError::class, 'invalid_argument_type'],
        ];
        foreach ($units as [$list, $class, $kind]) {
            self::assertSame($kind, self::kind($class, static fn() => Value::fromUnits($list)));
            self::assertSame($kind, self::kind($class, static fn() => $object->getUnits($list)));
        }
        // change-ordered-map: an object takes an OrderedMap, whose keys are values.
        $builds = [
            static fn() => Value::array(['a' => Value::null()]), static fn() => Value::array([1]),
            static fn() => Value::array([null]), static fn() => Value::object(['a' => 1]),
            static fn() => self::insert(Value::string('a'), 1), static fn() => self::insert("\xff"),
            static fn() => parse(1), static fn() => Value::number(1), static fn() => $object->get(1),
        ];
        foreach ($builds as $build) {
            self::assertSame('invalid_argument_type', self::kind(JsonTypeError::class, $build));
        }
        // change-string-constructor: a text that is no UTF-8 is refused by the binding.
        self::assertSame('invalid_text', self::kind(JsonValueError::class, static fn() => Value::string("\xff")));
        $serialize = static fn() => Value::null()->jsonSerialize();
        self::assertSame('host_serialization_refused', self::kind(JsonTypeError::class, $serialize));
        // change-errors: an error is constructed with a message and a kind of its class, and refuses another kind with
        // invalid_argument_type.
        $constructions = [
            static fn() => new JsonValueError('x', 'wrong_kind'),
            static fn() => new JsonTypeError('x', 'not_a_kind'),
            static fn() => new ParseError('x', 'not_a_kind'),
        ];
        foreach ($constructions as $construct) {
            self::assertSame('invalid_argument_type', self::kind(JsonTypeError::class, $construct));
        }
        self::assertSame('expected_digit', (new ParseError('Expected digit', 'expected_digit'))->kind());
        self::assertInstanceOf(InvalidArgumentException::class, new JsonValueError('x', 'invalid_number_literal'));
        self::assertInstanceOf(TypeError::class, new JsonTypeError('x', 'wrong_kind'));
    }
}
