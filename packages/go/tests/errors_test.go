package tests

import (
	stdjson "encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"slices"
	"strings"
	"testing"
	"unicode"

	json "github.com/polyspec/json/packages/go"
	jsonerrors "github.com/polyspec/json/packages/go/errors"
)

// The kinds of the errors of the Go binding json. Every error that the binding returns names its kind on Kind(): a
// *ParseError the rejection kinds of the JSON contract, a *JSONTypeError or a *JSONValueError the argument kinds
// (change-errors). Each kind has an accepting and a refusing site. The tests of the legacy package with no change beyond
// the changes of packages/rust/interface.json, each named where it applies (T3.25). TestEveryKindIsNamed reads the kinds of
// the contract, since the binding has no map of the messages of the kinds (change-messages). TestKindsAreTheSharedLists, the test of the kinds
// that cannot arise in Go, waits for the removal of the legacy package, as in Python (T3.25-2) and PHP (T3.25-3).

// kinded is an error of the binding (change-errors: every error is a type of its category with its kind).
type kinded interface {
	error
	Kind() string
}

// isKind reports whether err is an error of the binding with the kind.
func isKind(err error, kind string) bool {
	var failure kinded
	return errors.As(err, &failure) && failure.Kind() == kind
}

// isCategory reports whether err is an error of the type T of the package errors of the binding.
func isCategory[T error](err error) bool {
	var target T
	return errors.As(err, &target)
}

// allKinds lists every kind that the binding raises in Go, the parse rejections first.
var allKinds = []string{
	"expected_value", "expected_digit", "expected_colon", "expected_delimiter", "expected_object_key",
	"invalid_escape", "invalid_unicode_escape", "unfinished_escape", "unterminated_string",
	"unescaped_control_character", "invalid_utf8", "maximum_depth_exceeded", "trailing_input",
	"duplicate_object_key", "non_string_key", "wrong_kind", "invalid_number_literal", "depth_limit_out_of_range",
	"invalid_argument_type", "invalid_text", "invalid_code_unit", "unpaired_surrogate", "non_finite_number",
	"host_serialization_refused",
}

// contractKinds holds the kinds of errors.kinds of packages/rust/interface.json, each the snake case of its variant.
func contractKinds(t *testing.T) []string {
	t.Helper()
	source, err := os.ReadFile("../../rust/interface.json")
	if err != nil {
		t.Fatal(err)
	}
	var contract struct {
		Errors struct {
			Kinds []struct {
				Variant string `json:"variant"`
			} `json:"kinds"`
		} `json:"errors"`
	}
	if err := stdjson.Unmarshal(source, &contract); err != nil {
		t.Fatal(err)
	}
	kinds := []string{}
	for _, kind := range contract.Errors.Kinds {
		name := kind.Variant[strings.LastIndex(kind.Variant, ":")+1:]
		snake := []rune{}
		for index, letter := range name {
			if unicode.IsUpper(letter) && index > 0 {
				snake = append(snake, '_')
			}
			snake = append(snake, unicode.ToLower(letter))
		}
		kinds = append(kinds, string(snake))
	}
	return kinds
}

// Requirements: RQ-005
func TestEveryKindIsNamed(t *testing.T) {
	// change-messages: the binding has no map of messages, so the name of a kind is what Kind() returns and its message
	// what Error() returns. Every kind of the contract is one of allKinds, whose sites
	// TestEveryKindHasAnAcceptingAndARefusingSite raises with that Kind() and a message that is not empty; the kind internal
	// is raised only by an injected fault, in the generated test TestB4OrderedMapGetABrokenPositionIsInternal.
	declared := contractKinds(t)
	if len(declared) == 0 {
		t.Fatal("packages/rust/interface.json declares no kind")
	}
	for _, kind := range declared {
		if kind != "internal" && !slices.Contains(allKinds, kind) {
			t.Errorf("the kind %s of the contract has no site in allKinds", kind)
		}
	}
	seen := map[string]bool{}
	for _, kind := range append(slices.Clone(allKinds), "internal") {
		if kind == "" || strings.Trim(kind, "abcdefghijklmnopqrstuvwxyz0123456789_") != "" {
			t.Errorf("the kind %q is no name of lower case letters, digits and _", kind)
		}
		if seen[kind] {
			t.Errorf("the kind %s is listed twice", kind)
		}
		seen[kind] = true
	}
	// The kinds of allKinds outside the contract are those that the conversion of an argument raises in the binding.
	for _, kind := range allKinds {
		if !slices.Contains(declared, kind) && kind != "invalid_argument_type" && kind != "invalid_text" {
			t.Errorf("the kind %s is neither a kind of the contract nor a kind of the conversion of an argument", kind)
		}
	}
}

