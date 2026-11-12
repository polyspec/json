<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson;

/** A refused argument of the library with its argument kind of the JSON contract, the same in every implementation. */
final class ArgumentError extends \InvalidArgumentException
{
    /** The argument kinds of a refused argument value, and invalid_utf8 for text that is no UTF-8. */
    private const KINDS = [
        'invalid_number_literal', 'depth_limit_out_of_range', 'invalid_argument_type', 'invalid_code_unit',
        'invalid_utf8',
    ];

    public function __construct(public readonly string $kind, string $message)
    {
        if (!in_array($kind, self::KINDS, true)) {
            throw new UsageError('direct_construction', "ArgumentError has no kind \"$kind\"");
        }
        parent::__construct($message);
    }
}
