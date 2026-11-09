"""The kinds of the errors of the package, run by unittest.

Requirements: RQ-005, RQ-025. Every error that the package raises names its kind on `kind`: a ParseError the rejection
kinds of the JSON contract, a TypeError or ValueError the argument kinds. Each kind has an accepting and a refusing site.
"""

import json
from pathlib import Path
import re
import unittest

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

CONTRACT = Path(__file__).resolve().parents[3] / "docs" / "spec" / "json-contract.md"


def listed(anchor):
    """The kinds of the list of the section of anchor in the JSON contract, each with the text of its item."""
    section = CONTRACT.read_text("utf-8").split(anchor)[1].split("\n<a id=")[0]
    return dict(re.findall(r"^- `([a-z0-9_]+)`(.*)$", section, re.M))


CASES = [
    # (kind, error class, accepting site, refusing site)
    ("expected_value", ParseError, lambda: parse("[1]"), lambda: parse("[1,]")),
    ("expected_digit", ParseError, lambda: parse("1.5"), lambda: parse("1.")),
    ("expected_colon", ParseError, lambda: parse('{"a":1}'), lambda: parse('{"a" 1}')),
    ("expected_delimiter", ParseError, lambda: parse("[1,2]"), lambda: parse("[1 2]")),
    (
        "expected_object_key",
        ParseError,
        lambda: parse('{"a":1}'),
        lambda: parse("{1:2}"),
    ),
    ("invalid_escape", ParseError, lambda: parse(r'"\n"'), lambda: parse(r'"\x"')),
    (
        "invalid_unicode_escape",
        ParseError,
        lambda: parse(r'"A"'),
        lambda: parse(r'"\u00g1"'),
    ),
    ("unfinished_escape", ParseError, lambda: parse(r'"\\"'), lambda: parse('"\\')),
    ("unterminated_string", ParseError, lambda: parse('"a"'), lambda: parse('"a')),
    (
        "unescaped_control_character",
        ParseError,
        lambda: parse(r'"a\tb"'),
        lambda: parse('"a\tb"'),
    ),
    (
        "unescaped_lone_surrogate",
        ParseError,
        lambda: parse(r'"\ud800"'),
        lambda: parse('"\ud800"'),
    ),
    (
        "invalid_utf8",
        ParseError,
        lambda: parse_bytes('"한"'.encode()),
        lambda: parse_bytes(b'"\xff"'),
    ),
    (
        "maximum_depth_exceeded",
        ParseError,
        lambda: parse("[[]]", ParseOptions(max_depth=2)),
        lambda: parse("[[]]", ParseOptions(max_depth=1)),
    ),
    ("trailing_input", ParseError, lambda: parse("[1] "), lambda: parse("[1] x")),
    (
        "duplicate_object_key",
        ParseError,
        lambda: parse('{"a":1,"b":2}', ParseOptions(reject_duplicates=True)),
        lambda: parse('{"a":1,"a":2}', ParseOptions(reject_duplicates=True)),
    ),
    (
        "non_string_key",
        TypeError,
        lambda: Value.object([("a", Value.null())]),
        lambda: Value.object([(Value.number("1"), Value.null())]),
    ),
    (
        "wrong_kind",
        TypeError,
        lambda: parse('"x"').string_value(),
        lambda: parse("1").string_value(),
    ),
    (
        "invalid_number_literal",
        ValueError,
        lambda: Value.number("-0.5e3"),
        lambda: Value.number(" 1"),
    ),
    (
        "depth_limit_out_of_range",
        ValueError,
        lambda: ParseOptions(max_depth=MAX_DEPTH),
        lambda: ParseOptions(max_depth=MAX_DEPTH + 1),
    ),
    (
        "invalid_argument_type",
        TypeError,
        lambda: Value.string("a"),
        lambda: Value.string(1),
    ),
    (
        "invalid_code_unit",
        ValueError,
        lambda: Value.from_units([0xFFFF]),
        lambda: Value.from_units([0x10000]),
    ),
    (
        "host_serialization_refused",
        TypeError,
        lambda: json.dumps(1, cls=JSONEncoder),
        lambda: json.dumps(parse("1"), cls=JSONEncoder),
    ),
    (
        "direct_construction",
        TypeError,
        lambda: ParseError("expected_value", 0),
        lambda: Value(),
    ),
]


