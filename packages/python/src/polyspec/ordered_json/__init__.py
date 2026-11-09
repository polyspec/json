"""ordered-json for Python: JSON document order at every depth.

Strict JSON with associative objects that preserve document key order
recursively. Repeated keys retain the first position and the last value.
Parse errors report UTF-8 byte offsets and the rejection kind that every
implementation shares.
"""

from collections.abc import Iterable, Mapping
from enum import StrEnum
import json
from json.decoder import scanstring as _scanstring
import re
from types import MappingProxyType

__all__ = [
    "MAX_DEPTH",
    "JSONEncoder",
    "Kind",
    "ParseError",
    "ParseOptions",
    "Value",
    "parse",
    "parse_bytes",
    "stringify",
]

MAX_DEPTH = 256


class Kind(StrEnum):
    """The names of the kinds of a value, which Value.kind returns."""

    Object = "object"
    Array = "array"
    String = "string"
    Number = "number"
    Boolean = "boolean"
    Null = "null"


_MESSAGES = {
    "expected_value": "Expected JSON value",
    "expected_digit": "Expected digit",
    "expected_colon": "Expected colon",
    "expected_delimiter": "Expected comma or closing delimiter",
    "expected_object_key": "Expected string",
    "invalid_escape": "Invalid escape",
    "invalid_unicode_escape": "Invalid Unicode escape",
    "unfinished_escape": "Unfinished escape",
    "unterminated_string": "Unterminated string",
    "unescaped_control_character": "Unescaped control character",
    "unescaped_lone_surrogate": "Unescaped unpaired surrogate",
    "invalid_utf8": "Invalid UTF-8",
    "maximum_depth_exceeded": "Maximum nesting depth exceeded",
    "trailing_input": "Unexpected trailing input",
    "duplicate_object_key": "Duplicate object key",
}


def _refuse(error_class: type[Exception], kind: str, message: str) -> Exception:
    """The host error of error_class with the message and the argument kind of the JSON contract on `kind`, which every
    implementation names alike."""
    error = error_class(message)
    error.kind = kind  # type: ignore[attr-defined]
    return error


