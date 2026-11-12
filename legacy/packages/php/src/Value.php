<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson;

/**
 * JSON value. Objects use insertion-ordered PHP associative arrays. Child values hydrate lazily.
 *
 * The scan descriptor tape is private to this class: each value has three integers in document order, meta, start
 * and end, where meta = kind | flags | link << LINK. A container links past its subtree; an object key links to the
 * value of its member. Every helper of the library is a private member of this class, so the public symbols of the
 * library are this class, ParseError, parse(), stringify() and MAX_DEPTH, which the extension registers under the same
 * names.
 */
final class Value implements \JsonSerializable, \Stringable
{
    private const OBJECT = 1;
    private const ARRAY = 2;
    private const STRING = 3;
    private const NUMBER = 4;
    private const BOOLEAN = 5;
    private const NULL = 6;
    private const KIND = 7;
    private const KINDS = [self::OBJECT => 'object', self::ARRAY => 'array', self::STRING => 'string',
        self::NUMBER => 'number', self::BOOLEAN => 'boolean', self::NULL => 'null'];
    /** The value serializes to exactly its source token. */
    private const COMPACT = 8;
    /** The string token contains escape sequences. */
    private const ESCAPED = 16;
    /** A repeated object key; the first key of that name links to the final value. */
    private const SKIP = 32;
    private const LINK = 8;
    /** Bytes that end the ordinary run of a string: quote, backslash and control characters. */
    private const STRING_STOP = "\"\\"
        . "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f"
        . "\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f";
    private const WHITESPACE = " \t\n\r";
    private const DIGITS = '0123456789';

    private string $source;
    /** @var list<int> Descriptor tape; this value's record starts at $index. */
    private array $tape;
    private int $index;
    /** Members and key tokens of an object, items of an array, or UTF-16 units of a string once read. */
    private mixed $cache = null;

    private function __construct()
    {
    }

    public static function parse(string $source, int $maxDepth = MAX_DEPTH): Value
    {
        if ($maxDepth < 0 || $maxDepth > MAX_DEPTH) {
            throw new ArgumentError('depth_limit_out_of_range', 'maxDepth must be between 0 and 256');
        }
        return self::root($source, self::scan($source, $maxDepth, false));
    }

    /**
     * Parses like parse() with the default depth limit and rejects a repeated decoded object key
     * at the first byte of the second key token.
     */
    public static function parseRejectDuplicates(string $source): Value
    {
        return self::root($source, self::scan($source, MAX_DEPTH, true));
    }

    /** @param list<int> $tape */
    private static function root(string $source, array $tape): self
    {
        $value = new self();
        $value->source = $source;
        $value->tape = $tape;
        $value->index = 0;
        return $value;
    }

    /** @return array<string|int, Value> Members keyed by decoded name, in first insertion order. */
    private function hydrateMembers(): array
    {
        $members = [];
        $source = $this->source;
        $tape = $this->tape;
        for ($i = $this->index + 3, $end = $tape[$this->index] >> self::LINK; $i < $end;) {
            $meta = $tape[$i];
            $valueMeta = $tape[$i + 3];
            $next = ($valueMeta & self::KIND) <= self::ARRAY ? $valueMeta >> self::LINK : $i + 6;
            if (!($meta & self::SKIP)) {
                $start = $tape[$i + 1] + 1;
                $name = substr($source, $start, $tape[$i + 2] - 1 - $start);
                if ($meta & self::ESCAPED) {
                    $name = self::tokenText($name);
                }
                $member = new self();
                $member->source = $source;
                $member->tape = $tape;
                $member->index = $meta >> self::LINK;
                $members[$name] = $member;
            }
            $i = $next;
        }
        return $members;
    }

