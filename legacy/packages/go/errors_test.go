package orderedjson

import (
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
	"testing"
)

// isKind reports whether err is an Error of the module with the kind.
func isKind(err error, kind ErrorKind) bool {
	var failure Error
	return errors.As(err, &failure) && failure.Kind() == kind
}

// allKinds lists every ErrorKind constant; TestEveryKindIsNamed keeps it equal to the messages of the module.
var allKinds = []ErrorKind{
	ExpectedValueError, ExpectedDigitError, ExpectedColonError, ExpectedDelimiterError, ExpectedObjectKeyError,
	InvalidEscapeError, InvalidUnicodeEscapeError, UnfinishedEscapeError, UnterminatedStringError,
	UnescapedControlCharacterError, InvalidUTF8Error, MaximumDepthExceededError, TrailingInputError,
	DuplicateObjectKeyError, NonStringKeyError, WrongKindError, InvalidNumberLiteralError, DepthLimitOutOfRangeError,
	InvalidArgumentTypeError,
}

func discard[T any](_ T, err error) error { return err }

func parseText(source string) error { return discard(Parse(source)) }

func insertKey(key *Value) error {
	var members OrderedMap
	err := members.Set(key, Null())
	if want := map[bool]int{true: 1, false: 0}[err == nil]; members.Len() != want {
		panic(fmt.Sprintf("Set left %d members", members.Len()))
	}
	return err
}

