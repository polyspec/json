#!/usr/bin/env python3
"""The parse ratio of the Python package against the pure PHP package (make python-parse-budget), a performance check that
a person runs; it is no unit test and no target of make check.

Both parse one generated document of 50,000 flat objects of eight members each (6.15 MB) in their own process, interleaved
Python, PHP, Python, PHP, three runs each. Each process measures the CPU time of its own parse (time.process_time in Python,
getrusage in PHP), so the load of the machine slows both sides alike and no wall-clock budget exists. The check prints every
run, both medians and their ratio, and fails when the Python median exceeds three times the PHP median."""

from pathlib import Path
import json
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
# The implementations of config/implementations.json, the one declaration of their folders and of the interpreter of the Python
# package (its venv, which make ordered-json-install-python makes).
IMPLEMENTATIONS = {
    item["name"]: item
    for item in json.loads((ROOT / "config/implementations.json").read_text())["implementations"]
}


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
            str(ROOT / IMPLEMENTATIONS["python"]["command"]),
            str(PYTHON_RUN),
            str(path),
            str(ROWS),
        ]
        php = [
            "php",
            "-n",
            str(PHP_RUN),
            str(ROOT / IMPLEMENTATIONS["php"]["roots"][0]),
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
    if ratio > RATIO:
        print(
            f"the Python parse takes {ratio:.2f} times the PHP parse, more than {RATIO:.1f}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