    /** @return list<Value> */
    private function hydrateItems(): array
    {
        $items = [];
        $source = $this->source;
        $tape = $this->tape;
        for ($i = $this->index + 3, $end = $tape[$this->index] >> self::LINK; $i < $end;) {
            $item = new self();
            $item->source = $source;
            $item->tape = $tape;
            $item->index = $i;
            $items[] = $item;
            $meta = $tape[$i];
            $i = ($meta & self::KIND) <= self::ARRAY ? $meta >> self::LINK : $i + 3;
        }
        return $items;
    }

    public function kind(): string
    {
        return self::KINDS[$this->tape[$this->index] & self::KIND];
    }
    public function raw(): string
    {
        return $this->index === 0 ? $this->source : $this->token();
    }
    private function token(): string
    {
        $start = $this->tape[$this->index + 1];
        return substr($this->source, $start, $this->tape[$this->index + 2] - $start);
    }
    private function mismatch(string $kind): never
    {
        throw new UsageError('wrong_kind', "Expected $kind, got {$this->kind()}");
    }
    /** @return array<string|int, Value> Key order is the first insertion order. */
    public function members(): array
    {
        if (($this->tape[$this->index] & self::KIND) !== self::OBJECT) {
            $this->mismatch('object');
        }
        return $this->cache ??= $this->hydrateMembers();
    }
    /** @return list<Value> */
    public function items(): array
    {
        if (($this->tape[$this->index] & self::KIND) !== self::ARRAY) {
            $this->mismatch('array');
        }
        return $this->cache ??= $this->hydrateItems();
    }
    /** @return list<int> UTF-16 units, including escaped unpaired surrogates. */
    public function stringUnits(): array
    {
        $tape = $this->tape;
        $index = $this->index;
        if (($tape[$index] & self::KIND) !== self::STRING) {
            $this->mismatch('string');
        }
        $start = $tape[$index + 1] + 1;
        return $this->cache ??= self::tokenUnits(substr($this->source, $start, $tape[$index + 2] - 1 - $start));
    }
    public function stringValue(): string
    {
        $tape = $this->tape;
        $index = $this->index;
        $meta = $tape[$index];
        if (($meta & self::KIND) !== self::STRING) {
            $this->mismatch('string');
        }
        $start = $tape[$index + 1] + 1;
        $content = substr($this->source, $start, $tape[$index + 2] - 1 - $start);
        return $meta & self::ESCAPED ? self::tokenText($content) : $content;
    }
    public function numberLiteral(): string
    {
        $tape = $this->tape;
        $index = $this->index;
        if (($tape[$index] & self::KIND) !== self::NUMBER) {
            $this->mismatch('number');
        }
        $start = $tape[$index + 1];
        return substr($this->source, $start, $tape[$index + 2] - $start);
    }
    public function booleanValue(): bool
    {
        $tape = $this->tape;
        $index = $this->index;
        if (($tape[$index] & self::KIND) !== self::BOOLEAN) {
            $this->mismatch('boolean');
        }
        return $this->source[$tape[$index + 1]] === 't';
    }
    public function get(string $key): ?Value
    {
        if (($this->tape[$this->index] & self::KIND) !== self::OBJECT) {
            $this->mismatch('object');
        }
        return ($this->cache ??= $this->hydrateMembers())[$key] ?? null;
    }
    public function getUnits(array $units): ?Value
    {
        return $this->get(self::unitsToUtf8($units));
    }
    public static function string(string $text): Value
    {
        return self::parse(self::quoteUnits(self::utf8Units($text)));
    }
    public static function fromUnits(array $units): Value
    {
        $raw = '"';
        foreach ($units as $unit) {
            if (!is_int($unit) || $unit < 0 || $unit > 65535) {
                throw new ArgumentError('invalid_code_unit', 'Expected UTF-16 code units');
            }
            $raw .= sprintf('\\u%04x', $unit);
        }
        return self::parse($raw . '"');
    }
    public static function number(string $literal): Value
    {
        $v = self::parse($literal);
        if ($v->kind() !== 'number' || trim($literal) !== $literal) {
            throw new ArgumentError('invalid_number_literal', 'Expected number literal without whitespace');
        }
        return $v;
    }
    public static function boolean(bool $value): Value
    {
        return self::parse($value ? 'true' : 'false');
    }
    public static function null(): Value
    {
        return self::parse('null');
    }
    public static function array(array $items): Value
    {
        if (!array_is_list($items)) {
            throw new ArgumentError('invalid_argument_type', 'Expected a list of values');
        }
        $parts = [];
        foreach ($items as $item) {
            if (!$item instanceof self) {
                throw new ArgumentError('invalid_argument_type', 'Expected ordered_json Value');
            }
            $parts[] = $item->compact();
        }
        return self::parse('[' . implode(',', $parts) . ']');
    }
    /** @param array<string|int, Value> $members */
    public static function object(array $members): Value
    {
        $parts = [];
        foreach ($members as $key => $value) {
            if (!$value instanceof self) {
                throw new ArgumentError('invalid_argument_type', 'Expected ordered_json Value');
            }
            $parts[] = self::quoteUnits(self::utf8Units((string)$key, true)) . ':' . $value->compact();
        }
        return self::parse('{' . implode(',', $parts) . '}');
    }
    public function compact(): string
    {
        $meta = $this->tape[$this->index];
        return $meta & self::COMPACT || ($meta & self::KIND) > self::ARRAY ? $this->token() : $this->render();
    }
    /** Serializes a container. */
    private function render(): string
    {
        $tape = $this->tape;
        $index = $this->index;
        if (($tape[$index] & self::KIND) === self::OBJECT) {
            $source = $this->source;
            // Members and the tape records share one order, so key tokens pair with hydrated values.
            $values = array_values($this->cache ??= $this->hydrateMembers());
            $parts = [];
            $n = 0;
            for ($i = $index + 3, $end = $tape[$index] >> self::LINK; $i < $end;) {
                $valueMeta = $tape[$i + 3];
                if (!($tape[$i] & self::SKIP)) {
                    $parts[] = substr($source, $tape[$i + 1], $tape[$i + 2] - $tape[$i + 1])
                        . ':' . $values[$n++]->compact();
                }
                $i = ($valueMeta & self::KIND) <= self::ARRAY ? $valueMeta >> self::LINK : $i + 6;
            }
            return '{' . implode(',', $parts) . '}';
        }
        $items = $this->cache ??= $this->hydrateItems();
        return '[' . implode(',', array_map(fn(self $v) => $v->compact(), $items)) . ']';
    }
    public function __toString(): string
    {
        return $this->compact();
    }
    public function jsonSerialize(): never
    {
        throw new UsageError('host_serialization_refused', 'Use Polyspec\\OrderedJson\\stringify($value)');
    }