_ESCAPED_UNITS = {
    0x62: 8,
    0x66: 12,
    0x6E: 10,
    0x72: 13,
    0x74: 9,
    0x22: 34,
    0x5C: 92,
    0x2F: 47,
}
# The grammar of the scanner, defined once. Each piece is a regular expression over bytes. The
# tokenizer (_MEMBER, _ITEM, _ROOT) composes the pieces into the patterns that the C code of re
# matches, and the analysis of a match that fails (_Parser._member_error, _value_error,
# _string_error, _number_check) matches the same pieces up to the byte that breaks them, so the
# fast path and every failure offset read one definition.
_WS = rb"[ \t\n\r]*+"
_DIGIT = rb"[0-9]"
_HEX = rb"[0-9a-fA-F]"
_SIMPLE_ESCAPE = rb'["\\/bfnrt]'
_PLAIN = rb'[^"\\\x00-\x1f]'
_ESCAPE = rb"\\(?:" + _SIMPLE_ESCAPE + rb"|u" + _HEX + rb"{4})"
# A run of plain bytes, then each escape with the plain run after it: the body that
# (?:PLAIN|ESCAPE)* describes, in the form that re matches a run at a time instead of a byte at a
# time. Each run is possessive (*+): no byte that follows a run can belong to it, so no
# backtracking into a run can change a match.
_BODY = _PLAIN + rb"*+(?:" + _ESCAPE + _PLAIN + rb"*+)*+"
_STRING = rb'"' + _BODY + rb'"'
# A number: an integer, then a point and an exponent, each followed by its digits. The tokenizer
# reads a number token as far as it reaches, with each part optional and each digit run possibly
# empty (_NUMBER), so a sign, a point or an exponent without its digits is part of the token; the
# token is valid exactly when it matches the number of the grammar (_STRICT_NUMBER), and
# _Parser._number_check names the first missing digit. Both read the same parts. Digit runs are
# possessive, as in _BODY.
_INTEGER = rb"0|[1-9]" + _DIGIT + rb"*+"
_POINT = rb"\."
_EXPONENT = rb"[eE][+-]?"
_NUMBER = (
    rb"(?=[-0-9])-?(?P<int>" + _INTEGER + rb")?(?P<frac>" + _POINT + _DIGIT + rb"*+)?"
    rb"(?P<exp>" + _EXPONENT + _DIGIT + rb"*+)?"
)
_SCALAR = rb"(?:" + _STRING + rb"|" + _NUMBER + rb"|true|false|null)"
# The tokenizer: one match reads a whole member of an object (its name, colon and value, and after a
# scalar value the delimiter that follows it), an item of an array, or the root value. A container
# value ends the match at its bracket.
_MEMBER = re.compile(
    _WS
    + rb"(?P<k>"
    + _STRING
    + rb")"
    + _WS
    + rb":"
    + _WS
    + rb"(?:(?P<v>"
    + _SCALAR
    + rb")(?:"
    + _WS
    + rb"(?P<d>[,}]))?|(?P<c>[{\[]))"
)
_ITEM = re.compile(
    _WS + rb"(?:(?P<v>" + _SCALAR + rb")(?:" + _WS + rb"(?P<d>[,\]]))?|(?P<c>[{\[]))"
)
_ROOT = re.compile(_WS + rb"(?:(?P<v>" + _SCALAR + rb")|(?P<c>[{\[]))")
_VALUE = re.compile(_WS + rb"(?P<v>" + _SCALAR + rb"|[{\[])")
_DELIMITER = re.compile(_WS + rb"(?P<d>[,}\]])")
# The last group that a member or item match closes tells its shape: the delimiter after a scalar
# value, or the bracket of a container value; any other last group is a scalar value without a
# delimiter.
_MEMBER_DELIMITER, _MEMBER_CONTAINER = _MEMBER.groupindex["d"], _MEMBER.groupindex["c"]
_ITEM_DELIMITER, _ITEM_CONTAINER = _ITEM.groupindex["d"], _ITEM.groupindex["c"]
_WS_RUN = re.compile(_WS)
_STRICT_NUMBER = re.compile(
    rb"-?(?:"
    + _INTEGER
    + rb")(?:"
    + _POINT
    + _DIGIT
    + rb"++)?(?:"
    + _EXPONENT
    + _DIGIT
    + rb"++)?"
)
_STRING_TOKEN = re.compile(_STRING)
_BODY_RUN = re.compile(_BODY)
_SIMPLE_ESCAPE_BYTE = re.compile(_SIMPLE_ESCAPE)
_HEX_RUN = re.compile(_HEX + rb"{0,4}")
_DIGIT_BYTE = re.compile(_DIGIT)
# The kind of a scalar token by its first byte; any other first byte of a scalar is a number.
_FIRST_BYTE_KINDS = {0x22: "string", 0x74: "boolean", 0x66: "boolean", 0x6E: "null"}
_SCALAR_KINDS = tuple(_FIRST_BYTE_KINDS.get(byte, "number") for byte in range(256))
_INTERNAL = object()


class ParseError(ValueError):
    """A rejected input document.

    `kind` names the reason with the identifier every implementation
    shares, and `offset` is the byte position of the first byte that
    makes the document invalid.
    """

    __slots__ = ("kind", "offset", "unit")

    def __init__(self, kind: str, offset: int):
        if kind not in _MESSAGES:
            raise _refuse(
                TypeError, "direct_construction", f"ParseError has no kind {kind!r}"
            )
        super().__init__(f"{_MESSAGES[kind]} at byte {offset}")
        self.kind = kind
        self.offset = offset
        self.unit = "byte"


