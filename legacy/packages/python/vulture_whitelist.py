# The code that vulture reads as unused and that this package keeps, each with its reason (make lint-python of kit).

# unittest loads the TestCase classes of a test module by name, so no code references them.
Differential  # tests/differential.py

# The factories and accessors of the public API that the package tests and the probe used before they moved to the binding
# (T3.25-2); its consumers use them until the package is removed.
Value.raw
Value.string_value
Value.number_literal
Value.compact
Value.string
Value.number
Value.null
Value.object
Value.string_units
Value.boolean_value
Value.get_units
Value.from_units
Value.boolean
Value.array

# The members of the public enumeration Kind, which callers read and the library names by value.
Kind.Object
Kind.Array
Kind.String
Kind.Number
Kind.Boolean
Kind.Null