// Requirements: RQ-005, RQ-024
func TestEveryKindHasAnAcceptingAndARefusingSite(t *testing.T) {
	var zero Value
	cases := []struct {
		kind           ErrorKind
		accept, refuse func() error
		offset         int
	}{
		{ExpectedValueError, func() error { return parseText("[1]") }, func() error { return parseText("[1,]") }, 3},
		{ExpectedDigitError, func() error { return parseText("1.5") }, func() error { return parseText("1.") }, 2},
		{ExpectedColonError, func() error { return parseText(`{"a":1}`) }, func() error { return parseText(`{"a" 1}`) }, 5},
		{ExpectedDelimiterError, func() error { return parseText("[1,2]") }, func() error { return parseText("[1 2]") }, 3},
		{ExpectedObjectKeyError, func() error { return parseText(`{"a":1}`) }, func() error { return parseText("{1:2}") }, 1},
		{InvalidEscapeError, func() error { return parseText(`"\n"`) }, func() error { return parseText(`"\x"`) }, 2},
		{InvalidUnicodeEscapeError, func() error { return parseText(`"A"`) }, func() error { return parseText(`"\u00g1"`) }, 5},
		{UnfinishedEscapeError, func() error { return parseText(`"\\"`) }, func() error { return parseText(`"\`) }, 2},
		{UnterminatedStringError, func() error { return parseText(`"a"`) }, func() error { return parseText(`"a`) }, 2},
		{UnescapedControlCharacterError, func() error { return parseText(`"a\tb"`) }, func() error { return parseText("\"a\tb\"") }, 2},
		{InvalidUTF8Error, func() error { return discard(ParseBytes([]byte(`"한"`))) }, func() error { return discard(ParseBytes([]byte("\"\xff\""))) }, 1},
		{MaximumDepthExceededError, func() error { return discard(ParseWithMaxDepth("[[]]", 2)) }, func() error { return discard(ParseWithMaxDepth("[[]]", 1)) }, 1},
		{TrailingInputError, func() error { return parseText("[1] ") }, func() error { return parseText("[1] x") }, 4},
		{DuplicateObjectKeyError, func() error { return discard(ParseRejectDuplicates(`{"a":1,"b":2}`)) }, func() error { return discard(ParseRejectDuplicates(`{"a":1,"a":2}`)) }, 7},
		{NonStringKeyError, func() error { return insertKey(must(String("a"))) }, func() error { return insertKey(must(Number("1"))) }, 0},
		{WrongKindError, func() error { return discard(must(Parse(`"x"`)).StringValue()) }, func() error { return discard(must(Parse("1")).StringValue()) }, 0},
		{InvalidNumberLiteralError, func() error { return discard(Number("-0.5e3")) }, func() error { return discard(Number(" 1")) }, 0},
		{DepthLimitOutOfRangeError, func() error { return discard(ParseWithMaxDepth("[]", MaxDepth)) }, func() error { return discard(ParseWithMaxDepth("[]", MaxDepth+1)) }, 0},
		{InvalidArgumentTypeError, func() error { return discard(Stringify(Null())) }, func() error { return discard(Stringify(&zero)) }, 0},
	}
	if len(cases) != len(allKinds) {
		t.Fatalf("%d cases for %d kinds", len(cases), len(allKinds))
	}
	for index, test := range cases {
		if test.kind != allKinds[index] {
			t.Fatalf("case %d is %s, want %s", index, test.kind, allKinds[index])
		}
		if err := test.accept(); err != nil {
			t.Errorf("%s: the accepting site refused: %v", test.kind, err)
		}
		var failure Error
		if err := test.refuse(); !errors.As(err, &failure) {
			t.Fatalf("%s: the refusing site gave %v", test.kind, err)
		}
		if failure.Kind() != test.kind || failure.Offset() != test.offset || failure.Message() != messages[test.kind] {
			t.Errorf("%s: got %s at %d (%s), want offset %d", test.kind, failure.Kind(), failure.Offset(), failure.Message(), test.offset)
		}
		if want := fmt.Sprintf("%s at byte %d", messages[test.kind], test.offset); failure.Error() != want {
			t.Errorf("%s: Error() = %q, want %q", test.kind, failure.Error(), want)
		}
	}
}

// Requirements: RQ-005
func TestEveryKindIsNamed(t *testing.T) {
	if len(messages) != len(allKinds) {
		t.Fatalf("%d messages for %d kinds", len(messages), len(allKinds))
	}
	seen := map[string]ErrorKind{}
	for _, kind := range allKinds {
		message, ok := messages[kind]
		if !ok || message == "" || kind == "" || strings.Trim(string(kind), "abcdefghijklmnopqrstuvwxyz0123456789_") != "" {
			t.Errorf("kind %q has the message %q", kind, message)
		}
		if other, repeated := seen[message]; repeated {
			t.Errorf("%s and %s share the message %q", other, kind, message)
		}
		seen[message] = kind
	}
}

// Requirements: RQ-014, RQ-015, RQ-016, RQ-006
func TestArgumentErrorsCarryTheirKind(t *testing.T) {
	for _, literal := range []string{"[]", `"1"`, "true", "null", "1 "} {
		if _, err := Number(literal); !isKind(err, InvalidNumberLiteralError) {
			t.Errorf("Number(%q) = %v", literal, err)
		}
	}
	if _, err := Number("x"); !isKind(err, ExpectedValueError) {
		t.Errorf("Number(x) = %v", err)
	}
	for _, document := range []string{"1", "[]", "{}", "null", "true"} {
		if _, err := must(Parse(document)).StringValue(); !isKind(err, WrongKindError) {
			t.Errorf("StringValue of %s = %v", document, err)
		}
	}
	for _, key := range []*Value{Null(), Boolean(true), must(Array(nil)), nil} {
		if err := insertKey(key); !isKind(err, NonStringKeyError) {
			t.Errorf("Set(%v) = %v", key, err)
		}
	}
	var zero Value
	var members OrderedMap
	for name, err := range map[string]error{
		"Set of a nil value":      members.Set(must(String("a")), nil),
		"Set of a zero value":     members.Set(must(String("a")), &zero),
		"Array of a nil item":     discard(Array([]*Value{nil})),
		"Object of a nil map":     discard(Object(nil)),
		"Compact of a zero value": discard(zero.Compact()),
	} {
		if !isKind(err, InvalidArgumentTypeError) {
			t.Errorf("%s = %v", name, err)
		}
	}
	for _, limit := range []int{-1, MaxDepth + 1} {
		if _, err := ParseWithMaxDepth("1", limit); !isKind(err, DepthLimitOutOfRangeError) {
			t.Errorf("ParseWithMaxDepth(%d) = %v", limit, err)
		}
	}
	if _, err := String("\xff"); !isKind(err, InvalidUTF8Error) {
		t.Errorf("String of invalid UTF-8 = %v", err)
	}
}

// listed holds the items of the list of the section of anchor in docs/spec/json-contract.md: each kind with its text.
func listed(t *testing.T, anchor string) map[string]string {
	spec, err := os.ReadFile("../../../docs/spec/json-contract.md")
	if err != nil {
		t.Fatal(err)
	}
	_, section, _ := strings.Cut(string(spec), anchor)
	section, _, _ = strings.Cut(section, "\n<a id=")
	items := map[string]string{}
	for _, line := range strings.Split(section, "\n") {
		if item, ok := strings.CutPrefix(line, "- `"); ok {
			name, text, _ := strings.Cut(item, "`")
			items[name] = text
		}
	}
	return items
}

// Requirements: RQ-005, RQ-025
func TestKindsAreTheSharedLists(t *testing.T) {
	// The module names each refusal by the shared lists of docs/spec/json-contract.md. A kind of a list that the module lacks
	// is one that the list states cannot arise in Go: unescaped_lone_surrogate, since a Go string holds an unpaired surrogate
	// only as invalid UTF-8, and the argument kinds that the types of Go exclude. DuplicateObjectKeyError of the strict parse
	// is the one kind outside the lists.
	items := listed(t, `<a id="rejection-kinds"></a>`)
	arguments := listed(t, `<a id="argument-kinds"></a>`)
	for name, text := range arguments {
		items[name] = text
	}
	covered := map[ErrorKind]bool{DuplicateObjectKeyError: true}
	for name, text := range items {
		switch {
		case slices.Contains(allKinds, ErrorKind(name)):
			covered[ErrorKind(name)] = true
		case name == "unescaped_lone_surrogate":
		case !strings.Contains(text, "cannot arise in") || !strings.Contains(text, " Go"):
			t.Errorf("%s is no ErrorKind and its item does not state that it cannot arise in Go", name)
		}
	}
	if len(covered) != len(allKinds) {
		t.Errorf("the lists name %d kinds of the module, which has %d", len(covered), len(allKinds))
	}
	for _, kind := range []ErrorKind{NonStringKeyError, WrongKindError, InvalidNumberLiteralError, DepthLimitOutOfRangeError, InvalidArgumentTypeError} {
		if _, ok := arguments[string(kind)]; !ok {
			t.Errorf("the argument kinds hold no %s", kind)
		}
	}
}