    /**
     * Scans the source into the descriptor tape.
     *
     * @return list<int>
     */
    private static function scan(string $source, int $maxDepth, bool $rejectDuplicates): array
    {
        $length = strlen($source);
        /** @var list<int> $tape */
        $tape = [];
        $whitespace = 0;
        $duplicates = 0;
        // PCRE validates UTF-8 before matching, so only a UTF-8 error means invalid input;
        // other errors come from the backtrack or recursion limits in php.ini.
        if (preg_match('//u', $source) !== 1 && preg_last_error() === PREG_BAD_UTF8_ERROR) {
            throw new ParseError('Invalid UTF-8', self::invalidUtf8Offset($source) ?? 0);
        }
        /**
         * Validates the string token at $pos. Returns the offset after it shifted left by one,
         * with the low bit set when the token contains escapes.
         */
        $string = static function (int $pos) use ($source, $length): int {
            if (($source[$pos] ?? '') !== '"') {
                throw new ParseError('Expected string', $pos);
            }
            $pos++;
            $escaped = 0;
            while (true) {
                $pos += strcspn($source, self::STRING_STOP, $pos);
                if ($pos >= $length) {
                    throw new ParseError('Unterminated string', $pos);
                }
                $ch = $source[$pos++];
                if ($ch === '"') {
                    return $pos << 1 | $escaped;
                }
                if ($ch !== '\\') {
                    throw new ParseError('Unescaped control character', $pos - 1);
                }
                $escaped = 1;
                $escape = $source[$pos] ?? '';
                if ($escape === '') {
                    throw new ParseError('Unfinished escape', $pos);
                }
                $pos++;
                if ($escape === 'u') {
                    if (($digits = strspn($source, '0123456789abcdefABCDEF', $pos, 4)) !== 4) {
                        throw new ParseError('Invalid Unicode escape', $pos + $digits);
                    }
                    $pos += 4;
                } elseif (!str_contains('"\\/bfnrt', $escape)) {
                    throw new ParseError('Invalid escape', $pos - 1);
                }
            }
        };
        /** Parses the value at or after $pos and returns the offset after it. */
        $value = null;
        /** Parses the container that opens at $start and returns the offset after it. */
        $container = static function (
            int $depth,
            int $start,
            bool $object
        ) use (
            &$value,
            &$tape,
            &$whitespace,
            &$duplicates,
            $source,
            $rejectDuplicates,
            $string
        ): int {
            $close = $object ? '}' : ']';
            $whitespaceBefore = $whitespace;
            $duplicatesBefore = $duplicates;
            $index = count($tape);
            $tape[] = 0;
            $tape[] = $start;
            $tape[] = 0;
            $names = [];
            $pos = $start + 1;
            if (($skipped = strspn($source, self::WHITESPACE, $pos)) !== 0) {
                $pos += $skipped;
                $whitespace += $skipped;
            }
            if (($source[$pos] ?? '') !== $close) {
                while (true) {
                    if ($object) {
                        $key = count($tape);
                        $keyStart = $pos;
                        $result = $string($pos);
                        $pos = $result >> 1;
                        $tape[] = self::STRING | self::COMPACT | ($result & 1 ? self::ESCAPED : 0)
                            | ($key + 3) << self::LINK;
                        $tape[] = $keyStart;
                        $tape[] = $pos;
                        $name = substr($source, $keyStart + 1, $pos - $keyStart - 2);
                        if ($result & 1) {
                            $name = self::tokenText($name);
                        }
                        if ($rejectDuplicates && isset($names[$name])) {
                            throw new ParseError('Duplicate object key', $keyStart);
                        }
                        if (($skipped = strspn($source, self::WHITESPACE, $pos)) !== 0) {
                            $pos += $skipped;
                            $whitespace += $skipped;
                        }
                        if (($source[$pos] ?? '') !== ':') {
                            throw new ParseError('Expected colon', $pos);
                        }
                        $pos = $value($depth + 1, $pos + 1);
                        if (isset($names[$name])) {
                            $first = $names[$name];
                            $tape[$first] = $tape[$first] & 0xff | ($key + 3) << self::LINK;
                            $tape[$key] |= self::SKIP;
                            $duplicates++;
                        } else {
                            $names[$name] = $key;
                        }
                    } else {
                        $pos = $value($depth + 1, $pos);
                    }
                    if (($skipped = strspn($source, self::WHITESPACE, $pos)) !== 0) {
                        $pos += $skipped;
                        $whitespace += $skipped;
                    }
                    $next = $source[$pos] ?? '';
                    if ($next === $close) {
                        break;
                    }
                    if ($next !== ',') {
                        throw new ParseError('Expected comma or closing delimiter', $pos);
                    }
                    $pos++;
                    if (($skipped = strspn($source, self::WHITESPACE, $pos)) !== 0) {
                        $pos += $skipped;
                        $whitespace += $skipped;
                    }
                }
            }
            $pos++;
            $compact = $whitespace === $whitespaceBefore && $duplicates === $duplicatesBefore ? self::COMPACT : 0;
            $tape[$index] = ($object ? self::OBJECT : self::ARRAY) | $compact | count($tape) << self::LINK;
            $tape[$index + 2] = $pos;
            return $pos;
        };
        $value = static function (
            int $depth,
            int $pos
        ) use (
            &$container,
            &$tape,
            &$whitespace,
            $source,
            $maxDepth,
            $string
        ): int {
            if (($skipped = strspn($source, self::WHITESPACE, $pos)) !== 0) {
                $pos += $skipped;
                $whitespace += $skipped;
            }
            $start = $pos;
            $ch = $source[$pos] ?? '';
            if ($ch === '{' || $ch === '[') {
                if ($depth >= $maxDepth) {
                    throw new ParseError('Maximum nesting depth exceeded', $pos);
                }
                return $container($depth, $pos, $ch === '{');
            }
            if ($ch === '"') {
                $result = $string($pos);
                $pos = $result >> 1;
                $kind = self::STRING | self::COMPACT | ($result & 1 ? self::ESCAPED : 0);
            } elseif ($ch === '-' || ($ch !== '' && $ch >= '0' && $ch <= '9')) {
                if ($ch === '-') {
                    $pos++;
                }
                if (($source[$pos] ?? '') === '0') {
                    $pos++;
                } else {
                    if (($count = strspn($source, self::DIGITS, $pos)) === 0) {
                        throw new ParseError('Expected digit', $pos);
                    }
                    $pos += $count;
                }
                if (($source[$pos] ?? '') === '.') {
                    if (($count = strspn($source, self::DIGITS, ++$pos)) === 0) {
                        throw new ParseError('Expected digit', $pos);
                    }
                    $pos += $count;
                }
                $ch = $source[$pos] ?? '';
                if ($ch === 'e' || $ch === 'E') {
                    $ch = $source[++$pos] ?? '';
                    if ($ch === '+' || $ch === '-') {
                        $pos++;
                    }
                    if (($count = strspn($source, self::DIGITS, $pos)) === 0) {
                        throw new ParseError('Expected digit', $pos);
                    }
                    $pos += $count;
                }
                $kind = self::NUMBER | self::COMPACT;
            } elseif ($ch === 't' && substr_compare($source, 'true', $pos, 4) === 0) {
                $pos += 4;
                $kind = self::BOOLEAN | self::COMPACT;
            } elseif ($ch === 'f' && substr_compare($source, 'false', $pos, 5) === 0) {
                $pos += 5;
                $kind = self::BOOLEAN | self::COMPACT;
            } elseif ($ch === 'n' && substr_compare($source, 'null', $pos, 4) === 0) {
                $pos += 4;
                $kind = self::NULL | self::COMPACT;
            } else {
                throw new ParseError('Expected JSON value', $pos);
            }
            $tape[] = $kind;
            $tape[] = $start;
            $tape[] = $pos;
            return $pos;
        };
        try {
            $pos = $value(0, 0);
            $pos += strspn($source, self::WHITESPACE, $pos);
            if ($pos !== $length) {
                throw new ParseError('Unexpected trailing input', $pos);
            }
            return $tape;
        } finally {
            // The closures capture each other by reference, so they form cycles that only the cycle collector frees.
            // Dropping the variables here leaves no cycle, on success and on a parse error alike.
            $value = null;
            $container = null;
        }
    }