class JSONEncoder(json.JSONEncoder):
    """The encoder of json.dumps(cls=JSONEncoder) that refuses a Value and points to stringify, as the host encoder cannot
    write the ordered document."""

    def default(self, o):
        if isinstance(o, Value):
            raise _refuse(
                TypeError,
                "host_serialization_refused",
                "Use ordered_json.stringify(value)",
            )
        return super().default(o)


class ParseOptions:
    """The options of a parse: the depth limit and the duplicate-key rule."""

    __slots__ = ("max_depth", "reject_duplicates")

    def __init__(self, max_depth: int = MAX_DEPTH, reject_duplicates: bool = False):
        if isinstance(max_depth, bool) or not isinstance(max_depth, int):
            raise _refuse(
                TypeError, "depth_limit_out_of_range", "max_depth must be an integer"
            )
        if not 0 <= max_depth <= MAX_DEPTH:
            raise _refuse(
                ValueError,
                "depth_limit_out_of_range",
                f"max_depth must be between 0 and {MAX_DEPTH}",
            )
        if not isinstance(reject_duplicates, bool):
            raise _refuse(
                TypeError,
                "invalid_argument_type",
                "reject_duplicates must be a boolean",
            )
        self.max_depth = max_depth
        self.reject_duplicates = reject_duplicates

    def __repr__(self) -> str:
        return (
            f"ParseOptions(max_depth={self.max_depth}, "
            f"reject_duplicates={self.reject_duplicates})"
        )


def _expand(text: str) -> list[int]:
    """The UTF-16 code units of `text`; a character above the basic
    multilingual plane becomes its surrogate pair."""
    units: list[int] = []
    for character in text:
        point = ord(character)
        if point > 0xFFFF:
            point -= 0x10000
            units.append(0xD800 | (point >> 10))
            units.append(0xDC00 | (point & 0x3FF))
        else:
            units.append(point)
    return units


def _combine(units: Iterable[int]) -> str:
    """The text of UTF-16 code units; a surrogate pair becomes one
    character and an unpaired surrogate stays as its own character."""
    characters: list[str] = []
    items = list(units)
    index = 0
    while index < len(items):
        unit = items[index]
        if (
            0xD800 <= unit <= 0xDBFF
            and index + 1 < len(items)
            and 0xDC00 <= items[index + 1] <= 0xDFFF
        ):
            characters.append(
                chr(0x10000 + ((unit - 0xD800) << 10) + items[index + 1] - 0xDC00)
            )
            index += 2
        else:
            characters.append(chr(unit))
            index += 1
    return "".join(characters)


def _listed(values: object, what: str) -> list:
    """The items of an iterable argument; another argument is refused."""
    if isinstance(values, (str, bytes)) or not isinstance(values, Iterable):
        raise _refuse(
            TypeError, "invalid_argument_type", f"Expected an iterable of {what}"
        )
    return list(values)


def _validated_units(units: Iterable[int]) -> list[int]:
    items = _listed(units, "UTF-16 code units")
    for unit in items:
        if (
            isinstance(unit, bool)
            or not isinstance(unit, int)
            or not 0 <= unit <= 0xFFFF
        ):
            raise _refuse(ValueError, "invalid_code_unit", "Expected UTF-16 code units")
    return items


def _quote_units(units: Iterable[int]) -> bytes:
    """The string token of the units with the constructor spelling."""
    out = [b'"']
    for unit in _validated_units(units):
        if unit == 34:
            out.append(b'\\"')
        elif unit == 92:
            out.append(b"\\\\")
        elif unit == 8:
            out.append(b"\\b")
        elif unit == 12:
            out.append(b"\\f")
        elif unit == 10:
            out.append(b"\\n")
        elif unit == 13:
            out.append(b"\\r")
        elif unit == 9:
            out.append(b"\\t")
        elif 0x20 <= unit <= 0x7E:
            out.append(bytes((unit,)))
        else:
            out.append(b"\\u%04x" % unit)
    out.append(b'"')
    return b"".join(out)


