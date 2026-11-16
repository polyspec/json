"""One parse of the document of argv[1] with the Python binding polyspec.json of this checkout; prints the CPU seconds of
the parse. benchmarks/python-parse/run.py starts it with the interpreter of the venv of make binding-python-package, where
it is installed (T3.25-2)."""

from pathlib import Path
import sys
import time

from polyspec.json import parse

data = Path(sys.argv[1]).read_bytes()
started = time.process_time()
value = parse(data)
elapsed = time.process_time() - started
if len(value.items()) != int(sys.argv[2]):
    raise SystemExit(f"parsed {len(value.items())} items, not {sys.argv[2]}")
print(f"{elapsed:.6f}")
