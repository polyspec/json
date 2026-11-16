"""The differential test of the two Python implementations (make test-differential-python).

Requirements: V-6 (5) of docs/spec/json-contract.md#transition (T3.25-2). Every file of test_parsing of the supplementary suite
as bytes and every source of examples/official.json parse in this legacy package and in the binding polyspec.json, both
installed in the interpreter that runs this file, and each gives the same outcome in both: the same compact serialization, or a
rejection of the same kind at the same byte offset. A difference fails, since none has a verdict. It is no test of
make test-python, which discovers the files test_*.py.
"""

import json
import os
import unittest
from pathlib import Path

import polyspec.json as binding
import polyspec.ordered_json as legacy

ROOT = Path(__file__).resolve().parents[4]

SUITE = os.environ.get("JSON_TEST_SUITE")


def outcome(run):
    """The compact text that `run` returns, or the kind and offset of the rejection that it raises."""
    try:
        return ("text", run())
    except (legacy.ParseError, binding.ParseError) as error:
        return ("rejection", str(error.kind), error.offset)


class Differential(unittest.TestCase):
    def test_parsing(self):
        self.assertTrue(
            SUITE,
            "JSON_TEST_SUITE names the installed supplementary suite (make json-install-suite)",
        )
        parsing = Path(SUITE) / "test_parsing"
        for path in sorted(parsing.iterdir()):
            data = path.read_bytes()
            with self.subTest(file=path.name):
                self.assertEqual(
                    outcome(lambda: binding.stringify(binding.parse(data))),
                    outcome(lambda: legacy.stringify(legacy.parse_bytes(data))),
                )

    def test_official(self):
        official = json.loads(
            (ROOT / "examples/official.json").read_text(encoding="utf-8")
        )
        for example in official["cases"]:
            with self.subTest(case=example["id"]):
                self.assertEqual(
                    outcome(
                        lambda: binding.stringify(binding.parse(example["source"]))
                    ),
                    outcome(lambda: legacy.stringify(legacy.parse(example["source"]))),
                )


if __name__ == "__main__":
    unittest.main()
