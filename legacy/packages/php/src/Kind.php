<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson;

/** The names of the kinds of a value, which Value::kind() returns as strings. */
enum Kind: string
{
    case Object = 'object';
    case Array = 'array';
    case String = 'string';
    case Number = 'number';
    case Boolean = 'boolean';
    case Null = 'null';
}
