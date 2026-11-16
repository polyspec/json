# The code that vulture reads as unused and that this package keeps, each with its reason (make lint-python of kit).

# unittest loads the TestCase classes of a test module by name (python -m unittest, as make test-python runs it), so no code
# references them.
StandardCases  # tests/test_api.py
PackageCases  # tests/test_api.py
ErrorKindCases  # tests/test_errors.py
