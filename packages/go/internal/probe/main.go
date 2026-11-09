// Adapter only. The common verifier supplies every example and expectation.
package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/polyspec/ordered-json/packages/go"
	"os"
	"strings"
)

func quote(s string) string {
	out, err := json.Marshal(s)
	if err != nil {
		panic(err)
	}
	return string(out)
}
func text(v *orderedjson.Value) string {
	units, err := v.StringUnits()
	if err != nil {
		panic(err)
	}
	return orderedjson.StringFromUnits(units).Raw()
}
func tree(v *orderedjson.Value) string {
	switch v.Kind() {
	case orderedjson.ObjectKind:
		members, err := v.Members()
		if err != nil {
			panic(err)
		}
		parts := []string{}
		for _, key := range members.Keys() {
			units, err := key.StringUnits()
			if err != nil {
				panic(err)
			}
			parts = append(parts, "["+text(key)+","+tree(members.GetUnits(units))+"]")
		}
		return `["object",[` + strings.Join(parts, ",") + `]]`
	case orderedjson.ArrayKind:
		items, err := v.Items()
		if err != nil {
			panic(err)
		}
		parts := []string{}
		for _, item := range items {
			parts = append(parts, tree(item))
		}
		return `["array",[` + strings.Join(parts, ",") + `]]`
	case orderedjson.StringKind:
		return `["string",` + text(v) + `]`
	case orderedjson.NumberKind:
		raw, err := v.NumberLiteral()
		if err != nil {
			panic(err)
		}
		return `["number",` + quote(raw) + `]`
	case orderedjson.BooleanKind:
		value, err := v.BooleanValue()
		if err != nil {
			panic(err)
		}
		return fmt.Sprintf(`["boolean",%t]`, value)
	default:
		return `["null"]`
	}
}
func rebuild(v *orderedjson.Value) *orderedjson.Value {
	switch v.Kind() {
	case orderedjson.ObjectKind:
		members, err := v.Members()
		if err != nil {
			panic(err)
		}
		outMembers := &orderedjson.OrderedMap{}
		keys := members.Keys()
		for _, key := range keys {
			if err := outMembers.Set(key, orderedjson.Null()); err != nil {
				panic(err)
			}
		}
		for i := len(keys) - 1; i >= 0; i-- {
			key := keys[i]
			units, err := key.StringUnits()
			if err != nil {
				panic(err)
			}
			if err := outMembers.Set(key, rebuild(v.GetUnits(units))); err != nil {
				panic(err)
			}
		}
		out, err := orderedjson.Object(outMembers)
		if err != nil {
			panic(err)
		}
		return out
	case orderedjson.ArrayKind:
		items, err := v.Items()
		if err != nil {
			panic(err)
		}
		for i, item := range items {
			items[i] = rebuild(item)
		}
		out, err := orderedjson.Array(items)
		if err != nil {
			panic(err)
		}
		return out
	default:
		return v
	}
}
func main() {
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		source, err := os.ReadFile(scanner.Text())
		if err != nil {
			panic(err)
		}
		value, err := orderedjson.ParseBytes(source)
		if err != nil {
			var failure orderedjson.Error
			if !errors.As(err, &failure) {
				panic(err)
			}
			fmt.Printf("{\"ok\":false,\"offset\":%d,\"unit\":\"byte\",\"kind\":%s}\n",
				failure.Offset(), quote(string(failure.Kind())))
			continue
		}
		compact, err := value.Compact()
		if err != nil {
			panic(err)
		}
		rebuilt, err := rebuild(value).Compact()
		if err != nil {
			panic(err)
		}
		serialized, err := orderedjson.Stringify(value)
		if err != nil {
			panic(err)
		}
		roundtripValue, err := orderedjson.ParseBytes([]byte(serialized))
		if err != nil {
			panic(err)
		}
		roundtrip, err := roundtripValue.Compact()
		if err != nil {
			panic(err)
		}
		factoryValue, err := orderedjson.String("quote \" slash \\ line\n 한 🌍")
		if err != nil {
			panic(err)
		}
		factory, err := factoryValue.Compact()
		if err != nil {
			panic(err)
		}
		fmt.Printf("{\"ok\":true,\"raw\":%s,\"serialized\":%s,\"compact\":%s,\"tree\":%s,\"roundtrip\":%s,\"roundtrip_tree\":%s,\"rebuilt\":%s,\"factory\":%s}\n",
			quote(value.Raw()), quote(serialized), quote(compact), tree(value), quote(roundtrip), tree(roundtripValue), quote(rebuilt), quote(factory))
	}
	if err := scanner.Err(); err != nil {
		panic(err)
	}
}
