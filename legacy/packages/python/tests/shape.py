"""Helpers shared by the Python test modules: the value tree of a document and its rebuild through the factories."""

from polyspec.ordered_json import Value


def tree(value):
    if value.kind == "object":
        return [
            "object",
            [[name, tree(member)] for name, member in value.members().items()],
        ]
    if value.kind == "array":
        return ["array", [tree(item) for item in value.items()]]
    if value.kind == "string":
        return ["string", value.string_value()]
    if value.kind == "number":
        return ["number", value.number_literal()]
    if value.kind == "boolean":
        return ["boolean", value.boolean_value()]
    return ["null"]


def rebuild(value):
    """Inserts the keys in their first order, then sets the values in reverse order."""
    if value.kind == "object":
        names = list(value.members())
        entries = [(name, Value.null()) for name in names]
        entries += [(name, rebuild(value.get(name))) for name in reversed(names)]
        return Value.object(entries)
    if value.kind == "array":
        return Value.array([rebuild(item) for item in value.items()])
    return value
