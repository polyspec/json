// Adapter only. The common verifier supplies every example and expectation. The probe of the Go binding json, the probe of
// the legacy package with no change beyond the changes of packages/rust/interface.json, each named where it applies (T3.25).
package main

import (
	"bufio"
	stdjson "encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	json "github.com/polyspec/json/packages/go"
	jsonerrors "github.com/polyspec/json/packages/go/errors"
)

// must returns the value of a call that the probe expects to succeed; its error ends the probe.
func must[T any](value T, err error) T {
	if err != nil {
		panic(err)
	}
	return value
}

func quote(s string) string {
	return string(must(stdjson.Marshal(s)))
}

// compact is the text of a value (change-stringify: Stringify is the one serializer).
func compact(v *json.Value) string {
	return must(json.Stringify(v, json.StringifyOptions{}))
}

// text is the JSON string of a string value, read from its code units (change-string-value: a string with an unpaired
// surrogate has no Unicode text; change-from-units: it is built from its code units).
func text(v *json.Value) string {
	return compact(must(json.ValueFromUnits(must(v.StringUnits()))))
}

// entries holds the members of an object in their order (change-ordered-map: the keys of an OrderedMap are values).
func entries(v *json.Value) [][2]*json.Value {
	pairs := [][2]*json.Value{}
	for key, value := range must(must(v.Members()).Entries()) {
		pairs = append(pairs, [2]*json.Value{key, value})
	}
	return pairs
}

func tree(v *json.Value) string {
	// change-kind-enum: the kinds are the constants Kind<Name> of the enum Kind.
	switch must(v.Kind()) {
	case json.KindObject:
		parts := []string{}
		for _, entry := range entries(v) {
			parts = append(parts, "["+text(entry[0])+","+tree(entry[1])+"]")
		}
		return `["object",[` + strings.Join(parts, ",") + `]]`
	case json.KindArray:
		parts := []string{}
		for _, item := range must(v.Items()) {
			parts = append(parts, tree(item))
		}
		return `["array",[` + strings.Join(parts, ",") + `]]`
	case json.KindString:
		return `["string",` + text(v) + `]`
	case json.KindNumber:
		return `["number",` + quote(must(v.NumberLiteral())) + `]`
	case json.KindBoolean:
		return fmt.Sprintf(`["boolean",%t]`, must(v.BooleanValue()))
	default:
		return `["null"]`
	}
}

func rebuild(v *json.Value) *json.Value {
	switch must(v.Kind()) {
	case json.KindObject:
		pairs := entries(v)
		outMembers := must(json.NewOrderedMap())
		for _, entry := range pairs {
			must(outMembers.Insert(entry[0], must(json.ValueNull())))
		}
		for i := len(pairs) - 1; i >= 0; i-- {
			must(outMembers.Insert(pairs[i][0], rebuild(pairs[i][1])))
		}
		return must(json.ValueObject(outMembers))
	case json.KindArray:
		items := must(v.Items())
		for i, item := range items {
			items[i] = rebuild(item)
		}
		return must(json.ValueArray(items))
	default:
		return v
	}
}

func discard[T any](_ T, err error) error { return err }

// call is the reply to an argument request {"call": call, "argument": argument} of the shared verifier.
func call(line string) string {
	// change-parse-source: the one Parse takes the bytes.
	request := must(json.Parse([]byte(line), json.ParseOptions{}))
	argument := must(request.Get("argument"))
	name := must(must(request.Get("call")).StringValue())
	switch name {
	case "number":
		return outcome(discard(json.ValueNumber(must(argument.StringValue()))))
	case "max_depth":
		// change-parse-options: the depth limit is a field of the options of Parse.
		limit := must(strconv.ParseInt(must(argument.NumberLiteral()), 10, 64))
		return outcome(discard(json.Parse([]byte("1"), json.ParseOptions{MaxDepth: &limit})))
	case "string_value":
		return outcome(discard(argument.StringValue()))
	case "object_key":
		// change-ordered-map: an object takes an OrderedMap whose keys are values.
		return outcome(discard(must(json.NewOrderedMap()).Insert(argument, must(json.ValueNull()))))
	}
	panic("unknown call " + name)
}

// outcome is the reply to an argument request whose function returned err (change-errors: every error of the binding
// names its kind).
func outcome(err error) string {
	if err == nil {
		return `{"ok":true}`
	}
	var failure interface {
		error
		Kind() string
	}
	if !errors.As(err, &failure) {
		panic(err)
	}
	return `{"ok":false,"kind":` + quote(failure.Kind()) + "}"
}

func main() {
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		if line := scanner.Text(); strings.HasPrefix(line, "{") {
			fmt.Println(call(line))
			continue
		}
		source := must(os.ReadFile(scanner.Text()))
		value, err := json.Parse(source, json.ParseOptions{})
		if err != nil {
			// change-errors: a rejection is a *ParseError with its offset; change-offsets: every offset counts bytes.
			var failure *jsonerrors.ParseError
			if !errors.As(err, &failure) || failure.Offset() == nil {
				panic(err)
			}
			fmt.Printf("{\"ok\":false,\"offset\":%d,\"unit\":\"byte\",\"kind\":%s}\n", *failure.Offset(), quote(failure.Kind()))
			continue
		}
		serialized := compact(value)
		roundtripValue := must(json.Parse([]byte(serialized), json.ParseOptions{}))
		factory := compact(must(json.ValueString("quote \" slash \\ line\n 한 🌍")))
		fmt.Printf("{\"ok\":true,\"raw\":%s,\"serialized\":%s,\"compact\":%s,\"tree\":%s,\"roundtrip\":%s,\"roundtrip_tree\":%s,\"rebuilt\":%s,\"factory\":%s}\n",
			quote(must(value.Raw())), quote(serialized), quote(compact(value)), tree(value), quote(compact(roundtripValue)), tree(roundtripValue), quote(compact(rebuild(value))), quote(factory))
	}
	if err := scanner.Err(); err != nil {
		panic(err)
	}
}