    /** The UTF-8 bytes of a code point; a lone surrogate gives its three WTF-8 bytes. */
    private static function codePointToUtf8(int $point): string
    {
        if ($point < 0x80) {
            return chr($point);
        }
        if ($point < 0x800) {
            return chr(0xc0 | ($point >> 6)) . chr(0x80 | ($point & 63));
        }
        if ($point < 0x10000) {
            return chr(0xe0 | ($point >> 12)) . chr(0x80 | (($point >> 6) & 63)) . chr(0x80 | ($point & 63));
        }
        return chr(0xf0 | ($point >> 18)) . chr(0x80 | (($point >> 12) & 63))
            . chr(0x80 | (($point >> 6) & 63)) . chr(0x80 | ($point & 63));
    }

    /** Converts UTF-16 units to UTF-8; an unpaired surrogate becomes WTF-8, the identity of object keys. */
    private static function unitsToUtf8(array $units): string
    {
        $out = '';
        for ($i = 0, $n = count($units); $i < $n; $i++) {
            $point = $units[$i];
            if (!is_int($point) || $point < 0 || $point > 65535) {
                throw new ArgumentError('invalid_code_unit', 'Expected UTF-16 code units');
            }
            if (
                $point >= 0xd800 && $point <= 0xdbff && $i + 1 < $n
                && is_int($units[$i + 1]) && $units[$i + 1] >= 0xdc00 && $units[$i + 1] <= 0xdfff
            ) {
                $point = 0x10000 + (($point - 0xd800) << 10) + $units[++$i] - 0xdc00;
            }
            $out .= self::codePointToUtf8($point);
        }
        return $out;
    }

