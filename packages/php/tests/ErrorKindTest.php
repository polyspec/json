<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson\Tests;

use InvalidArgumentException;
use LogicException;
use PHPUnit\Framework\TestCase;
use Polyspec\OrderedJson\ArgumentError;
use Polyspec\OrderedJson\ParseError;
use Polyspec\OrderedJson\UsageError;
use Polyspec\OrderedJson\Value;
use Throwable;

/**
 * The kinds of the errors of the library, run by PHPUnit with the pure PHP library (`make test-php`) and with the
 * extension (`make test-php-ext`). Every error that the library throws names its kind on `kind`: a ParseError the
 * rejection kinds of the JSON contract, an ArgumentError (an InvalidArgumentException) or a UsageError (a
 * LogicException) the argument kinds. Each kind has an accepting and a refusing site.
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

    /** @return array<string, string> The kinds of the list of the section of $anchor in the JSON contract. */
    private static function listed(string $anchor): array
    {
        $spec = file_get_contents(__DIR__ . '/../../../docs/spec/json-contract.md');
        $section = explode("\n<a id=", explode($anchor, $spec)[1])[0];
        preg_match_all('/^- `([a-z0-9_]+)`(.*)$/m', $section, $matches);
        return array_combine($matches[1], $matches[2]);
    }

    /** @return list<array{string, class-string, callable, callable}> Each kind with its class and its two sites. */
    private static function cases(): array
    {
        return [
            ['expected_value', ParseError::class, static fn() => Value::parse('[1]'),
                static fn() => Value::parse('[1,]')],
            ['expected_digit', ParseError::class, static fn() => Value::parse('1.5'),
                static fn() => Value::parse('1.')],
            ['expected_colon', ParseError::class, static fn() => Value::parse('{"a":1}'),
                static fn() => Value::parse('{"a" 1}')],
            ['expected_delimiter', ParseError::class, static fn() => Value::parse('[1,2]'),
                static fn() => Value::parse('[1 2]')],
            ['expected_object_key', ParseError::class, static fn() => Value::parse('{"a":1}'),
                static fn() => Value::parse('{1:2}')],
            ['invalid_escape', ParseError::class, static fn() => Value::parse('"\n"'),
                static fn() => Value::parse('"\x"')],
            ['invalid_unicode_escape', ParseError::class, static fn() => Value::parse('"A"'),
                static fn() => Value::parse('"\u00g1"')],
            ['unfinished_escape', ParseError::class, static fn() => Value::parse('"\\\\"'),
                static fn() => Value::parse('"\\')],
            ['unterminated_string', ParseError::class, static fn() => Value::parse('"a"'),
                static fn() => Value::parse('"a')],
            ['unescaped_control_character', ParseError::class, static fn() => Value::parse('"a\tb"'),
                static fn() => Value::parse("\"a\tb\"")],
            ['invalid_utf8', ParseError::class, static fn() => Value::parse('"한"'),
                static fn() => Value::parse("\"\xff\"")],
            ['maximum_depth_exceeded', ParseError::class, static fn() => Value::parse('[[]]', 2),
                static fn() => Value::parse('[[]]', 1)],
            ['trailing_input', ParseError::class, static fn() => Value::parse('[1] '),
                static fn() => Value::parse('[1] x')],
            ['duplicate_object_key', ParseError::class, static fn() => Value::parseRejectDuplicates('{"a":1,"b":2}'),
                static fn() => Value::parseRejectDuplicates('{"a":1,"a":2}')],
            ['wrong_kind', UsageError::class, static fn() => Value::parse('"x"')->stringValue(),
                static fn() => Value::parse('1')->stringValue()],
            ['invalid_number_literal', ArgumentError::class, static fn() => Value::number('-0.5e3'),
                static fn() => Value::number(' 1')],
            ['depth_limit_out_of_range', ArgumentError::class, static fn() => Value::parse('1', 256),
                static fn() => Value::parse('1', 257)],
            ['invalid_argument_type', ArgumentError::class, static fn() => Value::array([Value::null()]),
                static fn() => Value::array([1])],
            ['invalid_code_unit', ArgumentError::class, static fn() => Value::fromUnits([0xffff]),
                static fn() => Value::fromUnits([0x10000])],
            ['host_serialization_refused', UsageError::class, static fn() => Value::null()->compact(),
                static fn() => json_encode(Value::null(), JSON_THROW_ON_ERROR)],
            ['direct_construction', UsageError::class, static fn() => new ParseError('Expected JSON value', 0),
                static fn() => new ParseError('Not a message', 0)],
        ];
    }

    public function testEveryKindHasAnAcceptingAndARefusingSite(): void
    {
        foreach (self::cases() as [$kind, $class, $accept, $refuse]) {
            $accept();
            self::assertSame($kind, self::thrown($class, $refuse)->kind, $kind);
        }
    }

    public function testTheKindsAreTheSharedLists(): void
    {
        // A kind of a list that has no case here is one that the list states cannot arise in PHP; the parsing section
        // states that only JavaScript and Python text holds an unescaped lone surrogate.
        $lists = self::listed('<a id="rejection-kinds"></a>') + self::listed('<a id="argument-kinds"></a>');
        $named = array_column(self::cases(), 0);
        foreach ($lists as $name => $text) {
            if (!in_array($name, $named, true) && $name !== 'unescaped_lone_surrogate') {
                self::assertMatchesRegularExpression('/cannot arise in[^.]*PHP/', $text, $name);
            }
        }
        self::assertSame(['duplicate_object_key'], array_values(array_diff($named, array_keys($lists))));
    }

    public function testEveryRefusedArgumentCarriesItsKind(): void
    {
        $kind = static fn(string $class, callable $body): string => self::thrown($class, $body)->kind;
        foreach (['[]', '"1"', 'true', 'null', '1 ', "\n1"] as $literal) {
            $build = static fn() => Value::number($literal);
            self::assertSame('invalid_number_literal', $kind(ArgumentError::class, $build));
        }
        self::assertSame('expected_value', $kind(ParseError::class, static fn() => Value::number('x')));
        $object = Value::parse('{}');
        $array = Value::parse('[]');
        $reads = [
            static fn() => $object->items(), static fn() => $array->members(), static fn() => $object->stringValue(),
            static fn() => $object->stringUnits(), static fn() => $object->numberLiteral(),
            static fn() => $object->booleanValue(), static fn() => $array->get('a'),
            static fn() => $array->getUnits([97]),
        ];
        foreach ($reads as $read) {
            self::assertSame('wrong_kind', $kind(UsageError::class, $read));
        }
        foreach ([-1, 257, PHP_INT_MAX] as $limit) {
            $parse = static fn() => Value::parse('1', $limit);
            self::assertSame('depth_limit_out_of_range', $kind(ArgumentError::class, $parse));
        }
        foreach ([[-1], [0x10000], ['a'], [1.0]] as $units) {
            $build = static fn() => Value::fromUnits($units);
            $read = static fn() => $object->getUnits($units);
            self::assertSame('invalid_code_unit', $kind(ArgumentError::class, $build));
            self::assertSame('invalid_code_unit', $kind(ArgumentError::class, $read));
        }
        $builds = [
            static fn() => Value::array(['a' => Value::null()]), static fn() => Value::array([1]),
            static fn() => Value::array([null]), static fn() => Value::object(['a' => 1]),
        ];
        foreach ($builds as $build) {
            self::assertSame('invalid_argument_type', $kind(ArgumentError::class, $build));
        }
        $builds = [static fn() => Value::string("\xff"), static fn() => Value::object(["\xff" => Value::null()])];
        foreach ($builds as $build) {
            self::assertSame('invalid_utf8', $kind(ArgumentError::class, $build));
        }
        $serialize = static fn() => Value::null()->jsonSerialize();
        self::assertSame('host_serialization_refused', $kind(UsageError::class, $serialize));
        $constructions = [
            static fn() => new ArgumentError('not_a_kind', 'x'),
            static fn() => new UsageError('not_a_kind', 'x'),
            static fn() => new ParseError("Expected digit\0", 0),
        ];
        foreach ($constructions as $construct) {
            self::assertSame('direct_construction', $kind(UsageError::class, $construct));
        }
        self::assertSame('expected_digit', (new ParseError('Expected digit', 4))->kind);
        self::assertInstanceOf(InvalidArgumentException::class, new ArgumentError('invalid_argument_type', 'x'));
        self::assertInstanceOf(LogicException::class, new UsageError('wrong_kind', 'x'));
    }
}
