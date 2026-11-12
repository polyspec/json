<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson\Tests;

use Polyspec\OrderedJson\Value;

/**
 * The serializations of the probe of the common verifier (probe.php): the JSON text of a string, the value tree of a
 * parsed value and the value rebuilt through the factories. The probe holds no test cases or expectations; the common
 * verifier supplies the documents.
 */
final class ProbeTree
{
    public static function quote(string $s): string
    {
        return json_encode($s, JSON_THROW_ON_ERROR);
    }

    /**
     * The UTF-16 units of the UTF-8 or WTF-8 text of a member name that the library returned (an unpaired surrogate is
     * its three WTF-8 bytes).
     *
     * @return list<int>
     */
    public static function units(string $text): array
    {
        $units = [];
        for ($i = 0, $n = strlen($text); $i < $n;) {
            $first = ord($text[$i]);
            $length = $first < 0x80 ? 1 : ($first < 0xe0 ? 2 : ($first < 0xf0 ? 3 : 4));
            $point = $length === 1 ? $first : $first & (0x7f >> $length);
            for ($j = 1; $j < $length; $j++) {
                $point = $point << 6 | ord($text[$i + $j]) & 0x3f;
            }
            $i += $length;
            if ($point > 0xffff) {
                $point -= 0x10000;
                $units[] = 0xd800 | $point >> 10;
                $point = 0xdc00 | $point & 0x3ff;
            }
            $units[] = $point;
        }
        return $units;
    }

    public static function text(Value $v): string
    {
        return Value::fromUnits($v->stringUnits())->raw();
    }

    public static function tree(Value $v): string
    {
        return match ($v->kind()) {
            'object' => self::objectTree($v),
            'array' => '["array",[' . implode(',', array_map(self::tree(...), $v->items())) . ']]',
            'string' => '["string",' . self::text($v) . ']',
            'number' => '["number",' . self::quote($v->numberLiteral()) . ']',
            'boolean' => '["boolean",' . ($v->booleanValue() ? 'true' : 'false') . ']',
            default => '["null"]',
        };
    }

    public static function rebuild(Value $v): Value
    {
        if ($v->kind() === 'object') {
            $members = [];
            foreach ($v->members() as $key => $_) {
                $members[$key] = Value::null();
            }
            foreach (array_reverse(array_keys($members)) as $key) {
                $members[$key] = self::rebuild($v->get((string)$key));
            }
            return Value::object($members);
        }
        return match ($v->kind()) {
            'array' => Value::array(array_map(self::rebuild(...), $v->items())),
            default => $v,
        };
    }

    private static function objectTree(Value $v): string
    {
        $parts = [];
        foreach ($v->members() as $key => $value) {
            $parts[] = '[' . Value::fromUnits(self::units((string)$key))->raw() . ',' . self::tree($value) . ']';
        }
        return '["object",[' . implode(',', $parts) . ']]';
    }
}