func discard[T any](_ T, err error) error { return err }

func parseText(source string) error { return discard(parse(source)) }

// insertKey inserts key into a new map (change-ordered-map: an object takes an OrderedMap whose keys are values).
func insertKey(key *json.Value) error {
	members := must(json.NewOrderedMap())
	_, err := members.Insert(key, must(json.ValueNull()))
	if want := map[bool]uint64{true: 1, false: 0}[err == nil]; must(members.Size()) != want {
		panic(fmt.Sprintf("Insert left %d members", must(members.Size())))
	}
	return err
}

// site is a kind with its accepting and its refusing site; a rejection has the offset, an argument error the category.
type site struct {
	kind           string
	accept, refuse func() error
	category       func(error) bool
	offset         uint64
	rejection      bool
}

// rejected is the site of a parse rejection at the byte offset.
func rejected(kind string, accept, refuse func() error, offset uint64) site {
	return site{kind: kind, accept: accept, refuse: refuse, category: isCategory[*jsonerrors.ParseError], offset: offset, rejection: true}
}

// refused is the site of a refused argument, an error of the category T with no offset.
func refused[T error](kind string, accept, refuse func() error) site {
	return site{kind: kind, accept: accept, refuse: refuse, category: isCategory[T]}
}

// Requirements: RQ-005, RQ-024
func TestEveryKindHasAnAcceptingAndARefusingSite(t *testing.T) {
	var zero json.Value
	type valueError = *jsonerrors.JSONValueError
	type typeError = *jsonerrors.JSONTypeError
	cases := []site{
		rejected("expected_value", func() error { return parseText("[1]") }, func() error { return parseText("[1,]") }, 3),
		rejected("expected_digit", func() error { return parseText("1.5") }, func() error { return parseText("1.") }, 2),
		rejected("expected_colon", func() error { return parseText(`{"a":1}`) }, func() error { return parseText(`{"a" 1}`) }, 5),
		rejected("expected_delimiter", func() error { return parseText("[1,2]") }, func() error { return parseText("[1 2]") }, 3),
		rejected("expected_object_key", func() error { return parseText(`{"a":1}`) }, func() error { return parseText("{1:2}") }, 1),
		rejected("invalid_escape", func() error { return parseText(`"\n"`) }, func() error { return parseText(`"\x"`) }, 2),
		rejected("invalid_unicode_escape", func() error { return parseText(`"A"`) }, func() error { return parseText(`"\u00g1"`) }, 5),
		rejected("unfinished_escape", func() error { return parseText(`"\\"`) }, func() error { return parseText(`"\`) }, 2),
		rejected("unterminated_string", func() error { return parseText(`"a"`) }, func() error { return parseText(`"a`) }, 2),
		rejected("unescaped_control_character", func() error { return parseText(`"a\tb"`) }, func() error { return parseText("\"a\tb\"") }, 2),
		rejected("invalid_utf8", func() error { return parseText(`"한"`) }, func() error { return parseText("\"\xff\"") }, 1),
		// change-parse-options: the depth limit and the rejection of duplicates are fields of the options of Parse.
		rejected("maximum_depth_exceeded", func() error { return discard(parseWithMaxDepth("[[]]", 2)) }, func() error { return discard(parseWithMaxDepth("[[]]", 1)) }, 1),
		rejected("trailing_input", func() error { return parseText("[1] ") }, func() error { return parseText("[1] x") }, 4),
		rejected("duplicate_object_key", func() error { return discard(parseRejectDuplicates(`{"a":1,"b":2}`)) }, func() error { return discard(parseRejectDuplicates(`{"a":1,"a":2}`)) }, 7),
		// change-errors: the argument kinds are a *JSONTypeError or a *JSONValueError, which has no offset.
		refused[typeError]("non_string_key", func() error { return insertKey(must(json.ValueString("a"))) }, func() error { return insertKey(must(json.ValueNumber("1"))) }),
		refused[typeError]("wrong_kind", func() error { return discard(must(parse(`"x"`)).StringValue()) }, func() error { return discard(must(parse("1")).StringValue()) }),
		refused[valueError]("invalid_number_literal", func() error { return discard(json.ValueNumber("-0.5e3")) }, func() error { return discard(json.ValueNumber(" 1")) }),
		refused[valueError]("depth_limit_out_of_range", func() error { return discard(parseWithMaxDepth("[]", json.MaxDepth)) }, func() error { return discard(parseWithMaxDepth("[]", json.MaxDepth+1)) }),
		refused[typeError]("invalid_argument_type", func() error { return discard(compact(must(json.ValueNull()))) }, func() error { return discard(compact(&zero)) }),
		// change-string-constructor: a text that is no UTF-8 is refused by the binding.
		refused[valueError]("invalid_text", func() error { return discard(json.ValueString("한")) }, func() error { return discard(json.ValueString("\xff")) }),
		// change-code-units: the core refuses a code unit above 65535.
		refused[valueError]("invalid_code_unit", func() error { return discard(json.ValueFromUnits([]uint64{0xffff})) }, func() error { return discard(json.ValueFromUnits([]uint64{0x10000})) }),
		// change-string-value: a string with an unpaired surrogate has no Unicode text.
		refused[valueError]("unpaired_surrogate", func() error { return discard(must(parse(`"🌍"`)).StringValue()) }, func() error { return discard(must(parse(`"\ud800"`)).StringValue()) }),
		// change-from-float: a number is made from a finite float.
		refused[valueError]("non_finite_number", func() error { return discard(json.ValueFromFloat(1.5)) }, func() error { return discard(json.ValueFromFloat(math.NaN())) }),
		// change-host-hooks: MarshalJSON refuses the value, and Stringify is the serializer.
		refused[typeError]("host_serialization_refused", func() error { return discard(compact(must(json.ValueNull()))) }, func() error { return discard(stdjson.Marshal(must(json.ValueNull()))) }),
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
		err := test.refuse()
		var failure kinded
		if !errors.As(err, &failure) {
			t.Fatalf("%s: the refusing site gave %v", test.kind, err)
		}
		// change-messages: the kind is the contract; the message and the text of the error are the wording of the binding.
		if failure.Kind() != test.kind || !test.category(err) || failure.Error() == "" {
			t.Errorf("%s: got %s (%T, %q)", test.kind, failure.Kind(), failure, failure.Error())
		}
		var parseError *jsonerrors.ParseError
		if errors.As(err, &parseError) != test.rejection {
			t.Errorf("%s: a parse rejection = %t, want %t", test.kind, !test.rejection, test.rejection)
		}
		if test.rejection && (parseError.Offset() == nil || *parseError.Offset() != test.offset) {
			t.Errorf("%s: offset = %v, want %d", test.kind, parseError.Offset(), test.offset)
		}
	}
}

// Requirements: RQ-014, RQ-015, RQ-016, RQ-006
func TestArgumentErrorsCarryTheirKind(t *testing.T) {
	for _, literal := range []string{"[]", `"1"`, "true", "null", "1 "} {
		if _, err := json.ValueNumber(literal); !isKind(err, "invalid_number_literal") {
			t.Errorf("ValueNumber(%q) = %v", literal, err)
		}
	}
	if _, err := json.ValueNumber("x"); !isKind(err, "expected_value") {
		t.Errorf("ValueNumber(x) = %v", err)
	}
	for _, document := range []string{"1", "[]", "{}", "null", "true"} {
		if _, err := must(parse(document)).StringValue(); !isKind(err, "wrong_kind") {
			t.Errorf("StringValue of %s = %v", document, err)
		}
	}
	for _, key := range []*json.Value{must(json.ValueNull()), must(json.ValueBoolean(true)), must(json.ValueArray(nil))} {
		if err := insertKey(key); !isKind(err, "non_string_key") {
			t.Errorf("Insert(%v) = %v", key, err)
		}
	}
	var zero json.Value
	members := must(json.NewOrderedMap())
	for name, err := range map[string]error{
		// change-argument-types: a key that holds no value is invalid_argument_type; non_string_key is a value of another kind.
		"Insert of a nil key":       insertKey(nil),
		"Insert of a nil value":     discard(members.Insert(must(json.ValueString("a")), nil)),
		"Insert of a zero value":    discard(members.Insert(must(json.ValueString("a")), &zero)),
		"ValueArray of a nil item":  discard(json.ValueArray([]*json.Value{nil})),
		"ValueObject of a nil map":  discard(json.ValueObject(nil)),
		"Stringify of a zero value": discard(compact(&zero)),
	} {
		if !isKind(err, "invalid_argument_type") {
			t.Errorf("%s = %v", name, err)
		}
	}
	for _, limit := range []int64{-1, json.MaxDepth + 1} {
		if _, err := parseWithMaxDepth("1", limit); !isKind(err, "depth_limit_out_of_range") {
			t.Errorf("Parse with the limit %d = %v", limit, err)
		}
	}
	// change-string-constructor: a text that is no UTF-8 is refused by the binding.
	if _, err := json.ValueString("\xff"); !isKind(err, "invalid_text") {
		t.Errorf("ValueString of invalid UTF-8 = %v", err)
	}
}