def _token_text(token: bytes) -> str:
    """The decoded text of a validated string token, quotes included: its UTF-8 content, or with
    escapes the decoding of the standard library's json scanner, which combines a surrogate pair and
    keeps an unpaired surrogate as its own character."""
    if b"\\" not in token:
        return token[1:-1].decode("utf-8")
    return _scanstring(token.decode("utf-8"), 1)[0]


def _token_units(content: bytes) -> list[int]:
    """The UTF-16 code units of a validated string token's contents; an
    escape contributes its unit without combining a pair."""
    units: list[int] = []
    offset = 0
    while True:
        slash = content.find(b"\\", offset)
        if slash < 0:
            break
        if slash > offset:
            units.extend(_expand(content[offset:slash].decode("utf-8")))
        escape = content[slash + 1]
        if escape == 0x75:
            units.append(int(content[slash + 2 : slash + 6], 16))
            offset = slash + 6
        else:
            units.append(_ESCAPED_UNITS[escape])
            offset = slash + 2
    if offset < len(content):
        units.extend(_expand(content[offset:].decode("utf-8")))
    return units


class Value:
    """An immutable JSON value. Objects keep the first position of each
    key with its last value; factories validate through the parser."""

    __slots__ = (
        "_source",
        "_start",
        "_end",
        "_kind",
        "_root",
        "_compact",
        "_members",
        "_key_starts",
        "_items",
    )

    def __init__(self, token=None):
        if token is not _INTERNAL:
            raise _refuse(
                TypeError,
                "direct_construction",
                "Use parse(), parse_bytes() or the Value factories",
            )

    @property
    def kind(self) -> Kind:
        """The kind of the value: Kind.Object, Kind.Array, Kind.String, Kind.Number, Kind.Boolean or Kind.Null."""
        return Kind(self._kind)

    @property
    def raw(self) -> str:
        """The source text of the value; the root keeps surrounding whitespace."""
        if self._root:
            return self._source.decode("utf-8")
        return self._source[self._start : self._end].decode("utf-8")

    def members(self) -> Mapping[str, "Value"]:
        """A read-only copy of the members keyed by decoded name, in the
        order of each key's first occurrence."""
        self._expect("object")
        return MappingProxyType(dict(self._members))

    def items(self) -> tuple["Value", ...]:
        """The array elements in document order."""
        self._expect("array")
        return self._items

    def string_value(self) -> str:
        """The decoded text; a surrogate pair is one character and an
        unpaired surrogate stays as its own character."""
        self._expect("string")
        return _token_text(self._source[self._start : self._end])

    def string_units(self) -> list[int]:
        """The UTF-16 code units, including escaped unpaired surrogates."""
        self._expect("string")
        return _token_units(self._content())

    def number_literal(self) -> str:
        """The number token text without surrounding whitespace."""
        self._expect("number")
        return self._source[self._start : self._end].decode("utf-8")

    def boolean_value(self) -> bool:
        self._expect("boolean")
        return self._source[self._start : self._start + 1] == b"t"

    def get(self, key: str) -> "Value | None":
        """The member of the decoded key, or None on a miss."""
        if not isinstance(key, str):
            raise _refuse(TypeError, "non_string_key", "Key must be a string")
        self._expect("object")
        return self._members.get(_combine(_expand(key)))

    def get_units(self, units: Iterable[int]) -> "Value | None":
        """The member of the key spelled by UTF-16 code units, or None."""
        self._expect("object")
        return self._members.get(_combine(_validated_units(units)))

    def compact(self) -> str:
        """The serialization without insignificant whitespace; scalar
        tokens and the first spelling of each key are preserved."""
        return _write(self).decode("utf-8")

    @staticmethod
    def string(text: str) -> "Value":
        if not isinstance(text, str):
            raise _refuse(TypeError, "invalid_argument_type", "Expected string")
        return parse_bytes(_quote_units(_expand(text)))

    @staticmethod
    def from_units(units: Iterable[int]) -> "Value":
        token = (
            b'"'
            + b"".join(b"\\u%04x" % unit for unit in _validated_units(units))
            + b'"'
        )
        return parse_bytes(token)

    @staticmethod
    def number(literal: str) -> "Value":
        if not isinstance(literal, str):
            raise _refuse(
                TypeError, "invalid_argument_type", "Pass a number literal as a string"
            )
        value = parse(literal)
        if value._kind != "number":
            raise _refuse(
                ValueError,
                "invalid_number_literal",
                f"Expected a number literal, got {value._kind}",
            )
        if literal.strip() != literal:
            raise _refuse(
                ValueError,
                "invalid_number_literal",
                "Number literal cannot contain whitespace",
            )
        return value

    @staticmethod
    def boolean(flag: bool) -> "Value":
        if not isinstance(flag, bool):
            raise _refuse(TypeError, "invalid_argument_type", "Expected boolean")
        return parse_bytes(b"true" if flag else b"false")

    @staticmethod
    def null() -> "Value":
        return parse_bytes(b"null")

    @staticmethod
    def array(items: Iterable["Value"]) -> "Value":
        values = _listed(items, "values")
        for item in values:
            _expect_value(item)
        return parse_bytes(b"[" + b",".join(_write(value) for value in values) + b"]")

    @staticmethod
    def object(entries) -> "Value":
        pairs = (
            entries.items()
            if isinstance(entries, Mapping)
            else _listed(entries, "entries")
        )
        parts = []
        for entry in pairs:
            pair = (
                _listed(entry, "a key and a value")
                if not isinstance(entry, tuple)
                else list(entry)
            )
            if len(pair) != 2:
                raise _refuse(
                    TypeError,
                    "invalid_argument_type",
                    "Expected an entry of a key and a value",
                )
            key, value = pair
            if isinstance(key, Value) and key._kind == "string":
                token = _write(key)
            elif isinstance(key, str):
                token = _quote_units(_expand(key))
            else:
                raise _refuse(TypeError, "non_string_key", "Key must be a string")
            _expect_value(value)
            parts.append(token + b":" + _write(value))
        return parse_bytes(b"{" + b",".join(parts) + b"}")

    def _content(self) -> bytes:
        return self._source[self._start + 1 : self._end - 1]

    def _expect(self, kind: str) -> None:
        if self._kind != kind:
            raise _refuse(TypeError, "wrong_kind", f"Expected {kind}, got {self._kind}")


