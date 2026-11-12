<?php

declare(strict_types=1);

namespace Polyspec\OrderedJson;

final class ParseError extends \InvalidArgumentException
{
    /** Why the document was rejected, named the same way by every implementation. */
    private const KINDS = [
        'Expected JSON value' => 'expected_value',
        'Expected digit' => 'expected_digit',
        'Expected colon' => 'expected_colon',
        'Expected comma or closing delimiter' => 'expected_delimiter',
        'Expected string' => 'expected_object_key',
        'Invalid escape' => 'invalid_escape',
        'Invalid Unicode escape' => 'invalid_unicode_escape',
        'Unfinished escape' => 'unfinished_escape',
        'Unterminated string' => 'unterminated_string',
        'Unescaped control character' => 'unescaped_control_character',
        'Invalid UTF-8' => 'invalid_utf8',
        'Maximum nesting depth exceeded' => 'maximum_depth_exceeded',
        'Unexpected trailing input' => 'trailing_input',
        'Duplicate object key' => 'duplicate_object_key',
    ];
    public readonly string $kind;
    public function __construct(string $message, public readonly int $offset)
    {
        if (!isset(self::KINDS[$message])) {
            throw new UsageError('direct_construction', "ParseError has no kind for the message \"$message\"");
        }
        $this->kind = self::KINDS[$message];
        parent::__construct("$message at byte $offset");
    }
}