    /** Decodes UTF-8 or, with $allowWtf8, WTF-8 into UTF-16 units. */
    private static function utf8Units(string $text, bool $allowWtf8 = false): array
    {
        $units = [];
        for ($i = 0, $n = strlen($text); $i < $n;) {
            $first = ord($text[$i++]);
            if ($first < 0x80) {
                $point = $first;
            } elseif ($first >= 0xc2 && $first <= 0xdf) {
                if ($i >= $n) {
                    throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
                }
                $next = ord($text[$i++]);
                if (($next & 0xc0) !== 0x80) {
                    throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
                }
                $point = (($first & 0x1f) << 6) | ($next & 63);
            } elseif ($first >= 0xe0 && $first <= 0xef) {
                if ($i + 1 >= $n) {
                    throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
                }
                $b1 = ord($text[$i++]);
                $b2 = ord($text[$i++]);
                if (($b1 & 0xc0) !== 0x80 || ($b2 & 0xc0) !== 0x80) {
                    throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
                }
                $point = (($first & 15) << 12) | (($b1 & 63) << 6) | ($b2 & 63);
                if ($point < 0x800 || ($point >= 0xd800 && $point <= 0xdfff && !$allowWtf8)) {
                    throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
                }
            } elseif ($first >= 0xf0 && $first <= 0xf4) {
                if ($i + 2 >= $n) {
                    throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
                }
                $b1 = ord($text[$i++]);
                $b2 = ord($text[$i++]);
                $b3 = ord($text[$i++]);
                if (($b1 & 0xc0) !== 0x80 || ($b2 & 0xc0) !== 0x80 || ($b3 & 0xc0) !== 0x80) {
                    throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
                }
                $point = (($first & 7) << 18) | (($b1 & 63) << 12) | (($b2 & 63) << 6) | ($b3 & 63);
                if ($point < 0x10000 || $point > 0x10ffff) {
                    throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
                }
            } else {
                throw new ArgumentError('invalid_utf8', 'Invalid UTF-8');
            }
            if ($point <= 0xffff) {
                $units[] = $point;
            } else {
                $point -= 0x10000;
                $units[] = 0xd800 | ($point >> 10);
                $units[] = 0xdc00 | ($point & 1023);
            }
        }
        return $units;
    }