def _expect_value(value: object) -> None:
    if not isinstance(value, Value):
        raise _refuse(
            TypeError, "invalid_argument_type", "Expected a polyspec.ordered_json Value"
        )


def _write(value: Value, out: list[bytes] | None = None) -> bytes:
    """The serialization of the value; a compact value is its source token."""
    if value._compact:
        return value._source[value._start : value._end]
    parts: list[bytes] = []
    if value._kind == "object":
        parts.append(b"{")
        separator = b""
        for name, member in value._members.items():
            parts.append(separator)
            separator = b","
            start = value._key_starts[name]
            end = _STRING_TOKEN.match(value._source, start).end()
            parts.append(value._source[start:end])
            parts.append(b":")
            parts.append(_write(member))
        parts.append(b"}")
    else:
        parts.append(b"[")
        separator = b""
        for item in value._items:
            parts.append(separator)
            separator = b","
            parts.append(_write(item))
        parts.append(b"]")
    return b"".join(parts)


class _Frame:
    """An open container of the scanner: its kind, its first byte, the members or items read so far,
    and the whitespace and repeated keys of the document before it, which decide whether its source
    token is its compact form."""

    __slots__ = (
        "is_object",
        "start",
        "members",
        "key_starts",
        "items",
        "whitespace",
        "duplicates",
        "name",
        "key",
    )

    def __init__(self, is_object: bool, start: int, whitespace: int, duplicates: int):
        self.is_object = is_object
        self.start = start
        self.members: dict[str, Value] = {}
        self.key_starts: dict[str, int] = {}
        self.items: list[Value] = []
        self.whitespace = whitespace
        self.duplicates = duplicates
        self.name = ""
        self.key = 0


