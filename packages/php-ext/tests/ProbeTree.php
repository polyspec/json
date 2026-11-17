<?php

declare(strict_types=1);

namespace Polyspec\Json\Tests;

use Polyspec\Json\Kind;
use Polyspec\Json\OrderedMap;
use Polyspec\Json\Value;

use function Polyspec\Json\stringify;

/**
 * The serializations of the probe of the shared verifier (probe.php): the JSON text of a string, the value tree of a
 * parsed value and the value rebuilt through the factories. The probe holds no test cases or expectations; the shared
 * verifier supplies the documents. The helper of the legacy probe with no change beyond the changes of
 * packages/rust/interface.json, each named where it applies (T3.25-3).
 */
final class ProbeTree
{
    public static function quote(string $s): string
    {
        return json_encode($s, JSON_THROW_ON_ERROR);
    }

    /** The JSON text of the string value $v, its code units kept (change-stringify: stringify is the one serialization). */
    public static function text(Value $v): string
    {
        return stringify(Value::fromUnits($v->stringUnits()));
    }

    /** change-kind-enum: the kind is the enum Kind. */
    public static function tree(Value $v): string
    {
        return match ($v->kind()) {
            Kind::Object_ => self::objectTree($v),
            Kind::Array_ => '["array",[' . implode(',', array_map(self::tree(...), $v->items())) . ']]',
            Kind::String_ => '["string",' . self::text($v) . ']',
            Kind::Number => '["number",' . self::quote($v->numberLiteral()) . ']',
            Kind::Boolean => '["boolean",' . ($v->booleanValue() ? 'true' : 'false') . ']',
            default => '["null"]',
        };
    }

    /**
     * Inserts the keys in their first order, then sets the values in reverse order (change-ordered-map: an object takes
     * an OrderedMap whose keys are values, and an insert of a present key keeps its position).
     */
    public static function rebuild(Value $v): Value
    {
        if ($v->kind() === Kind::Object_) {
            $keys = [];
            foreach ($v->members() as $key => $_) {
                $keys[] = $key;
            }
            $members = new OrderedMap();
            foreach ($keys as $key) {
                $members->insert($key, Value::null());
            }
            foreach (array_reverse($keys) as $key) {
                $members->insert($key, self::rebuild($v->getUnits($key->stringUnits())));
            }
            return Value::object($members);
        }
        return match ($v->kind()) {
            Kind::Array_ => Value::array(array_map(self::rebuild(...), $v->items())),
            default => $v,
        };
    }

    /** change-accessors: the members of an object are an OrderedMap whose keys are values. */
    private static function objectTree(Value $v): string
    {
        $parts = [];
        foreach ($v->members() as $key => $value) {
            $parts[] = '[' . self::text($key) . ',' . self::tree($value) . ']';
        }
        return '["object",[' . implode(',', $parts) . ']]';
    }
}
