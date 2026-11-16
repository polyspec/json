"""The package tests of the Python binding polyspec.json, run by unittest.

Every case of the shared standard runs here, and the package cases cover the API of this binding alone. The binding is
installed into the venv of make binding-python-package, whose interpreter make test-python runs. The tests of the legacy
package with no change beyond the changes of packages/rust/interface.json, each named where it applies (T3.25-2).
"""

import json
import unittest

from polyspec import json as binding
from polyspec.json import MAX_DEPTH, OrderedMap, ParseError, Value, parse, stringify


def obj(*entries):
    """An object of the entries (change-ordered-map: an object takes an OrderedMap whose keys are values)."""
    members = OrderedMap()
    for key, value in entries:
        members.insert(key, value)
    return Value.object(members)


def names(value):
    """The names of the members of an object (change-accessors: the keys are values)."""
    return [key.string_value() for key in value.members()]


class StandardCases(unittest.TestCase):
    # Requirements: RQ-006
    # change-parse-options: the options of parse are its keyword arguments.
    def test_depth_argument_is_bounded(self):
        for limit in (-1, MAX_DEPTH + 1, 257):
            with self.subTest(limit=limit):
                with self.assertRaises(ValueError):
                    parse("1", max_depth=limit)
        parse("1", max_depth=0)
        parse("[]", max_depth=1)
        with self.assertRaises(ParseError):
            parse("[]", max_depth=0)

    # Requirements: RQ-006
    def test_depth_limit_is_enforced(self):
        document = "[" * (MAX_DEPTH + 1) + "]" * (MAX_DEPTH + 1)
        with self.assertRaises(ParseError) as caught:
            parse(document)
        self.assertEqual(caught.exception.kind, "maximum_depth_exceeded")
        self.assertEqual(caught.exception.offset, MAX_DEPTH)

    # Requirements: RQ-004
    def test_parse_errors_report_offsets(self):
        # U+D55C (a Korean syllable) is three UTF-8 bytes, so the offset of the control character is a byte position.
        # change-parse-source: parse takes the bytes; change-offsets: every offset counts bytes, so a rejection names no unit.
        with self.assertRaises(ParseError) as caught:
            parse(b'["\xed\x95\x9c\x01"]')
        self.assertEqual(caught.exception.offset, 5)

    # Requirements: RQ-005
    def test_rejection_names_its_kind(self):
        for document, kind in (
            ("{", "expected_object_key"),
            ("[1 2]", "expected_delimiter"),
            ('{"a" 1}', "expected_colon"),
            ('"\\q"', "invalid_escape"),
            ('"\\u12"', "invalid_unicode_escape"),
            ('"\\', "unfinished_escape"),
            ('"abc', "unterminated_string"),
            ('["a"] x', "trailing_input"),
            ("nul", "expected_value"),
            ("[-]", "expected_digit"),
            ("[1", "expected_delimiter"),
            ('["\x01"]', "unescaped_control_character"),
        ):
            with self.subTest(document=document):
                with self.assertRaises(ParseError) as caught:
                    parse(document)
                self.assertEqual(caught.exception.kind, kind)

    # Requirements: RQ-014
    def test_wrong_kind_access_is_reported(self):
        # change-messages: an error names its kind, and the message is no part of the interface.
        value = parse('{"a":"b"}').get("a")
        for read in (value.number_literal, value.items):
            with self.subTest(read=read):
                with self.assertRaises(TypeError) as caught:
                    read()
                self.assertEqual(caught.exception.kind, "wrong_kind")

    # Requirements: RQ-002, RQ-019
    def test_member_lookup_uses_decoded_names(self):
        value = parse('{"\\u0062":1,"b":2,"\\ud83d\\ude00":3}')
        self.assertEqual(value.get("b").number_literal(), "2")
        self.assertEqual(value.get_units((0xD83D, 0xDE00)).number_literal(), "3")
        self.assertIsNone(value.get("missing"))

    # Requirements: RQ-001
    def test_repeated_key_keeps_first_position_and_last_value(self):
        value = parse('{"b":1,"a":2,"b":3}')
        self.assertEqual(stringify(value), '{"b":3,"a":2}')
        self.assertEqual(names(value), ["b", "a"])
        # The replaced value is validated like every other occurrence.
        with self.assertRaises(ParseError):
            parse('{"a":1,"a":tru}')

    # Requirements: RQ-018
    def test_root_keeps_surrounding_text(self):
        value = parse(" 1 ")
        self.assertEqual(value.raw, " 1 ")
        self.assertEqual(value.number_literal(), "1")
        self.assertEqual(parse(" [1] ").raw, " [1] ")

    # Requirements: RQ-009
    def test_unpaired_surrogate_stays_in_units(self):
        value = parse('{"k":"\\ud800"}').get("k")
        self.assertEqual(value.string_units(), [0xD800])
        self.assertEqual(stringify(value), '"\\ud800"')
        # change-string-value: a string with an unpaired surrogate has no Unicode text.
        with self.assertRaises(ValueError) as caught:
            value.string_value()
        self.assertEqual(caught.exception.kind, "unpaired_surrogate")

    # Requirements: RQ-009
    def test_surrogate_pair_decodes(self):
        value = parse('{"k":"\\ud83d\\ude00"}').get("k")
        self.assertEqual(value.string_units(), [0xD83D, 0xDE00])
        self.assertEqual(value.string_value(), "😀")

    # Requirements: RQ-015
    def test_factories_validate_arguments(self):
        with self.assertRaises(TypeError):
            Value.string(1)
        with self.assertRaises(ValueError):
            Value.from_units([0x10000])
        with self.assertRaises(ValueError):
            Value.number(" 1")
        with self.assertRaises(ParseError):
            Value.number("1x")
        with self.assertRaises(ParseError):
            Value.number("NaN")
        with self.assertRaises(TypeError):
            Value.boolean(1)
        with self.assertRaises(TypeError):
            Value.array([1])
        with self.assertRaises(TypeError):
            obj((1, Value.null()))

    # Requirements: RQ-012
    def test_values_come_only_from_the_library(self):
        # change-errors: a refused construction is a JSONTypeError with its kind.
        with self.assertRaises(TypeError) as caught:
            Value()
        self.assertEqual(caught.exception.kind, "direct_construction")
        with self.assertRaises(TypeError):
            stringify({"a": 1})

    # Requirements: RQ-013
    def test_returned_collections_are_immutable(self):
        # change-collections: an accessor returns a new collection for each access, so a change of it leaves the value as
        # it was.
        value = parse('{"a":1,"b":[1,2]}')
        members = value.members()
        members.insert(Value.string("c"), Value.null())
        items = value.get("b").items()
        items.append(Value.null())
        self.assertEqual(names(value), ["a", "b"])
        self.assertEqual(
            [stringify(item) for item in value.get("b").items()], ["1", "2"]
        )

    # Requirements: RQ-020
    def test_host_serialization_boundary(self):
        # change-host-hooks: Python has no hook, and json.dumps refuses the value with its own error.
        with self.assertRaises(TypeError):
            json.dumps(parse('{"a":1}'))
        self.assertFalse(hasattr(binding, "JSONEncoder"))

    # Requirements: RQ-020
    def test_host_serialization_embeds_values(self):
        # A native structure that holds a value is refused by the host encoder, which points to the library serializer.
        value = parse('{"b":1.50,"a":[2]}')
        with self.assertRaises(TypeError):
            json.dumps({"props": value})
        self.assertEqual(stringify(value), '{"b":1.50,"a":[2]}')

    # Requirements: RQ-007
    def test_bytes_input_is_validated(self):
        with self.assertRaises(ParseError) as caught:
            parse(b'["\xc3"]')
        self.assertEqual(
            (caught.exception.kind, caught.exception.offset), ("invalid_utf8", 2)
        )

    # Requirements: RQ-004, RQ-007
    def test_invalid_utf8_reports_the_first_bad_byte(self):
        for document, offset in (
            (b"\xff", 0),
            (b'["\x80"]', 2),
            (b'["\xed\xa0\x80"]', 2),
            (b'["\xf0\x9f\x98"]', 2),
            (b'["\xc0\x80"]', 2),
            (b'["\xc3"]', 2),
            (b'{"b":1,"b":\xff}', 11),
        ):
            with self.subTest(document=document):
                with self.assertRaises(ParseError) as caught:
                    parse(document)
                self.assertEqual(caught.exception.kind, "invalid_utf8")
                self.assertEqual(caught.exception.offset, offset)

    # Requirements: RQ-016
    def test_ordered_map_rejects_non_string_key(self):
        # change-argument-types: a key of a host type is invalid_argument_type; non_string_key a value of another kind.
        for key in (1, None):
            with self.assertRaises(TypeError) as caught:
                obj((key, Value.null()))
            self.assertEqual(caught.exception.kind, "invalid_argument_type")
        with self.assertRaises(TypeError) as caught:
            obj((Value.number("1"), Value.null()))
        self.assertEqual(caught.exception.kind, "non_string_key")