class _Parser:
    """The scanner: one pass of the tokenizer over the document, one match per member, item or root
    value, with an explicit stack of open containers. A match that fails is analysed piece by piece
    with the same grammar, which names the first byte that breaks it. Its rejections match the
    shared contract."""

    def __init__(self, source: bytes, options: ParseOptions):
        self.source = source
        self.length = len(source)
        self.max_depth = options.max_depth
        self.reject_duplicates = options.reject_duplicates
        self.whitespace = 0
        self.duplicates = 0

    def parse(self) -> Value:
        # The strict UTF-8 codec of the standard library validates the document; the start of its
        # error is the offset of the first byte of the first invalid sequence.
        try:
            self.source.decode("utf-8")
        except UnicodeDecodeError as error:
            raise ParseError("invalid_utf8", error.start) from error
        source, ws_run = self.source, _WS_RUN.match
        member, item, reject = _MEMBER.match, _ITEM.match, self.reject_duplicates
        stack: list[_Frame] = []
        found = _ROOT.match(source, 0)
        if found is None:
            self._value_error(0)
        delimiter = None
        if found.start("c") >= 0:
            self.whitespace += found.start("c")
            value, pos = self._open(stack, found.start("c"))
        else:
            self.whitespace += found.start("v")
            value, pos = self._scalar(found, found.start("v"))
        while True:
            if value is not None:
                # A complete value: add it to its container, then close every container that the
                # delimiters end.
                while True:
                    if not stack:
                        end = ws_run(source, pos).end()
                        if end != self.length:
                            raise ParseError("trailing_input", end)
                        value._root = True
                        return value
                    frame = stack[-1]
                    if frame.is_object:
                        name = frame.name
                        if name in frame.members:
                            self.duplicates += 1
                        else:
                            frame.key_starts[name] = frame.key
                        frame.members[name] = value
                    else:
                        frame.items.append(value)
                    if delimiter is None:
                        following = _DELIMITER.match(source, pos)
                        if following is None:
                            raise ParseError(
                                "expected_delimiter", ws_run(source, pos).end()
                            )
                        self.whitespace += following.start("d") - pos
                        delimiter, pos = following.group("d"), following.end()
                    if delimiter == b",":
                        delimiter = None
                        break
                    if delimiter != (b"}" if frame.is_object else b"]"):
                        raise ParseError("expected_delimiter", pos - 1)
                    value, delimiter = self._close(stack.pop(), pos, not stack), None
                value = None
            # The members or items of the open container from pos, until a container value opens or
            # a closing bracket completes this container.
            frame = stack[-1]
            if frame.is_object:
                members, key_starts = frame.members, frame.key_starts
                while True:
                    found = member(source, pos)
                    if found is None:
                        self._member_error(frame, pos)
                    key_start, key_end = found.span("k")
                    content = source[key_start + 1 : key_end - 1]
                    if 0x5C in content:
                        name = _token_text(source[key_start:key_end])
                    else:
                        name = content.decode("utf-8")
                    if reject and name in members:
                        raise ParseError("duplicate_object_key", key_start)
                    last = found.lastindex
                    if last == _MEMBER_CONTAINER:
                        frame.name = name
                        frame.key = key_start
                        following = found.end()
                        self.whitespace += following - pos - (key_end - key_start) - 2
                        value, pos = self._open(stack, following - 1)
                        break
                    start, end = found.span("v")
                    value = self._nested_scalar(
                        found, start, end, last != _MEMBER_DELIMITER
                    )
                    following = found.end()
                    spaces = following - pos - (key_end - key_start) - (end - start) - 2
                    if spaces:
                        self.whitespace += spaces
                    pos = following
                    if name in members:
                        self.duplicates += 1
                    else:
                        key_starts[name] = key_start
                    members[name] = value
                    if source[following - 1] == 0x2C:
                        continue
                    value, delimiter = self._close(stack.pop(), pos, not stack), None
                    break
            else:
                items = frame.items
                while True:
                    found = item(source, pos)
                    if found is None:
                        self._value_error(pos)
                    last = found.lastindex
                    if last == _ITEM_CONTAINER:
                        following = found.end()
                        self.whitespace += following - pos - 1
                        value, pos = self._open(stack, following - 1)
                        break
                    start, end = found.span("v")
                    value = self._nested_scalar(
                        found, start, end, last != _ITEM_DELIMITER
                    )
                    following = found.end()
                    spaces = following - pos - (end - start) - 1
                    if spaces:
                        self.whitespace += spaces
                    pos = following
                    items.append(value)
                    if source[following - 1] == 0x2C:
                        continue
                    value, delimiter = self._close(stack.pop(), pos, not stack), None
                    break

    def _open(self, stack: list[_Frame], start: int) -> tuple["Value | None", int]:
        """Opens the container whose bracket is at start. Returns the empty container closed at once
        with the position after it, or None with the position after the bracket."""
        source = self.source
        if len(stack) >= self.max_depth:
            raise ParseError("maximum_depth_exceeded", start)
        frame = _Frame(source[start] == 0x7B, start, self.whitespace, self.duplicates)
        stack.append(frame)
        after = _WS_RUN.match(source, start + 1).end()
        if source[after : after + 1] != (b"}" if frame.is_object else b"]"):
            return None, start + 1
        self.whitespace += after - start - 1
        return self._close(stack.pop(), after + 1, not stack), after + 1

    def _nested_scalar(
        self, found: re.Match, start: int, end: int, undelimited: bool
    ) -> "Value":
        """The scalar value of a member or an item between start and end; undelimited is a scalar that no
        delimiter follows."""
        source = self.source
        kind = _SCALAR_KINDS[source[start]]
        if kind == "number" and _STRICT_NUMBER.fullmatch(source, start, end) is None:
            self._number_check(found, start)
        value = Value.__new__(Value)
        value._source = source
        value._start = start
        value._end = end
        value._kind = kind
        value._compact = True
        value._root = False
        if undelimited:
            raise ParseError("expected_delimiter", _WS_RUN.match(source, end).end())
        return value

    def _scalar(self, found: re.Match, start: int) -> tuple["Value", int]:
        """The scalar value of the root token that found matched from start, and its end."""
        end = found.end("v")
        kind = _SCALAR_KINDS[self.source[start]]
        if kind == "number":
            self._number_check(found, start)
        value = Value(_INTERNAL)
        value._source = self.source
        value._start = start
        value._end = end
        value._kind = kind
        value._compact = True
        value._root = False
        return value, end

    def _close(self, frame: _Frame, end: int, root: bool) -> Value:
        value = Value(_INTERNAL)
        value._source = self.source
        value._start = frame.start
        value._end = end
        value._kind = "object" if frame.is_object else "array"
        value._root = root
        value._compact = (
            self.whitespace == frame.whitespace and self.duplicates == frame.duplicates
        )
        value._members = frame.members
        value._key_starts = frame.key_starts
        value._items = tuple(frame.items)
        return value

    def _member_error(self, frame: _Frame, pos: int) -> None:
        """Rejects the member at pos that _MEMBER does not match: its name, colon and value in turn."""
        source = self.source
        start = _WS_RUN.match(source, pos).end()
        if source[start : start + 1] != b'"':
            raise ParseError("expected_object_key", start)
        found = _STRING_TOKEN.match(source, start)
        if found is None:
            self._string_error(start)
        if (
            self.reject_duplicates
            and _token_text(source[start : found.end()]) in frame.members
        ):
            raise ParseError("duplicate_object_key", start)
        colon = _WS_RUN.match(source, found.end()).end()
        if source[colon : colon + 1] != b":":
            raise ParseError("expected_colon", colon)
        self._value_error(colon + 1)

    def _value_error(self, pos: int) -> None:
        """Rejects the value at pos that the tokenizer does not match."""
        start = _WS_RUN.match(self.source, pos).end()
        if _VALUE.match(self.source, start) is not None:
            raise AssertionError(
                f"the tokenizer and its pieces disagree at byte {start}"
            )
        if self.source[start : start + 1] == b'"':
            self._string_error(start)
        raise ParseError("expected_value", start)

    def _string_error(self, pos: int) -> None:
        """Rejects the string token at pos that _STRING does not match: its body pieces run to the
        byte that breaks them."""
        source, length = self.source, self.length
        stop = _BODY_RUN.match(source, pos + 1).end()
        if stop >= length:
            raise ParseError("unterminated_string", length)
        if source[stop] != 0x5C:
            raise ParseError("unescaped_control_character", stop)
        if stop + 1 >= length:
            raise ParseError("unfinished_escape", stop + 1)
        if source[stop + 1 : stop + 2] == b"u":
            raise ParseError(
                "invalid_unicode_escape", _HEX_RUN.match(source, stop + 2).end()
            )
        if _SIMPLE_ESCAPE_BYTE.match(source, stop + 1) is None:
            raise ParseError("invalid_escape", stop + 1)
        raise AssertionError(f"_STRING and its pieces disagree at byte {stop}")

    def _number_check(self, found: re.Match, start: int) -> None:
        """Rejects a number token of _NUMBER whose integer, fraction or exponent has no digit, at
        the first missing digit."""
        integer, fraction, exponent = found.group("int", "frac", "exp")
        if integer is None:
            raise ParseError(
                "expected_digit", start + (self.source[start : start + 1] == b"-")
            )
        if (
            fraction is not None
            and _DIGIT_BYTE.match(fraction, len(fraction) - 1) is None
        ):
            raise ParseError("expected_digit", found.end("frac"))
        if (
            exponent is not None
            and _DIGIT_BYTE.match(exponent, len(exponent) - 1) is None
        ):
            raise ParseError("expected_digit", found.end("exp"))


