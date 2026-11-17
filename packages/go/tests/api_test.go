// Package tests holds the package tests of the Go binding json of packages/go, run by go test (make test-go).
//
// The shared cases exercise the JSON contract through the adapter; argument validation, map building, UTF-16 units,
// wrong-kind access and the zero value are reachable only from here. The tests of the legacy package orderedjson with no
// change beyond the changes of packages/rust/interface.json, each named where it applies (T3.25).
package tests

import (
	stdjson "encoding/json"
	"errors"
	"strings"
	"testing"

	json "github.com/polyspec/json/packages/go"
	jsonerrors "github.com/polyspec/json/packages/go/errors"
)

// parse parses a text (change-parse-source: the one Parse takes the bytes of the text and its options).
func parse(source string) (*json.Value, error) {
	return json.Parse([]byte(source), json.ParseOptions{})
}

// parseWithMaxDepth parses with a depth limit (change-parse-options: the limit is a field of the options of Parse).
func parseWithMaxDepth(source string, limit int64) (*json.Value, error) {
	return json.Parse([]byte(source), json.ParseOptions{MaxDepth: &limit})
}

// parseRejectDuplicates is the strict parse (change-parse-options: the rejection of duplicates is an option of Parse).
func parseRejectDuplicates(source string) (*json.Value, error) {
	reject := true
	return json.Parse([]byte(source), json.ParseOptions{RejectDuplicates: &reject})
}

// compact is the text of a value (change-stringify: Stringify is the one serializer).
func compact(value *json.Value) (string, error) {
	return json.Stringify(value, json.StringifyOptions{})
}

// rejection is the parse rejection of err, which the test expects (change-errors: a rejection is a *ParseError).
func rejection(t *testing.T, err error) *jsonerrors.ParseError {
	t.Helper()
	var failure *jsonerrors.ParseError
	if !errors.As(err, &failure) {
		t.Fatalf("the error is no parse rejection: %v", err)
	}
	return failure
}

// offsetOf is the byte offset of a rejection (change-errors: Offset is absent for an error with no position).
func offsetOf(t *testing.T, failure *jsonerrors.ParseError) uint64 {
	t.Helper()
	offset := failure.Offset()
	if offset == nil {
		t.Fatalf("the rejection %s has no offset", failure.Kind())
	}
	return *offset
}

// Requirements: RQ-006
func TestDepthArgumentIsBounded(t *testing.T) {
	if _, err := parseWithMaxDepth("[]", json.MaxDepth+1); !isKind(err, "depth_limit_out_of_range") {
		t.Fatalf("Parse with the limit 257 error = %v", err)
	}
}

// Requirements: RQ-006
func TestDepthLimitIsEnforced(t *testing.T) {
	if _, err := parseWithMaxDepth("[[1]]", 2); err != nil {
		t.Fatalf("Parse with the limit 2 error = %v", err)
	}
	// change-messages: an error names its kind, and the message is no part of the interface.
	_, err := parseWithMaxDepth("[[1]]", 1)
	if shallow := rejection(t, err); shallow.Kind() != "maximum_depth_exceeded" {
		t.Fatalf("Parse with the limit 1 error = %v", err)
	}
}

// Requirements: RQ-005
func TestRejectionNamesItsKind(t *testing.T) {
	// The wording is Go's own; the kind is the shared contract.
	cases := map[string]string{
		"[1,]":       "expected_value",
		"{1:2}":      "expected_object_key",
		"[1.]":       "expected_digit",
		"\"a\x01b\"": "unescaped_control_character",
		"[1] x":      "trailing_input",
	}
	for document, kind := range cases {
		_, err := parse(document)
		if failure := rejection(t, err); failure.Kind() != kind {
			t.Errorf("%q: kind = %q, want %q (%s)", document, failure.Kind(), kind, failure.Error())
		}
	}
}

// Requirements: RQ-004, RQ-007
func TestInvalidUTF8ReportsTheFirstBadByte(t *testing.T) {
	// The bad byte sits at index 2 of ["<bad>"]; the error names that position.
	_, err := json.Parse([]byte{'[', '"', 0xff, '"', ']'}, json.ParseOptions{})
	failure := rejection(t, err)
	// change-messages: the kind names the rejection.
	if failure.Kind() != "invalid_utf8" {
		t.Fatalf("Parse error = %v", err)
	}
	if offset := offsetOf(t, failure); offset != 2 {
		t.Fatalf("offset = %d, want 2", offset)
	}
}