class PackageCases(unittest.TestCase):
    # Requirements: RQ-017
    def test_strict_parse_rejects_duplicate_keys(self):
        for document, offset in (
            ('{"b":1,"b":2}', 7),
            ('{"x":{"b":1,"b":2}}', 12),
            ('{"\\u0062":1,"b":2}', 12),
            ('{"\\ud83d\\ude00":1,"😀":2}', 18),
        ):
            with self.subTest(document=document):
                with self.assertRaises(ParseError) as caught:
                    parse(document, reject_duplicates=True)
                self.assertEqual(caught.exception.kind, "duplicate_object_key")
                self.assertEqual(caught.exception.offset, offset)

    # Requirements: RQ-017
    def test_strict_parse_accepts_unique_keys(self):
        value = parse('{"b":1,"a":2}', reject_duplicates=True)
        self.assertEqual(stringify(value), '{"b":1,"a":2}')
        with self.assertRaises(ParseError) as caught:
            parse(b'{"b":1,"b":\xff}', reject_duplicates=True)
        self.assertEqual(caught.exception.kind, "invalid_utf8")
        with self.assertRaises(TypeError):
            parse("1", reject_duplicates=1)

    # Requirements: RQ-009
    def test_string_value_keeps_an_unpaired_surrogate(self):
        # change-string-value: the code units keep an unpaired surrogate, which has no Unicode text.
        self.assertEqual(parse('"a\\ud800"').string_units(), [0x61, 0xD800])

    # Requirements: RQ-007
    def test_utf8_validation_holds_for_long_multibyte_text(self):
        text = "\ud55c\U0001f30d" * 64
        self.assertEqual(
            parse(f'{{"key":"{text}"}}'.encode()).get("key").string_value(), text
        )
        with self.assertRaises(ParseError) as caught:
            parse(b'["\xff"]')
        self.assertEqual(caught.exception.kind, "invalid_utf8")
        self.assertEqual(caught.exception.offset, 2)

    # Requirements: RQ-008
    def test_text_input_rejects_lone_surrogates(self):
        # change-offsets: a text with an unpaired surrogate has no UTF-8 encoding, and the binding refuses it instead of the
        # core kind unescaped_lone_surrogate.
        with self.assertRaises(ValueError) as caught:
            parse('["한"]\ud800')
        self.assertEqual(caught.exception.kind, "invalid_text")

    def test_public_api_exports_the_entry_points(self):
        # RQ-023: the parse, serialization, factory and accessor functions are exported.
        # change-parse-source: parse takes a text or the bytes.
        for name in ("parse", "stringify", "Value"):
            self.assertTrue(callable(getattr(binding, name)), name)
        scalars = [
            Value.string("x"),
            Value.number("1"),
            Value.boolean(True),
            Value.null(),
        ]
        built = obj((Value.string("a"), Value.array(scalars)))
        self.assertEqual(stringify(built), '{"a":["x",1,true,null]}')
        items = parse(stringify(built)).get("a").items()
        self.assertEqual(
            [item.kind for item in items], ["string", "number", "boolean", "null"]
        )
        self.assertEqual(items[0].string_value(), "x")
        self.assertEqual(items[1].number_literal(), "1")
        self.assertIs(items[2].boolean_value(), True)
        self.assertEqual(built.members().size, 1)

    def test_parse_error_exposes_kind_offset_and_message(self):
        # RQ-024: a parse error exposes its kind, its offset and its message.
        with self.assertRaises(ParseError) as caught:
            parse("[1,]")
        self.assertEqual(caught.exception.kind, "expected_value")
        self.assertEqual(caught.exception.offset, 3)
        self.assertTrue(str(caught.exception))

    # Requirements: RQ-003
    def test_arrays_and_objects_stay_distinct(self):
        numbers = [item.number_literal() for item in parse("[3,1,2]").items()]
        self.assertEqual(numbers, ["3", "1", "2"])
        self.assertEqual(parse("[]").kind, "array")
        self.assertEqual(parse("{}").kind, "object")
        text = '{"a":[],"b":{},"c":[{}]}'
        self.assertEqual(stringify(parse(text)), text)

    # Requirements: RQ-010
    def test_number_tokens_are_kept_exactly(self):
        tokens = ["1.0e+2", "-0", "0.10", "123456789012345678901234567890", "1E400"]
        kept = [
            item.number_literal() for item in parse(f"[{','.join(tokens)}]").items()
        ]
        self.assertEqual(kept, tokens)
        for source, kind in (
            ("NaN", "expected_value"),
            ("Infinity", "expected_value"),
            ("-Infinity", "expected_digit"),
            ("[NaN]", "expected_value"),
        ):
            with self.subTest(source=source):
                with self.assertRaises(ParseError) as caught:
                    parse(source)
                self.assertEqual(caught.exception.kind, kind)

    # Requirements: RQ-011
    def test_serialization_is_idempotent(self):
        once = stringify(parse(' { "b" : 1 , "a" : 2 , "b" : 3 } '))
        self.assertEqual(once, '{"b":3,"a":2}')
        self.assertEqual(stringify(parse(once)), once)
