#!/usr/bin/env python3
"""Adapter of the shared verifier.

Reads a document path on each input line and answers one JSON line per
document. No test cases or expectations live here; the common verifier
supplies the documents. The probe of the binding polyspec.json, the probe of
the legacy package with no change beyond the changes of
packages/rust/interface.json, each named where it applies (T3.25-2).
"""

import json
import sys
from pathlib import Path

from polyspec.json import OrderedMap, ParseError, Value, parse, stringify
from shape import rebuild, tree

# The calls of an argument request {"call": call, "argument": argument} of the shared verifier.
CALLS = {
    "number": lambda argument: Value.number(argument.string_value()),
    # change-parse-options: the options of parse are its keyword arguments.
    "max_depth": lambda argument: parse("1", max_depth=int(argument.number_literal())),
    "string_value": lambda argument: argument.string_value(),
    # change-ordered-map: an object takes an OrderedMap whose keys are values.
    "object_key": lambda argument: OrderedMap().insert(argument, Value.null()),
}


def call(line):
    request = parse(line)
    try:
        CALLS[request.get("call").string_value()](request.get("argument"))
    except (TypeError, ValueError) as error:
        if not isinstance(getattr(error, "kind", None), str):
            raise
        return {"ok": False, "kind": error.kind}
    return {"ok": True}


for line in sys.stdin:
    if line.startswith("{"):
        print(json.dumps(call(line.rstrip("\r\n"))), flush=True)
        continue
    data = Path(line.rstrip("\r\n")).read_bytes()
    # change-parse-source: parse takes the bytes.
    try:
        value = parse(data)
    except ParseError as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "offset": error.offset,
                    "unit": "byte",
                    "kind": error.kind,
                }
            ),
            flush=True,
        )
        continue
    serialized = stringify(value)
    roundtrip = parse(serialized.encode("utf-8"))
    factory = stringify(Value.string('quote " slash \\ line\n 한 🌍'))
    print(
        json.dumps(
            {
                "ok": True,
                "raw": value.raw,
                "serialized": serialized,
                # change-stringify: stringify is the one serializer.
                "compact": stringify(value),
                "tree": tree(value),
                "roundtrip": stringify(roundtrip),
                "roundtrip_tree": tree(roundtrip),
                "rebuilt": stringify(rebuild(value)),
                "factory": factory,
            }
        ),
        flush=True,
    )