// Requirements: RQ-004
func TestParseErrorsReportOffsets(t *testing.T) {
	_, err := parse("[1,]")
	// change-messages: the text of the error, which held the offset, is no part of the interface.
	if offset := offsetOf(t, rejection(t, err)); offset != 3 {
		t.Fatalf("offset = %d, error = %v", offset, err)
	}
	// Byte offsets, not rune counts: the emoji occupies four bytes.
	_, err = parse(`["🌍",]`)
	if offset := offsetOf(t, rejection(t, err)); offset != 8 {
		t.Fatalf("astral offset = %d, error = %v", offset, err)
	}
}

// Requirements: RQ-007
func TestBytesInputIsValidated(t *testing.T) {
	_, err := json.Parse([]byte{'[', '"', 0xff, '"', ']'}, json.ParseOptions{})
	if invalid := rejection(t, err); invalid.Kind() != "invalid_utf8" {
		t.Fatalf("Parse error = %v", err)
	}
	value, parseErr := json.Parse([]byte(`["한"]`), json.ParseOptions{})
	if parseErr != nil {
		t.Fatal(parseErr)
	}
	if text := must(compact(value)); text != `["한"]` {
		t.Fatalf("Stringify() = %s", text)
	}
}

// Requirements: RQ-014
func TestWrongKindAccessIsReported(t *testing.T) {
	array, object := mustParse(t, "[1]"), mustParse(t, `{"a":1}`)
	cases := []struct {
		name string
		err  error
	}{
		{"members of an array", discard(array.Members())},
		{"items of an object", discard(object.Items())},
		{"string value of an object", discard(object.StringValue())},
		{"number literal of an object", discard(object.NumberLiteral())},
		{"boolean value of an object", discard(object.BooleanValue())},
		{"string units of an array", discard(array.StringUnits())},
		// change-accessors: a lookup in a value of another kind is a failure, never an absence.
		{"lookup in an array", discard(array.Get("a"))},
		{"lookup by units in an array", discard(array.GetUnits([]uint64{'a'}))},
	}
	for _, test := range cases {
		if !isKind(test.err, "wrong_kind") {
			t.Errorf("%s: error = %v, want the kind wrong_kind", test.name, test.err)
		}
	}
}

// Requirements: RQ-016
func TestOrderedMapRejectsNonStringKey(t *testing.T) {
	// change-ordered-map: NewOrderedMap makes the map, and Insert adds a member.
	members := must(json.NewOrderedMap())
	number, err := json.ValueNumber("1")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := members.Insert(number, must(json.ValueNull())); !isKind(err, "non_string_key") {
		t.Fatalf("Insert with a number key error = %v", err)
	}
	if size := must(members.Size()); size != 0 {
		t.Fatalf("rejected key was stored: size = %d", size)
	}
	if _, err := members.Insert(nil, must(json.ValueNull())); err == nil {
		t.Fatal("Insert accepted an invalid key value")
	}
}

// Requirements: RQ-001
func TestRepeatedKeyKeepsFirstPositionAndLastValue(t *testing.T) {
	members := must(json.NewOrderedMap())
	for _, pair := range [][2]string{{"a", "1"}, {"b", "2"}, {"a", "3"}} {
		key, err := json.ValueString(pair[0])
		if err != nil {
			t.Fatal(err)
		}
		value, err := json.ValueNumber(pair[1])
		if err != nil {
			t.Fatal(err)
		}
		if _, err := members.Insert(key, value); err != nil {
			t.Fatal(err)
		}
	}
	object, err := json.ValueObject(members)
	if err != nil {
		t.Fatal(err)
	}
	if text := must(compact(object)); text != `{"a":3,"b":2}` {
		t.Fatalf("Stringify() = %s", text)
	}
	if size := must(members.Size()); size != 2 {
		t.Fatalf("Size() = %d", size)
	}
}