    /** The first invalid UTF-8 byte offset, or null for valid text. */
    private static function invalidUtf8Offset(string $text): ?int
    {
        $length = strlen($text);
        for ($i = 0; $i < $length;) {
            $start = $i;
            $first = ord($text[$i++]);
            if ($first < 0x80) {
                continue;
            }
            $need = $first >= 0xc2 && $first <= 0xdf ? 1
                : ($first >= 0xe0 && $first <= 0xef ? 2
                : ($first >= 0xf0 && $first <= 0xf4 ? 3 : -1));
            if ($need < 0 || $i + $need > $length) {
                return $start;
            }
            $point = $first & ((1 << (6 - $need)) - 1);
            for ($j = 0; $j < $need; $j++) {
                $next = ord($text[$i++]);
                if (($next & 0xc0) !== 0x80) {
                    return $start;
                }
                $point = ($point << 6) | ($next & 0x3f);
            }
            if (
                ($need === 1 && $point < 0x80) || ($need === 2 && $point < 0x800)
                || ($need === 3 && $point < 0x10000) || $point > 0x10ffff
                || ($point >= 0xd800 && $point <= 0xdfff)
            ) {
                return $start;
            }
        }
        return null;
    }

    /** Decodes the contents of a validated string token into UTF-16 units. */
    private static function tokenUnits(string $content): array
    {
        $units = [];
        $offset = 0;
        while (($slash = strpos($content, '\\', $offset)) !== false) {
            if ($slash > $offset) {
                foreach (self::textUnits(substr($content, $offset, $slash - $offset)) as $unit) {
                    $units[] = $unit;
                }
            }
            $escape = $content[$slash + 1];
            if ($escape === 'u') {
                $units[] = (int)hexdec(substr($content, $slash + 2, 4));
                $offset = $slash + 6;
            } else {
                $units[] = match ($escape) {
                    'b' => 8, 'f' => 12, 'n' => 10, 'r' => 13, 't' => 9, default => ord($escape)
                };
                $offset = $slash + 2;
            }
        }
        if ($offset < strlen($content)) {
            foreach (self::textUnits(substr($content, $offset)) as $unit) {
                $units[] = $unit;
            }
        }
        return $units;
    }

