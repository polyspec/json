<?php

/** @generate-class-entries */

namespace Polyspec\OrderedJson;

/** @var int */
const MAX_DEPTH = 256;

enum Kind: string
{
    case Object = 'object';
    case Array = 'array';
    case String = 'string';
    case Number = 'number';
    case Boolean = 'boolean';
    case Null = 'null';
}

final class ParseError extends \InvalidArgumentException
{
    public readonly string $kind;
    public readonly int $offset;

    public function __construct(string $message, int $offset) {}
}

final class ArgumentError extends \InvalidArgumentException
{
    public readonly string $kind;

    public function __construct(string $kind, string $message) {}
}

final class UsageError extends \LogicException
{
    public readonly string $kind;

    public function __construct(string $kind, string $message) {}
}

final class Value implements \JsonSerializable, \Stringable
{
    private function __construct() {}

    public static function parse(string $source, int $maxDepth = \Polyspec\OrderedJson\MAX_DEPTH): Value {}

    public static function parseRejectDuplicates(string $source): Value {}

    public function kind(): string {}

    public function raw(): string {}

    public function members(): array {}

    public function items(): array {}

    public function stringUnits(): array {}

    public function stringValue(): string {}

    public function numberLiteral(): string {}

    public function booleanValue(): bool {}

    public function get(string $key): ?Value {}

    public function getUnits(array $units): ?Value {}

    public static function string(string $text): Value {}

    public static function fromUnits(array $units): Value {}

    public static function number(string $literal): Value {}

    public static function boolean(bool $value): Value {}

    public static function null(): Value {}

    public static function array(array $items): Value {}

    public static function object(array $members): Value {}

    public function compact(): string {}

    public function __toString(): string {}

    public function jsonSerialize(): never {}
}

function parse(string $source, int $maxDepth = \Polyspec\OrderedJson\MAX_DEPTH): Value {}

function stringify(Value $value): string {}
