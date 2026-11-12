# The code that vulture reads as unused and that this package keeps, each with its reason (make lint-python of kit).

# unittest loads the TestCase classes of a test module by name (python -m unittest, as make test-python runs it), so no code
# references them.
StandardCases  # tests/test_api.py
PackageCases  # tests/test_api.py
ErrorKindCases  # tests/test_errors.py

# The members of the public enumeration Kind, which callers read and the library names by value.
Kind.Object
Kind.Array
Kind.String
Kind.Number
Kind.Boolean
Kind.Null
