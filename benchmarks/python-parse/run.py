#!/usr/bin/env python3
"""The parse ratio of the Python binding against the PHP binding (make python-parse-budget), a performance check that a
person runs; it is no unit test and no target of make check. Both bindings parse with the same core, so the ratio compares
the conversion layer of Python with that of PHP over the same core (T3.25-3), each a release build with the same features
(T3.53: the wheel of make binding-python-release-package).

Both parse one generated document of 50,000 flat objects of eight members each (6.15 MB) in their own process, interleaved
Python, PHP, Python, PHP, three runs each. Each process measures the CPU time of its own parse (time.process_time in Python,
getrusage in PHP), so the load of the machine slows both sides alike and no wall-clock budget exists. The check prints every
run, both medians and their ratio, and warns when the Python median exceeds three times the PHP median; it never fails."""

from pathlib import Path
import statistics
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
RATIO = 3.0
RUNS = 3
ROWS = 50000
PYTHON_RUN = Path(__file__).with_name("parse.py")
PHP_RUN = Path(__file__).with_name("parse.php")
# The release library of the binding extension that make binding-php-ext-release-library builds.
PHP_EXTENSION = (
    ROOT
    / "target/release"
    / ("libpolyspec_json.dylib" if sys.platform == "darwin" else "libpolyspec_json.so")
)
# The interpreter of the venv of make binding-python-release-package, which holds the release wheel of the Python binding
# (T3.53): the venv of the tests holds a debug wheel, which maturin builds without --release.
PYTHON = ROOT / "var/bindings/venv-release/bin/python"


def document(rows=ROWS):
    """The generated document: an array of flat objects with numbers, strings, booleans, null and a small array."""
    items = ",".join(
        f'{{"id":{i},"name":"row {i}","price":{i}.25,"active":{"true" if i % 2 == 0 else "false"},'
        f'"note":null,"tags":["a","b"],"code":"C{i:06d}","score":{i * 3}}}'
        for i in range(rows)
    )
    return f"[{items}]".encode("utf-8")


def measure(label, command):
    """The CPU seconds that one parse process reports; a failed process fails the check with its output."""
    process = subprocess.run(command, capture_output=True, text=True)
    if process.returncode:
        raise SystemExit(
            f"{label}: {' '.join(command)} exited with {process.returncode}:\n{process.stderr or process.stdout}"
        )
    return float(process.stdout.strip())


def main():
    with tempfile.TemporaryDirectory(prefix="ordered-json-parse-") as folder:
        path = Path(folder) / "rows.json"
        path.write_bytes(document())
        python = [
            str(PYTHON),
            str(PYTHON_RUN),
            str(path),
            str(ROWS),
        ]
        php = [
            "php",
            "-n",
            "-d",
            f"extension={PHP_EXTENSION}",
            str(PHP_RUN),
            str(path),
            str(ROWS),
        ]
        times = {"python": [], "php": []}
        for run in range(1, RUNS + 1):
            for label, command in (("python", python), ("php", php)):
                seconds = measure(label, command)
                times[label].append(seconds)
                print(f"run {run}/{RUNS} {label}: {seconds:.3f} s CPU", flush=True)
    medians = {label: statistics.median(values) for label, values in times.items()}
    ratio = medians["python"] / medians["php"]
    print(
        f"median CPU: python {medians['python']:.3f} s, php {medians['php']:.3f} s; ratio {ratio:.2f} (limit {RATIO:.1f})"
    )
    # A ratio above the limit is a warning, no failure: the budget compares the conversion layers of the Python and the PHP
    # bindings over the same core since T3.25-3, and a change of the reason of the limit is a row of its own.
    if ratio > RATIO:
        print(
            f"WARNING: the Python parse takes {ratio:.2f} times the PHP parse, more than {RATIO:.1f}",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