def _parse_bytes(data: bytes, options: ParseOptions) -> Value:
    return _Parser(data, options).parse()


def parse(source: str, options: ParseOptions | None = None) -> Value:
    """Parses JSON text; a literal unpaired surrogate of the text is
    rejected at its byte position."""
    if not isinstance(source, str):
        raise _refuse(TypeError, "invalid_argument_type", "Expected JSON text")
    settings = _settings(options)
    try:
        data = source.encode("utf-8")
    except UnicodeEncodeError as error:
        prefix = source[: error.start].encode("utf-8")
        raise ParseError("unescaped_lone_surrogate", len(prefix)) from None
    return _parse_bytes(data, settings)


def parse_bytes(
    data: bytes | bytearray | memoryview, options: ParseOptions | None = None
) -> Value:
    """Parses a UTF-8 byte document."""
    if not isinstance(data, (bytes, bytearray, memoryview)):
        raise _refuse(TypeError, "invalid_argument_type", "Expected UTF-8 bytes")
    return _parse_bytes(bytes(data), _settings(options))


def stringify(value: Value) -> str:
    """Serializes without insignificant whitespace, preserving scalar
    tokens and the first spelling of each key."""
    _expect_value(value)
    return _write(value).decode("utf-8")


def _settings(options: ParseOptions | None) -> ParseOptions:
    if options is None:
        return ParseOptions()
    if not isinstance(options, ParseOptions):
        raise _refuse(TypeError, "invalid_argument_type", "Expected ParseOptions")
    return options
