"""Helpers shared by the Python test modules: the value tree of a document and its rebuild through the factories.

change-accessors and change-ordered-map: the members of an object are an OrderedMap whose keys are values, and an object
takes an OrderedMap. change-string-value: a string with an unpaired surrogate has no Unicode text, so the tree reads its code
units.
"""

from polyspec.json import OrderedMap, Value


def text(value):
    """The text of a string value, a pair decoded and an unpaired surrogate kept as its code unit."""
    units = b"".join(unit.to_bytes(2, "little") for unit in value.string_units())
    return units.decode("utf-16-le", "surrogatepass")


def tree(value):
    if value.kind == "object":
        return [
            "object",
            [[text(key), tree(member)] for key, member in value.members().items()],
        ]
    if value.kind == "array":
        return ["array", [tree(item) for item in value.items()]]
    if value.kind == "string":
        return ["string", text(value)]
    if value.kind == "number":
        return ["number", value.number_literal()]
    if value.kind == "boolean":
        return ["boolean", value.boolean_value()]
    return ["null"]


def rebuild(value):
    """Inserts the keys in their first order, then sets the values in reverse order."""
    if value.kind == "object":
        keys = list(value.members())
        members = OrderedMap()
        for key in keys:
            members.insert(key, Value.null())
        for key in reversed(keys):
            members.insert(key, rebuild(value.get_units(key.string_units())))
        return Value.object(members)
    if value.kind == "array":
        return Value.array([rebuild(item) for item in value.items()])
    return value
