"""The package tests of the ordered-json Python package, run by unittest.

Every case of the shared standard runs here, and the package cases cover the API of this binding alone. The package is installed into packages/python/.venv,
whose interpreter make test-python runs.
"""

import json
import unittest

from polyspec import ordered_json
from polyspec.ordered_json import (
    MAX_DEPTH,
    JSONEncoder,
    ParseError,
    ParseOptions,
    Value,
    parse,
    parse_bytes,
    stringify,
)


class StandardCases(unittest.TestCase):
    # Requirements: RQ-006
    def test_depth_argument_is_bounded(self):
        for limit in (-1, MAX_DEPTH + 1, 257):
            with self.subTest(limit=limit):
                with self.assertRaises(ValueError):
                    parse("1", ParseOptions(max_depth=limit))
        parse("1", ParseOptions(max_depth=0))
        parse("[]", ParseOptions(max_depth=1))
        with self.assertRaises(ParseError):
            parse("[]", ParseOptions(max_depth=0))

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
        with self.assertRaises(ParseError) as caught:
            parse_bytes(b'["\xed\x95\x9c\x01"]')
        self.assertEqual((caught.exception.offset, caught.exception.unit), (5, "byte"))

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
        value = parse('{"a":"b"}').get("a")
        with self.assertRaisesRegex(TypeError, "Expected number, got string"):
            value.number_literal()
        with self.assertRaisesRegex(TypeError, "Expected array, got string"):
            value.items()

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
        self.assertEqual(list(value.members()), ["b", "a"])
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
            Value.object({1: Value.null()})

    # Requirements: RQ-012
    def test_values_come_only_from_the_library(self):
        with self.assertRaises(TypeError):
            Value()
        with self.assertRaises(TypeError):
            stringify({"a": 1})

    # Requirements: RQ-013
    def test_returned_collections_are_immutable(self):
        value = parse('{"a":1,"b":[1,2]}')
        members = value.members()
        with self.assertRaises(TypeError):
            members["c"] = Value.null()
        self.assertEqual(list(value.members()), ["a", "b"])
        self.assertEqual(
            [stringify(item) for item in value.get("b").items()], ["1", "2"]
        )

    # Requirements: RQ-020
    def test_host_serialization_boundary(self):
        # The host encoder has no ordered knowledge and refuses the value; the encoder of the library points to stringify.
        with self.assertRaises(TypeError):
            json.dumps(parse('{"a":1}'))
        with self.assertRaisesRegex(TypeError, "stringify"):
            json.dumps(parse('{"a":1}'), cls=JSONEncoder)

    # Requirements: RQ-020
    def test_host_serialization_embeds_values(self):
        # A native structure that holds a value is refused by the host encoder, which points to the library serializer.
        value = parse('{"b":1.50,"a":[2]}')
        with self.assertRaises(TypeError):
            json.dumps({"props": value})
        with self.assertRaisesRegex(TypeError, "stringify"):
            json.dumps({"props": value}, cls=JSONEncoder)
        self.assertEqual(stringify(value), '{"b":1.50,"a":[2]}')

    # Requirements: RQ-007
    def test_bytes_input_is_validated(self):
        with self.assertRaises(ParseError) as caught:
            parse_bytes(b'["\xc3"]')
        self.assertEqual(
            (caught.exception.kind, caught.exception.offset), ("invalid_utf8", 2)
        )

    # Requirements: RQ-004, RQ-007
    def test_invalid_utf8_reports_the_first_bad_byte(self):
        # bytes.decode validates the document: the rejection is caused by its UnicodeDecodeError,
        # whose start is the offset, and the package holds no UTF-8 checker of its own.
        self.assertFalse(hasattr(ordered_json, "_invalid_utf8_offset"))
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
                    parse_bytes(document)
                self.assertEqual(caught.exception.kind, "invalid_utf8")
                self.assertEqual(caught.exception.offset, offset)
                self.assertIsInstance(caught.exception.__cause__, UnicodeDecodeError)
                self.assertEqual(caught.exception.__cause__.start, offset)

    # Requirements: RQ-016
    def test_ordered_map_rejects_non_string_key(self):
        with self.assertRaises(TypeError):
            Value.object({1: Value.null()})
        with self.assertRaises(TypeError):
            Value.object([(None, Value.null())])


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
                    parse(document, ParseOptions(reject_duplicates=True))
                self.assertEqual(caught.exception.kind, "duplicate_object_key")
                self.assertEqual(caught.exception.offset, offset)

    # Requirements: RQ-017
    def test_strict_parse_accepts_unique_keys(self):
        value = parse('{"b":1,"a":2}', ParseOptions(reject_duplicates=True))
        self.assertEqual(stringify(value), '{"b":1,"a":2}')
        with self.assertRaises(ParseError) as caught:
            parse_bytes(b'{"b":1,"b":\xff}', ParseOptions(reject_duplicates=True))
        self.assertEqual(caught.exception.kind, "invalid_utf8")
        with self.assertRaises(TypeError):
            parse("1", ParseOptions(reject_duplicates=1))

    # Requirements: RQ-009
    def test_string_value_keeps_an_unpaired_surrogate(self):
        self.assertEqual(parse('"a\\ud800"').string_value(), "a\ud800")

    # Requirements: RQ-007
    def test_utf8_validation_holds_for_long_multibyte_text(self):
        text = "\ud55c\U0001f30d" * 64
        self.assertEqual(
            parse_bytes(f'{{"key":"{text}"}}'.encode()).get("key").string_value(), text
        )
        with self.assertRaises(ParseError) as caught:
            parse_bytes(b'["\xff"]')
        self.assertEqual(caught.exception.kind, "invalid_utf8")
        self.assertEqual(caught.exception.offset, 2)

    # Requirements: RQ-008
    def test_text_input_rejects_lone_surrogates(self):
        with self.assertRaises(ParseError) as caught:
            parse('["한"]\ud800')
        self.assertEqual(caught.exception.kind, "unescaped_lone_surrogate")
        self.assertEqual(caught.exception.offset, len('["한"]'.encode("utf-8")))

    def test_public_api_exports_the_entry_points(self):
        # RQ-023: the parse, serialization, factory and accessor functions are exported.
        for name in ("parse", "parse_bytes", "stringify", "Value"):
            self.assertTrue(callable(getattr(ordered_json, name)), name)
        scalars = [
            Value.string("x"),
            Value.number("1"),
            Value.boolean(True),
            Value.null(),
        ]
        built = Value.object([("a", Value.array(scalars))])
        self.assertEqual(stringify(built), '{"a":["x",1,true,null]}')
        items = parse(stringify(built)).get("a").items()
        self.assertEqual(
            [item.kind for item in items], ["string", "number", "boolean", "null"]
        )
        self.assertEqual(items[0].string_value(), "x")
        self.assertEqual(items[1].number_literal(), "1")
        self.assertIs(items[2].boolean_value(), True)
        self.assertEqual(len(built.members()), 1)

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
