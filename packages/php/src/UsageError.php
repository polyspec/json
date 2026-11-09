<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson;

/** A use that the library refuses, with its argument kind of the JSON contract, alike in every implementation. */
final class UsageError extends \LogicException
{
    /** The argument kinds of a refused use: an access of another kind, the host serializer and a direct construction. */
    private const KINDS = ['wrong_kind', 'host_serialization_refused', 'direct_construction'];

    public function __construct(public readonly string $kind, string $message)
    {
        if (!in_array($kind, self::KINDS, true)) {
            throw new self('direct_construction', "UsageError has no kind \"$kind\"");
        }
        parent::__construct($message);
    }
}
