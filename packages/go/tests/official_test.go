package tests

import (
	"os"
	"reflect"
	"testing"

	json "github.com/polyspec/json/packages/go"
)

// The official examples of examples/official.json: each case is the subtest TestOfficial/<id>.
// A case parses its input and compares the source text, the compact serialization and
// the value tree with the expected results, then the tree of the reparsed serialization and of the value rebuilt
// through the factories (docs/spec/json-contract.md#acceptance). The examples are read with the library: their trees hold
// lone surrogates, which encoding/json replaces, and every string of a tree is compared as its UTF-16 code units. The test
// of the legacy package with no change beyond the changes of packages/rust/interface.json, each named where it applies
// (T3.25).

// Requirements: RQ-022
func TestOfficial(t *testing.T) {
	source, err := os.ReadFile("../../../examples/official.json")
	if err != nil {
		t.Fatal(err)
	}
	// change-parse-source: the one Parse takes the bytes.
	official, err := json.Parse(source, json.ParseOptions{})
	if err != nil {
		t.Fatal(err)
	}
	cases, err := member(t, official, "cases").Items()
	if err != nil {
		t.Fatal(err)
	}
	for _, example := range cases {
		id, err := member(t, example, "id").StringValue()
		if err != nil {
			t.Fatal(err)
		}
		t.Run(id, func(t *testing.T) {
			input := mustString(t, member(t, example, "source"))
			written := mustString(t, member(t, example, "compact"))
			expected := expectedTree(t, member(t, example, "tree"))
			value, err := parse(input)
			if err != nil {
				t.Fatal(err)
			}
			if raw := must(value.Raw()); raw != input {
				t.Fatalf("Raw() = %q, want %q", raw, input)
			}
			serialized, err := compact(value)
			if err != nil {
				t.Fatal(err)
			}
			if serialized != written {
				t.Fatalf("Stringify() = %q, want %q", serialized, written)
			}
			rebuilt, err := compact(rebuild(t, value))
			if err != nil {
				t.Fatal(err)
			}
			for name, text := range map[string]string{"input": input, "serialization": serialized, "rebuilt value": rebuilt} {
				parsed, err := parse(text)
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

// member is the member name of an object, which the test expects (change-accessors: a lookup has an error result).
func member(t *testing.T, value *json.Value, name string) *json.Value {
	t.Helper()
	child, err := value.Get(name)
	if err != nil || child == nil {
		t.Fatalf("Get(%q) = %v, %v", name, child, err)
	}
	return child
}

// entries holds the members of an object in their order, each as its key and its value (change-ordered-map: the keys of an
// OrderedMap are values, which Entries gives with their values).
func entries(t *testing.T, value *json.Value) [][2]*json.Value {
	t.Helper()
	members, err := value.Members()
	if err != nil {
		t.Fatal(err)
	}
	sequence, err := members.Entries()
	if err != nil {
		t.Fatal(err)
	}
	pairs := [][2]*json.Value{}
	for key, child := range sequence {
		pairs = append(pairs, [2]*json.Value{key, child})
	}
	return pairs
}

func mustString(t *testing.T, value *json.Value) string {
	t.Helper()
	text, err := value.StringValue()
	if err != nil {
		t.Fatal(err)
	}
	return text
}

func mustUnits(t *testing.T, value *json.Value) []uint64 {
	t.Helper()
	units, err := value.StringUnits()
	if err != nil {
		t.Fatal(err)
	}
	return units
}

func mustItems(t *testing.T, value *json.Value) []*json.Value {
	t.Helper()
	items, err := value.Items()
	if err != nil {
		t.Fatal(err)
	}
	return items
}

// tree is the tree of a value, each string as its UTF-16 code units.
func tree(t *testing.T, value *json.Value) []any {
	t.Helper()
	// change-kind-enum: the kinds are the constants Kind<Name> of the enum Kind.
	switch must(value.Kind()) {
	case json.KindObject:
		pairs := []any{}
		for _, entry := range entries(t, value) {
			pairs = append(pairs, []any{mustUnits(t, entry[0]), tree(t, entry[1])})
		}
		return []any{"object", pairs}
	case json.KindArray:
		items := []any{}
		for _, item := range mustItems(t, value) {
			items = append(items, tree(t, item))
		}
		return []any{"array", items}
	case json.KindString:
		return []any{"string", mustUnits(t, value)}
	case json.KindNumber:
		literal, err := value.NumberLiteral()
		if err != nil {
			t.Fatal(err)
		}
		return []any{"number", literal}
	case json.KindBoolean:
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
func expectedTree(t *testing.T, value *json.Value) []any {
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
func rebuild(t *testing.T, value *json.Value) *json.Value {
	t.Helper()
	switch must(value.Kind()) {
	case json.KindObject:
		pairs := entries(t, value)
		// change-ordered-map: an object takes an OrderedMap whose keys are values.
		out := must(json.NewOrderedMap())
		for _, entry := range pairs {
			if _, err := out.Insert(entry[0], must(json.ValueNull())); err != nil {
				t.Fatal(err)
			}
		}
		for index := len(pairs) - 1; index >= 0; index-- {
			if _, err := out.Insert(pairs[index][0], rebuild(t, pairs[index][1])); err != nil {
				t.Fatal(err)
			}
		}
		object, err := json.ValueObject(out)
		if err != nil {
			t.Fatal(err)
		}
		return object
	case json.KindArray:
		items := []*json.Value{}
		for _, item := range mustItems(t, value) {
			items = append(items, rebuild(t, item))
		}
		array, err := json.ValueArray(items)
		if err != nil {
			t.Fatal(err)
		}
		return array
	default:
		return value
	}
}