// Requirements: RQ-002, RQ-019
func TestMemberLookupUsesDecodedNames(t *testing.T) {
	// change-accessors: a lookup returns the member, nil for a missing name, and an error.
	value := mustParse(t, `{"aé":1,"b":2}`)
	if child := must(value.Get("aé")); child == nil {
		t.Fatal(`Get("aé") returned nothing`)
	} else if literal := must(child.NumberLiteral()); literal != "1" {
		t.Fatalf("NumberLiteral() = %q", literal)
	}
	if must(value.Get("missing")) != nil {
		t.Fatal(`Get("missing") returned a value`)
	}
	// change-code-units: a code unit is an unsigned integer of the contract.
	if child := must(value.GetUnits([]uint64{'b'})); child == nil {
		t.Fatal("GetUnits returned nothing")
	}
	if must(value.GetUnits([]uint64{'c'})) != nil {
		t.Fatal("GetUnits returned a value for a missing key")
	}
}

// Requirements: RQ-009
func TestUnpairedSurrogateStaysInUnits(t *testing.T) {
	lone := mustParse(t, `"a\ud800"`)
	units, err := lone.StringUnits()
	if err != nil {
		t.Fatal(err)
	}
	if len(units) != 2 || units[0] != 'a' || units[1] != 0xd800 {
		t.Fatalf("StringUnits() = %v", units)
	}
	// change-from-units: a string with an unpaired surrogate is built from its code units.
	if text := must(compact(must(json.ValueFromUnits([]uint64{0xd800})))); text != `"\ud800"` {
		t.Fatalf("ValueFromUnits Stringify() = %s", text)
	}
}

// Requirements: RQ-009
func TestSurrogatePairDecodes(t *testing.T) {
	pair := mustParse(t, `"🌍"`)
	units, err := pair.StringUnits()
	if err != nil {
		t.Fatal(err)
	}
	if len(units) != 2 || units[0] != 0xd83c || units[1] != 0xdf0d {
		t.Fatalf("StringUnits() = %v", units)
	}
	if text := must(pair.StringValue()); text != "🌍" {
		t.Fatalf("StringValue() = %q", text)
	}
}

// Requirements: RQ-007
func TestUtf8ValidationHoldsForLongMultibyteText(t *testing.T) {
	text := strings.Repeat("한\U0001f30d", 64)
	value, err := parse(`{"key":"` + text + `"}`)
	if err != nil {
		t.Fatal(err)
	}
	if got, err := must(value.Get("key")).StringValue(); err != nil || got != text {
		t.Fatalf("StringValue() = %q, %v", got, err)
	}
	_, err = parse("[\"\xff\"]")
	if failure := rejection(t, err); failure.Kind() != "invalid_utf8" || offsetOf(t, failure) != 2 {
		t.Fatalf("Parse of an invalid byte error = %v", err)
	}
}

// Requirements: RQ-015
func TestFactoriesValidateArguments(t *testing.T) {
	if _, err := json.ValueNumber(" 1"); !isKind(err, "invalid_number_literal") {
		t.Fatalf("ValueNumber(\" 1\") error = %v", err)
	}
	if _, err := json.ValueNumber("x"); err == nil {
		t.Fatal("ValueNumber accepted a non-number literal")
	}
	if _, err := json.ValueArray([]*json.Value{nil}); !isKind(err, "invalid_argument_type") {
		t.Fatalf("ValueArray with an invalid item error = %v", err)
	}
	if _, err := json.ValueObject(nil); !isKind(err, "invalid_argument_type") {
		t.Fatalf("ValueObject(nil) error = %v", err)
	}
	text, err := json.ValueString(`"q"`)
	if err != nil {
		t.Fatal(err)
	}
	if written := must(compact(text)); written != `"\"q\""` {
		t.Fatalf("ValueString Stringify() = %s", written)
	}
	if written := must(compact(must(json.ValueBoolean(true)))); written != "true" {
		t.Fatalf("ValueBoolean(true) Stringify() = %s", written)
	}
}

// Requirements: RQ-012
func TestValuesComeOnlyFromTheLibrary(t *testing.T) {
	// change-stringify: Stringify is the one serializer, so the zero value has no second one to refuse it.
	var zero json.Value
	if _, err := compact(&zero); !isKind(err, "invalid_argument_type") {
		t.Fatalf("Stringify(zero) error = %v", err)
	}
	if _, err := compact(nil); err == nil {
		t.Fatal("Stringify accepted nil")
	}
}

