// Package differential is the differential test of the legacy Go package and the binding (make test-differential-go).
//
// Requirements: V-6 (5) of docs/spec/json-contract.md#transition (T3.25-4). Every file of test_parsing of the
// supplementary suite and every source of examples/official.json parse in the legacy package orderedjson and in the
// binding json, and each gives the same outcome in both: the same compact serialization, or a rejection of the same kind
// at the same byte offset. A difference fails, since none has a verdict.
package differential

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	json "github.com/polyspec/json/packages/go"
	jsonerrors "github.com/polyspec/json/packages/go/errors"
	orderedjson "github.com/polyspec/ordered-json/packages/go"
)

// legacyOutcome is the compact text of source in the legacy package, or the kind and the offset of its rejection.
func legacyOutcome(source []byte) string {
	value, err := orderedjson.ParseBytes(source)
	if err == nil {
		text, err := orderedjson.Stringify(value)
		if err == nil {
			return "text " + text
		}
	}
	var failure orderedjson.Error
	if errors.As(err, &failure) {
		return fmt.Sprintf("rejection %s %d", failure.Kind(), failure.Offset())
	}
	return "error " + err.Error()
}

// bindingOutcome is the compact text of source in the binding, or the kind and the offset of its rejection.
func bindingOutcome(source []byte) string {
	value, err := json.Parse(source, json.ParseOptions{})
	if err == nil {
		text, err := json.Stringify(value, json.StringifyOptions{})
		if err == nil {
			return "text " + text
		}
	}
	var failure *jsonerrors.ParseError
	if errors.As(err, &failure) && failure.Offset() != nil {
		return fmt.Sprintf("rejection %s %d", failure.Kind(), *failure.Offset())
	}
	return "error " + err.Error()
}

// officialSources reads the sources of examples/official.json with the binding: their trees hold lone surrogates.
func officialSources(t *testing.T) map[string][]byte {
	t.Helper()
	text, err := os.ReadFile(filepath.Join("..", "..", "..", "..", "examples", "official.json"))
	if err != nil {
		t.Fatal(err)
	}
	official, err := json.Parse(text, json.ParseOptions{})
	if err != nil {
		t.Fatal(err)
	}
	cases, err := official.Get("cases")
	if err != nil {
		t.Fatal(err)
	}
	items, err := cases.Items()
	if err != nil {
		t.Fatal(err)
	}
	sources := map[string][]byte{}
	for _, example := range items {
		id, err := example.Get("id")
		if err != nil {
			t.Fatal(err)
		}
		name, err := id.StringValue()
		if err != nil {
			t.Fatal(err)
		}
		source, err := example.Get("source")
		if err != nil {
			t.Fatal(err)
		}
		text, err := source.StringValue()
		if err != nil {
			t.Fatal(err)
		}
		sources["official:"+name] = []byte(text)
	}
	return sources
}

func TestTheImplementationsAgree(t *testing.T) {
	suite := os.Getenv("JSON_TEST_SUITE")
	if suite == "" {
		t.Fatal("JSON_TEST_SUITE names the installed supplementary suite (make json-install-suite)")
	}
	parsing := filepath.Join(suite, "test_parsing")
	entries, err := os.ReadDir(parsing)
	if err != nil {
		t.Fatal(err)
	}
	sources := officialSources(t)
	examples := len(sources)
	for _, entry := range entries {
		source, err := os.ReadFile(filepath.Join(parsing, entry.Name()))
		if err != nil {
			t.Fatal(err)
		}
		sources[entry.Name()] = source
	}
	differences, outcomes := 0, map[string]int{}
	for name, source := range sources {
		legacy, binding := legacyOutcome(source), bindingOutcome(source)
		outcomes[strings.Fields(legacy)[0]]++
		if legacy != binding {
			differences++
			t.Errorf("%s: legacy %q, binding %q", name, legacy, binding)
		}
	}
	t.Logf("%d files of test_parsing and %d official examples (%d texts, %d rejections), %d differences",
		len(entries), examples, outcomes["text"], outcomes["rejection"], differences)
	if outcomes["error"] != 0 {
		t.Errorf("%d sources give neither a text nor a rejection", outcomes["error"])
	}
}
