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

// outsideSharedList holds the kinds that the shared list of rejection kinds does not: the strict parse and the refused
// arguments. The argument error of String with invalid UTF-8 reuses invalid_utf8 of the list.
var outsideSharedList = []ErrorKind{
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

// Requirements: RQ-005
func TestParseKindsAreTheSharedList(t *testing.T) {
	// The module names each parse rejection by the shared list of docs/spec/json-contract.md. Its text is a Go string, whose
	// unpaired surrogate is invalid UTF-8, so it has no unescaped_lone_surrogate; the kinds outside the list are the strict
	// parse and the refused arguments.
	spec, err := os.ReadFile("../../docs/spec/json-contract.md")
	if err != nil {
		t.Fatal(err)
	}
	_, section, _ := strings.Cut(string(spec), `<a id="rejection-kinds"></a>`)
	section, _, _ = strings.Cut(section, "\n<a id=")
	var shared []string
	for _, line := range strings.Split(section, "\n") {
		if name, ok := strings.CutPrefix(line, "- `"); ok && name != "unescaped_lone_surrogate`" {
			shared = append(shared, strings.TrimSuffix(name, "`"))
		}
	}
	var parsed []string
	for _, kind := range allKinds {
		if !slices.Contains(outsideSharedList, kind) {
			parsed = append(parsed, string(kind))
		}
	}
	slices.Sort(shared)
	slices.Sort(parsed)
	if !slices.Equal(shared, parsed) {
		t.Fatalf("parse kinds %v, shared list %v", parsed, shared)
	}
	api, err := os.ReadFile("../../docs/operations/api.md")
	if err != nil {
		t.Fatal(err)
	}
	for _, kind := range outsideSharedList {
		if !strings.Contains(string(api), "`"+string(kind)+"`") {
			t.Errorf("docs/operations/api.md names no `%s`", kind)
		}
	}
}