// Requirements: RQ-013
func TestReturnedCollectionsAreImmutable(t *testing.T) {
	// change-collections: an accessor returns a new collection for each access, so a change of it leaves the value as it was.
	array := mustParse(t, "[1,2]")
	items, err := array.Items()
	if err != nil {
		t.Fatal(err)
	}
	items[0] = nil
	again := must(array.Items())
	if again[0] == nil {
		t.Fatal("Items() handed out the parsed slice")
	}
	object := mustParse(t, `{"a":1,"b":2}`)
	members, err := object.Members()
	if err != nil {
		t.Fatal(err)
	}
	key := must(json.ValueString("c"))
	if _, err := members.Insert(key, must(json.ValueNull())); err != nil {
		t.Fatal(err)
	}
	fresh := must(object.Members())
	if size := must(fresh.Size()); size != 2 {
		t.Fatalf("Members() shares state: Size() = %d", size)
	}
}

// Requirements: RQ-018
func TestRootKeepsSurroundingText(t *testing.T) {
	value := mustParse(t, "  [1] \n")
	if raw := must(value.Raw()); raw != "  [1] \n" {
		t.Fatalf("Raw() = %q", raw)
	}
	if text := must(compact(value)); text != "[1]" {
		t.Fatalf("Stringify() = %s", text)
	}
	items, err := value.Items()
	if err != nil {
		t.Fatal(err)
	}
	if raw := must(items[0].Raw()); raw != "1" {
		t.Fatalf("item Raw() = %q", raw)
	}
}

