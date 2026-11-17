"""The kinds of the errors of the binding polyspec.json, run by unittest.

Requirements: RQ-005, RQ-025. Every error that the binding raises names its kind on `kind`: a ParseError the rejection
kinds of the JSON contract, a JSONTypeError or JSONValueError the argument kinds (change-errors). Each kind has an accepting
and a refusing site. The test of the legacy package with no change beyond the changes of packages/rust/interface.json, each
named where it applies (T3.25-2). An option given by position is refused as the binding v0.0.16 refuses it until the
binding 0.0.18; the test of the kinds that cannot arise in Python is tests/scripts/kinds.test.mts, one test for
every binding (T3.64).
"""

import json
import unittest

from polyspec.json import MAX_DEPTH, OrderedMap, ParseError, Value, parse, stringify


def insert(key, value=None):
    """An insert of key into a new OrderedMap (change-ordered-map: an object takes an OrderedMap whose keys are values)."""
    return OrderedMap().insert(key, Value.null() if value is None else value)


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
    # change-offsets: a text with an unpaired surrogate has no UTF-8 encoding, and the binding refuses it instead of the
    # core kind unescaped_lone_surrogate.
    (
        "invalid_text",
        ValueError,
        lambda: parse(r'"\ud800"'),
        lambda: parse('"\ud800"'),
    ),
    (
        "invalid_utf8",
        ParseError,
        # change-parse-source: parse takes the bytes.
        lambda: parse('"한"'.encode()),
        lambda: parse(b'"\xff"'),
    ),
    (
        "maximum_depth_exceeded",
        ParseError,
        # change-parse-options: the options of parse are its keyword arguments.
        lambda: parse("[[]]", max_depth=2),
        lambda: parse("[[]]", max_depth=1),
    ),
    ("trailing_input", ParseError, lambda: parse("[1] "), lambda: parse("[1] x")),
    (
        "duplicate_object_key",
        ParseError,
        lambda: parse('{"a":1,"b":2}', reject_duplicates=True),
        lambda: parse('{"a":1,"a":2}', reject_duplicates=True),
    ),
    (
        "non_string_key",
        TypeError,
        lambda: insert(Value.string("a")),
        lambda: insert(Value.number("1")),
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
        lambda: parse("1", max_depth=MAX_DEPTH),
        lambda: parse("1", max_depth=MAX_DEPTH + 1),
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
    # change-from-float: a number is built from a float, and a float that is no JSON number is refused (T3.64).
    (
        "non_finite_number",
        ValueError,
        lambda: Value.from_float(1.5),
        lambda: Value.from_float(float("nan")),
    ),
    # change-host-hooks: Python has no hook, and json.dumps refuses a value with its own error, so the kind
    # host_serialization_refused cannot arise in Python.
    ("direct_construction", TypeError, lambda: Value.null(), lambda: Value()),
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
        for key in (Value.null(), parse("[]"), parse("{}")):
            with self.subTest(key=key):
                self.assertEqual(self.kind(lambda: insert(key)), "non_string_key")
        # change-argument-types: a key of a host type that the function does not take.
        for key in (1, None, True):
            with self.subTest(key=key):
                self.assertEqual(
                    self.kind(lambda: insert(key)), "invalid_argument_type"
                )
        for key in (1, None):
            self.assertEqual(self.kind(lambda: obj.get(key)), "invalid_argument_type")
        for limit in (-1, MAX_DEPTH + 1):
            self.assertEqual(
                self.kind(lambda: parse("1", max_depth=limit), ValueError),
                "depth_limit_out_of_range",
            )
        # change-depth-limit: a limit that is no integer is refused by the conversion of the argument, a number with
        # invalid_number and a value of another type with invalid_argument_type.
        for limit in (1.5, float("nan")):
            self.assertEqual(
                self.kind(lambda: parse("1", max_depth=limit), ValueError),
                "invalid_number",
            )
        for limit in ("1", None, True):
            self.assertEqual(
                self.kind(lambda: parse("1", max_depth=limit)),
                "invalid_argument_type",
            )
        # change-code-units: a code unit is an unsigned integer of the contract. The conversion of the argument refuses a
        # number that is no unsigned integer with invalid_number and a value of another type with invalid_argument_type;
        # the core refuses an unsigned integer above 65535 with invalid_code_unit.
        for units, error_class, kind in (
            ([0x10000], ValueError, "invalid_code_unit"),
            ([-1], ValueError, "invalid_number"),
            ([1.0], ValueError, "invalid_number"),
            (["a"], TypeError, "invalid_argument_type"),
            ([True], TypeError, "invalid_argument_type"),
        ):
            with self.subTest(units=units):
                self.assertEqual(
                    self.kind(lambda: Value.from_units(units), error_class), kind
                )
                self.assertEqual(
                    self.kind(lambda: obj.get_units(units), error_class), kind
                )
        for run in (
            lambda: parse(1),
            lambda: parse("1", reject_duplicates=1),
            lambda: Value.number(1),
            lambda: Value.boolean("true"),
            lambda: Value.array(None),
            lambda: Value.array([1]),
            lambda: Value.object(None),
            lambda: Value.object([("a", Value.null())]),
            lambda: insert(Value.string("a"), 1),
            lambda: Value.from_units(None),
            lambda: stringify({}),
        ):
            with self.subTest(run=run):
                self.assertEqual(self.kind(run), "invalid_argument_type")
        # change-host-hooks: json.dumps refuses a value that a native structure embeds with its own error.
        with self.assertRaises(TypeError):
            json.dumps({"nested": [parse("1")]})
        # A ParseError is constructed directly (binding GN-7a): its constructor takes a message and a kind of the class,
        # and refuses another argument with invalid_argument_type.
        self.assertEqual(ParseError("m", "expected_value").kind, "expected_value")
        for args in (("m", "not_a_kind"), ("m", "invalid_argument_type"), ("m", 1)):
            with self.subTest(args=args):
                self.assertEqual(
                    self.kind(lambda: ParseError(*args)), "invalid_argument_type"
                )
        # The binding v0.0.16 refuses an option given by position with a TypeError of Python with no kind; binding 0.0.18
        # changes it.
        with self.assertRaises(TypeError) as caught:
            parse("1", "options")
        self.assertNotIsInstance(getattr(caught.exception, "kind", None), str)


if __name__ == "__main__":
    unittest.main()
