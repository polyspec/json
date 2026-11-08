"""The official examples of examples/official.json (requirement RQ-022), run by unittest.

Each case is the test method test_<id>. A case parses its input
and compares the source text, the compact serialization and the value tree with the expected results, then the tree of the
reparsed serialization and of the value rebuilt through the factories (docs/spec/json-contract.md#acceptance).
"""

import json
import unittest
from pathlib import Path

from polyspec.ordered_json import parse, stringify

from .shape import rebuild, tree

OFFICIAL = json.loads(
    (Path(__file__).resolve().parents[3] / "examples/official.json").read_text(
        encoding="utf-8"
    )
)


class Official(unittest.TestCase):
    def check(self, example):
        value = parse(example["input"])
        self.assertEqual(value.raw, example["input"])
        self.assertEqual(stringify(value), example["compact"])
        self.assertEqual(tree(value), example["tree"])
        self.assertEqual(tree(parse(stringify(value))), example["tree"])
        self.assertEqual(tree(parse(stringify(rebuild(value)))), example["tree"])


def case(example):
    return lambda self: self.check(example)


for example in OFFICIAL["cases"]:
    setattr(Official, f"test_{example['id']}", case(example))