// Requirements: RQ-020
func TestHostSerializationBoundary(t *testing.T) {
	// change-host-hooks: encoding/json rewrites the text of MarshalJSON, so the hook refuses the value and Stringify writes
	// the ordered text.
	value := mustParse(t, `{"b":1,"a":2}`)
	if _, err := stdjson.Marshal(value); !isKind(err, "host_serialization_refused") {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	if text := must(compact(value)); text != `{"b":1,"a":2}` {
		t.Fatalf("Stringify() = %s", text)
	}
}

// Requirements: RQ-020
func TestHostSerializationEmbedsValues(t *testing.T) {
	// change-host-hooks: a native structure that holds a value is refused by the host encoder; Stringify writes the
	// contract bytes of the value.
	props := mustParse(t, `{"z":1.50,"a":[{"b":2,"a":3}]}`)
	_, err := stdjson.Marshal(struct {
		Call  string      `json:"call"`
		Props *json.Value `json:"props"`
	}{Call: "view", Props: props})
	if !isKind(err, "host_serialization_refused") {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	if want := `{"z":1.50,"a":[{"b":2,"a":3}]}`; must(compact(props)) != want {
		t.Fatalf("Stringify() = %s, want %s", must(compact(props)), want)
	}
}

// Requirements: RQ-020
func TestHostDeserializationHasNoHook(t *testing.T) {
	// change-host-hooks: the binding declares no UnmarshalJSON, so the host decoder reads a document into a Value by its own
	// rules for a struct with no exported field. An object leaves a Value that holds no value, which the library refuses, and
	// a document of another kind is an error of the decoder; Parse is the one reader of a document.
	var value json.Value
	if _, hooked := any(&value).(stdjson.Unmarshaler); hooked {
		t.Fatal("the Value implements json.Unmarshaler")
	}
	var got struct {
		Call  string      `json:"call"`
		Props *json.Value `json:"props"`
	}
	if err := stdjson.Unmarshal([]byte(`{"call":"view","props":{"z":1.50,"a":[{"b":2,"a":3}]}}`), &got); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if text, err := compact(got.Props); got.Call != "view" || !isKind(err, "invalid_argument_type") {
		t.Fatalf("the decoded field: call = %q, Stringify() = %q, %v", got.Call, text, err)
	}
	var mismatch *stdjson.UnmarshalTypeError
	if err := stdjson.Unmarshal([]byte(`{"props":[1]}`), &got); !errors.As(err, &mismatch) {
		t.Fatalf("json.Unmarshal of an array error = %v", err)
	}
	if props := must(parse(`{"z":1.50,"a":[{"b":2,"a":3}]}`)); must(compact(props)) != `{"z":1.50,"a":[{"b":2,"a":3}]}` {
		t.Fatalf("Stringify(Parse()) = %s", must(compact(props)))
	}
}

func mustParse(t *testing.T, source string) *json.Value {
	t.Helper()
	value, err := parse(source)
	if err != nil {
		t.Fatalf("Parse(%q) error = %v", source, err)
	}
	return value
}

// must returns the value of a call that the test expects to succeed; its error panics, which fails the test.
func must[T any](value T, err error) T {
	if err != nil {
		panic(err)
	}
	return value
}

func TestPublicApiExportsTheEntryPoints(t *testing.T) {
	// RQ-023: the parse, serialization, factory and accessor functions are exported.
	// change-names: the factories are the functions Value<Name> of the module json.
	text, err := json.ValueString("x")
	if err != nil {
		t.Fatal(err)
	}
	number, err := json.ValueNumber("1")
	if err != nil {
		t.Fatal(err)
	}
	list, err := json.ValueArray([]*json.Value{text, number, must(json.ValueBoolean(true)), must(json.ValueNull())})
	if err != nil {
		t.Fatal(err)
	}
	// change-ordered-map: an object takes an OrderedMap whose keys are values.
	members := must(json.NewOrderedMap())
	if _, err := members.Insert(mustParse(t, `"a"`), list); err != nil {
		t.Fatal(err)
	}
	built, err := json.ValueObject(members)
	if err != nil {
		t.Fatal(err)
	}
	written, err := compact(built)
	if err != nil || written != `{"a":["x",1,true,null]}` {
		t.Fatalf("Stringify = %q, %v", written, err)
	}
	parsed := mustParse(t, written)
	object, err := parsed.Members()
	if err != nil {
		t.Fatal(err)
	}
	items, err := must(object.Get("a")).Items()
	if err != nil {
		t.Fatal(err)
	}
	// change-kind-enum: the kinds are the constants Kind<Name> of the enum Kind.
	kinds := []json.Kind{json.KindString, json.KindNumber, json.KindBoolean, json.KindNull}
	for index, item := range items {
		if kind := must(item.Kind()); kind != kinds[index] {
			t.Fatalf("item %d kind = %s", index, kind)
		}
	}
	if value := must(items[0].StringValue()); value != "x" {
		t.Fatalf("StringValue = %q", value)
	}
	if literal := must(items[1].NumberLiteral()); literal != "1" {
		t.Fatalf("NumberLiteral = %q", literal)
	}
	if flag := must(items[2].BooleanValue()); !flag {
		t.Fatal("BooleanValue = false")
	}
	// change-parse-source: the one Parse takes the bytes.
	if _, err := json.Parse([]byte("[]"), json.ParseOptions{}); err != nil {
		t.Fatal(err)
	}
}

func TestParseErrorExposesKindOffsetAndMessage(t *testing.T) {
	// RQ-024: a parse error exposes its kind, its offset and its message.
	_, err := parse("[1,]")
	failure := rejection(t, err)
	// change-messages: the message is the wording of the binding, so the test reads that it is there.
	if failure.Kind() != "expected_value" || offsetOf(t, failure) != 3 || failure.Error() == "" {
		t.Fatalf("kind = %q, offset = %d, message = %q", failure.Kind(), offsetOf(t, failure), failure.Error())
	}
}

// Requirements: RQ-017
func TestStrictParseRejectsDuplicateKeys(t *testing.T) {
	for _, source := range []string{
		`{"a":1,"a":2}`,
		`{"a":1,"a":2}`,
		`{"nested":{"a":1,"a":2}}`,
		`[{"a":1,"a":2}]`,
		`{"\ud800":1,"\ud800":2}`,
	} {
		if _, err := parse(source); err != nil {
			t.Fatalf("Parse(%s) error = %v", source, err)
		}
		_, err := parseRejectDuplicates(source)
		failure := rejection(t, err)
		if want := uint64(strings.LastIndex(source, `,"`) + 1); failure.Kind() != "duplicate_object_key" || offsetOf(t, failure) != want {
			t.Fatalf("the strict parse of %s = %q at %d", source, failure.Kind(), offsetOf(t, failure))
		}
	}
}

// Requirements: RQ-017
func TestStrictParseAcceptsUniqueKeys(t *testing.T) {
	source := `{"a":1,"nested":[{"b":2}],"state":null}`
	parsed, err := parseRejectDuplicates(source)
	if err != nil {
		t.Fatal(err)
	}
	if text := must(compact(parsed)); text != source {
		t.Fatalf("Stringify() = %s", text)
	}
	_, err = parseRejectDuplicates("\xff")
	if failure := rejection(t, err); failure.Kind() != "invalid_utf8" || offsetOf(t, failure) != 0 {
		t.Fatalf("invalid UTF-8 error = %v", err)
	}
}

// Requirements: RQ-009
func TestStringValueKeepsAnUnpairedSurrogate(t *testing.T) {
	// change-string-value: a string with an unpaired surrogate has no Unicode text, so StringValue refuses it and the code
	// units keep it; it is never replaced by U+FFFD.
	lone := mustParse(t, `"a\ud800"`)
	if value, err := lone.StringValue(); !isKind(err, "unpaired_surrogate") {
		t.Fatalf("StringValue() = %q, %v", value, err)
	}
	if units := must(lone.StringUnits()); len(units) != 2 || units[0] != 'a' || units[1] != 0xd800 {
		t.Fatalf("StringUnits() = %v", units)
	}
	if value, err := mustParse(t, `"🌍"`).StringValue(); err != nil || value != "\U0001f30d" {
		t.Fatalf("StringValue() of a pair = %q, %v", value, err)
	}
}

// Requirements: RQ-008
func TestTextInputRejectsLoneSurrogates(t *testing.T) {
	// A literal unpaired surrogate has only its WTF-8 encoding in a Go string, which is no UTF-8: it is rejected before the
	// grammar is read, at the byte of the surrogate.
	for source, offset := range map[string]uint64{"[\"\xed\xa0\x80\"]": 2, "[\"\xed\xb0\x80\"]": 2, "{\"\xed\xa0\x80\":1}": 2, "[\"\xed\xa0\x80": 2} {
		_, err := parse(source)
		if failure := rejection(t, err); failure.Kind() != "invalid_utf8" || offsetOf(t, failure) != offset {
			t.Fatalf("Parse(%q) error = %v", source, err)
		}
	}
}

// Requirements: RQ-003
func TestArraysAndObjectsStayDistinct(t *testing.T) {
	items, err := mustParse(t, "[3,1,2]").Items()
	if err != nil {
		t.Fatal(err)
	}
	for index, want := range []string{"3", "1", "2"} {
		if literal := must(items[index].NumberLiteral()); literal != want {
			t.Fatalf("item %d = %s, want %s", index, literal, want)
		}
	}
	// change-kind-enum: the kinds are the constants Kind<Name> of the enum Kind.
	if must(mustParse(t, "[]").Kind()) != json.KindArray || must(mustParse(t, "{}").Kind()) != json.KindObject {
		t.Fatal("[] and {} are not an array and an object")
	}
	text := `{"a":[],"b":{},"c":[{}]}`
	if written := must(compact(mustParse(t, text))); written != text {
		t.Fatalf("Stringify() = %s", written)
	}
}

// Requirements: RQ-010
func TestNumberTokensAreKeptExactly(t *testing.T) {
	tokens := []string{"1.0e+2", "-0", "0.10", "123456789012345678901234567890", "1E400"}
	items, err := mustParse(t, "["+strings.Join(tokens, ",")+"]").Items()
	if err != nil {
		t.Fatal(err)
	}
	for index, want := range tokens {
		if literal := must(items[index].NumberLiteral()); literal != want {
			t.Fatalf("item %d = %s, want %s", index, literal, want)
		}
	}
	for source, kind := range map[string]string{"NaN": "expected_value", "Infinity": "expected_value", "-Infinity": "expected_digit", "[NaN]": "expected_value"} {
		_, err := parse(source)
		if failure := rejection(t, err); failure.Kind() != kind {
			t.Fatalf("Parse(%s) error = %v", source, err)
		}
	}
}

// Requirements: RQ-011
func TestSerializationIsIdempotent(t *testing.T) {
	once := must(compact(mustParse(t, ` { "b" : 1 , "a" : 2 , "b" : 3 } `)))
	if once != `{"b":3,"a":2}` {
		t.Fatalf("Stringify() = %s", once)
	}
	if again := must(compact(mustParse(t, once))); again != once {
		t.Fatalf("Stringify(Parse(%s)) = %s", once, again)
	}
}