class ErrorKindCases(unittest.TestCase):
    def kind(self, run, error_class=TypeError):
        with self.assertRaises(error_class) as caught:
            run()
        return caught.exception.kind

    def test_every_kind_has_an_accepting_and_a_refusing_site(self):
        for kind, error_class, accept, refuse in CASES:
            with self.subTest(kind=kind):
                accept()
                self.assertEqual(self.kind(refuse, error_class), kind)

    def test_the_kinds_are_the_shared_lists(self):
        # A kind of a list that has no case here is one that the list states cannot arise in Python.
        lists = listed('<a id="rejection-kinds"></a>') | listed(
            '<a id="argument-kinds"></a>'
        )
        named = {kind for kind, *_ in CASES}
        for name, text in lists.items():
            if name not in named:
                self.assertRegex(text, r"cannot arise in[^.]*Python", name)
        self.assertEqual(named - set(lists), {"duplicate_object_key"})

    def test_every_refused_argument_carries_its_kind(self):
        for literal in ("[]", '"1"', "true", "null", "1 ", "\n1"):
            with self.subTest(literal=literal):
                self.assertEqual(
                    self.kind(lambda: Value.number(literal), ValueError),
                    "invalid_number_literal",
                )
        self.assertEqual(
            self.kind(lambda: Value.number("x"), ParseError), "expected_value"
        )
        obj = parse("{}")
        for read in (
            obj.items,
            parse("[]").members,
            obj.string_value,
            obj.string_units,
            obj.number_literal,
            obj.boolean_value,
            lambda: parse("[]").get("a"),
            lambda: parse("[]").get_units([97]),
        ):
            with self.subTest(read=read):
                self.assertEqual(self.kind(read), "wrong_kind")
        for key in (1, None, Value.null(), parse("[]"), parse("{}"), True):
            with self.subTest(key=key):
                self.assertEqual(
                    self.kind(lambda: Value.object([(key, Value.null())])),
                    "non_string_key",
                )
                self.assertEqual(
                    self.kind(lambda: Value.object({key: Value.null()})),
                    "non_string_key",
                )
        for key in (1, None):
            self.assertEqual(self.kind(lambda: obj.get(key)), "non_string_key")
        for limit in (-1, MAX_DEPTH + 1):
            self.assertEqual(
                self.kind(lambda: ParseOptions(max_depth=limit), ValueError),
                "depth_limit_out_of_range",
            )
        for limit in (1.5, "1", None, True):
            self.assertEqual(
                self.kind(lambda: ParseOptions(max_depth=limit)),
                "depth_limit_out_of_range",
            )
        for units in ([-1], [0x10000], ["a"], [1.0], [True]):
            with self.subTest(units=units):
                self.assertEqual(
                    self.kind(lambda: Value.from_units(units), ValueError),
                    "invalid_code_unit",
                )
                self.assertEqual(
                    self.kind(lambda: obj.get_units(units), ValueError),
                    "invalid_code_unit",
                )
        for run in (
            lambda: parse(1),
            lambda: parse("1", "options"),
            lambda: ParseOptions(reject_duplicates=1),
            lambda: parse_bytes("1"),
            lambda: Value.number(1),
            lambda: Value.boolean("true"),
            lambda: Value.array(None),
            lambda: Value.array([1]),
            lambda: Value.object(None),
            lambda: Value.object([("a", 1)]),
            lambda: Value.object([1]),
            lambda: Value.object([("a",)]),
            lambda: Value.from_units(None),
            lambda: stringify({}),
        ):
            with self.subTest(run=run):
                self.assertEqual(self.kind(run), "invalid_argument_type")
        self.assertEqual(
            self.kind(lambda: json.dumps({"nested": [parse("1")]}, cls=JSONEncoder)),
            "host_serialization_refused",
        )
        for kind in ("not_a_kind", ""):
            self.assertEqual(
                self.kind(lambda: ParseError(kind, 0)), "direct_construction"
            )
        self.assertEqual(ParseError("expected_digit", 4).kind, "expected_digit")


if __name__ == "__main__":
    unittest.main()