    /** The UTF-16 units of valid UTF-8 text. */
    private static function textUnits(string $text): array
    {
        static $ascii = null;
        $ascii ??= implode('', array_map('chr', range(0, 127)));
        return strspn($text, $ascii) === strlen($text) ? array_values(unpack('C*', $text)) : self::utf8Units($text);
    }

    /** The UTF-8 text of validated string token contents. A lone surrogate becomes WTF-8. */
    private static function tokenText(string $content): string
    {
        $slash = strpos($content, '\\');
        if ($slash === false) {
            return $content;
        }
        $out = '';
        $offset = 0;
        do {
            $out .= substr($content, $offset, $slash - $offset);
            $escape = $content[$slash + 1];
            if ($escape !== 'u') {
                $out .= match ($escape) {
                    'b' => "\x08", 'f' => "\f", 'n' => "\n", 'r' => "\r", 't' => "\t", default => $escape
                };
                $offset = $slash + 2;
            } else {
                $point = hexdec(substr($content, $slash + 2, 4));
                $offset = $slash + 6;
                if ($point >= 0xd800 && $point <= 0xdbff && substr($content, $offset, 2) === '\\u') {
                    $low = hexdec(substr($content, $offset + 2, 4));
                    if ($low >= 0xdc00 && $low <= 0xdfff) {
                        $point = 0x10000 + (($point - 0xd800) << 10) + $low - 0xdc00;
                        $offset += 6;
                    }
                }
                $out .= self::codePointToUtf8($point);
            }
            $slash = strpos($content, '\\', $offset);
        } while ($slash !== false);
        return $out . substr($content, $offset);
    }

    /** Encodes UTF-16 units with the shared constructor spelling. */
    private static function quoteUnits(array $units): string
    {
        $out = '"';
        foreach ($units as $unit) {
            if (!is_int($unit) || $unit < 0 || $unit > 65535) {
                throw new ArgumentError('invalid_code_unit', 'Expected UTF-16 code units');
            }
            $out .= match ($unit) {
                34 => '\"', 92 => '\\\\', 8 => '\b', 12 => '\f', 10 => '\n',
                13 => '\r', 9 => '\t',
                default => ($unit >= 0x20 && $unit <= 0x7e) ? chr($unit) : sprintf('\u%04x', $unit),
            };
        }
        return $out . '"';
    }
}
