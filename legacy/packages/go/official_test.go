package orderedjson

import (
	"os"
	"reflect"
	"testing"
)

// The official examples of examples/official.json: each case is the subtest TestOfficial/<id>.
// A case parses its input and compares the source text, the compact serialization and
// the value tree with the expected results, then the tree of the reparsed serialization and of the value rebuilt
// through the factories (docs/spec/json-contract.md#acceptance). The examples are read with the library: their trees hold
// lone surrogates, which encoding/json replaces, and every string of a tree is compared as its UTF-16 code units.

// Requirements: RQ-022
func TestOfficial(t *testing.T) {
	source, err := os.ReadFile("../../../examples/official.json")
	if err != nil {
		t.Fatal(err)
	}
	official, err := ParseBytes(source)
	if err != nil {
		t.Fatal(err)
	}
	cases, err := official.Get("cases").Items()
	if err != nil {
		t.Fatal(err)
	}
	for _, example := range cases {
		id, err := example.Get("id").StringValue()
		if err != nil {
			t.Fatal(err)
		}
		t.Run(id, func(t *testing.T) {
			input := mustString(t, example.Get("source"))
			compact := mustString(t, example.Get("compact"))
			expected := expectedTree(t, example.Get("tree"))
			value, err := Parse(input)
			if err != nil {
				t.Fatal(err)
			}
			if value.Raw() != input {
				t.Fatalf("Raw() = %q, want %q", value.Raw(), input)
			}
			serialized, err := Stringify(value)
			if err != nil {
				t.Fatal(err)
			}
			if serialized != compact {
				t.Fatalf("Stringify() = %q, want %q", serialized, compact)
			}
			rebuilt, err := Stringify(rebuild(t, value))
			if err != nil {
				t.Fatal(err)
			}
			for name, text := range map[string]string{"input": input, "serialization": serialized, "rebuilt value": rebuilt} {
				parsed, err := Parse(text)
				if err != nil {
					t.Fatalf("%s: %v", name, err)
				}
				if actual := tree(t, parsed); !reflect.DeepEqual(actual, expected) {
					t.Fatalf("the tree of the %s = %v, want %v", name, actual, expected)
				}
			}
		})
	}
}

func mustString(t *testing.T, value *Value) string {
	t.Helper()
	text, err := value.StringValue()
	if err != nil {
		t.Fatal(err)
	}
	return text
}

func mustUnits(t *testing.T, value *Value) []uint16 {
	t.Helper()
	units, err := value.StringUnits()
	if err != nil {
		t.Fatal(err)
	}
	return units
}

func mustItems(t *testing.T, value *Value) []*Value {
	t.Helper()
	items, err := value.Items()
	if err != nil {
		t.Fatal(err)
	}
	return items
}

// tree is the tree of a value, each string as its UTF-16 code units.
func tree(t *testing.T, value *Value) []any {
	t.Helper()
	switch value.Kind() {
	case ObjectKind:
		members, err := value.Members()
		if err != nil {
			t.Fatal(err)
		}
		pairs := []any{}
		for _, key := range members.Keys() {
			units := mustUnits(t, key)
			pairs = append(pairs, []any{units, tree(t, members.GetUnits(units))})
		}
		return []any{"object", pairs}
	case ArrayKind:
		items := []any{}
		for _, item := range mustItems(t, value) {
			items = append(items, tree(t, item))
		}
		return []any{"array", items}
	case StringKind:
		return []any{"string", mustUnits(t, value)}
	case NumberKind:
		literal, err := value.NumberLiteral()
		if err != nil {
			t.Fatal(err)
		}
		return []any{"number", literal}
	case BooleanKind:
		boolean, err := value.BooleanValue()
		if err != nil {
			t.Fatal(err)
		}
		return []any{"boolean", boolean}
	default:
		return []any{"null"}
	}
}

// expectedTree is the expected tree of official.json in the form of tree.
func expectedTree(t *testing.T, value *Value) []any {
	t.Helper()
	parts := mustItems(t, value)
	switch kind := mustString(t, parts[0]); kind {
	case "object":
		pairs := []any{}
		for _, member := range mustItems(t, parts[1]) {
			pair := mustItems(t, member)
			pairs = append(pairs, []any{mustUnits(t, pair[0]), expectedTree(t, pair[1])})
		}
		return []any{"object", pairs}
	case "array":
		items := []any{}
		for _, item := range mustItems(t, parts[1]) {
			items = append(items, expectedTree(t, item))
		}
		return []any{"array", items}
	case "string":
		return []any{"string", mustUnits(t, parts[1])}
	case "number":
		return []any{"number", mustString(t, parts[1])}
	case "boolean":
		boolean, err := parts[1].BooleanValue()
		if err != nil {
			t.Fatal(err)
		}
		return []any{"boolean", boolean}
	default:
		return []any{kind}
	}
}

// rebuild inserts the keys in their first order, then sets the values in reverse order.
func rebuild(t *testing.T, value *Value) *Value {
	t.Helper()
	switch value.Kind() {
	case ObjectKind:
		members, err := value.Members()
		if err != nil {
			t.Fatal(err)
		}
		keys := members.Keys()
		out := &OrderedMap{}
		for _, key := range keys {
			if err := out.Set(key, Null()); err != nil {
				t.Fatal(err)
			}
		}
		for index := len(keys) - 1; index >= 0; index-- {
			if err := out.Set(keys[index], rebuild(t, members.GetUnits(mustUnits(t, keys[index])))); err != nil {
				t.Fatal(err)
			}
		}
		object, err := Object(out)
		if err != nil {
			t.Fatal(err)
		}
		return object
	case ArrayKind:
		items := []*Value{}
		for _, item := range mustItems(t, value) {
			items = append(items, rebuild(t, item))
		}
		array, err := Array(items)
		if err != nil {
			t.Fatal(err)
		}
		return array
	default:
		return value
	}
}
