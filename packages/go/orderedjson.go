// Package orderedjson preserves JSON document order at every object depth.
package orderedjson

import (
	"fmt"
	"strings"
	"unicode/utf16"
	"unicode/utf8"
)

const MaxDepth = 256

type Kind string

const (
	ObjectKind  Kind = "object"
	ArrayKind   Kind = "array"
	StringKind  Kind = "string"
	NumberKind  Kind = "number"
	BooleanKind Kind = "boolean"
	NullKind    Kind = "null"
)

// Internal kind codes index kindNames; zero marks an invalid Value.
const (
	invalidKind uint8 = iota
	objectKind
	arrayKind
	stringKind
	numberKind
	booleanKind
	nullKind
)

var kindNames = [...]Kind{invalidKind: "", objectKind: ObjectKind, arrayKind: ArrayKind,
	stringKind: StringKind, numberKind: NumberKind, booleanKind: BooleanKind, nullKind: NullKind}

const (
	// flagCompact marks a value whose compact form is exactly its source token:
	// it contains no insignificant whitespace and no duplicate object keys.
	flagCompact uint8 = 1 << iota
	// flagRoot marks a parse result; its Raw text includes surrounding whitespace.
	flagRoot
	// flagRejectDuplicates is a parser flag only: a repeated decoded key is an error, not an overwrite.
	flagRejectDuplicates
	// flagEscaped marks a string token that contains escape sequences.
	flagEscaped
)

// Objects with more members than this keep a hash index; smaller ones scan linearly.
const linearMembers = 8

// Parsed values are allocated in chunks of at most this many values.
const maxChunk = 1024

// ErrorKind names why the module refused an input, the same name in every implementation: the rejection kinds of the
// parser, DuplicateObjectKey of the strict parse and the kinds of a refused argument.
type ErrorKind string

const (
	ExpectedValueError             ErrorKind = "expected_value"
	ExpectedDigitError             ErrorKind = "expected_digit"
	ExpectedColonError             ErrorKind = "expected_colon"
	ExpectedDelimiterError         ErrorKind = "expected_delimiter"
	ExpectedObjectKeyError         ErrorKind = "expected_object_key"
	InvalidEscapeError             ErrorKind = "invalid_escape"
	InvalidUnicodeEscapeError      ErrorKind = "invalid_unicode_escape"
	UnfinishedEscapeError          ErrorKind = "unfinished_escape"
	UnterminatedStringError        ErrorKind = "unterminated_string"
	UnescapedControlCharacterError ErrorKind = "unescaped_control_character"
	InvalidUTF8Error               ErrorKind = "invalid_utf8"
	MaximumDepthExceededError      ErrorKind = "maximum_depth_exceeded"
	TrailingInputError             ErrorKind = "trailing_input"
	DuplicateObjectKeyError        ErrorKind = "duplicate_object_key"
	NonStringKeyError              ErrorKind = "non_string_key"
	WrongKindError                 ErrorKind = "wrong_kind"
	InvalidNumberLiteralError      ErrorKind = "invalid_number_literal"
	DepthLimitOutOfRangeError      ErrorKind = "depth_limit_out_of_range"
	InvalidArgumentTypeError       ErrorKind = "invalid_argument_type"
)

// Error is every error of the module. Only the module makes one, so each carries one of the ErrorKind constants.
type Error interface {
	error
	// Kind reports why the input was refused.
	Kind() ErrorKind
	// Offset is the byte offset of a rejection in its document, and zero for a refused argument.
	Offset() int
	// Message is the Go wording of the kind.
	Message() string
}

type failure struct {
	offset int
	kind   ErrorKind
}

// messages holds the wording of every ErrorKind constant.
var messages = map[ErrorKind]string{
	ExpectedValueError:             "expected JSON value",
	ExpectedDigitError:             "expected digit",
	ExpectedColonError:             "expected colon",
	ExpectedDelimiterError:         "expected comma or closing delimiter",
	ExpectedObjectKeyError:         "expected string",
	InvalidEscapeError:             "invalid escape",
	InvalidUnicodeEscapeError:      "invalid Unicode escape",
	UnfinishedEscapeError:          "unfinished escape",
	UnterminatedStringError:        "unterminated string",
	UnescapedControlCharacterError: "unescaped control character",
	InvalidUTF8Error:               "invalid UTF-8",
	MaximumDepthExceededError:      "maximum nesting depth exceeded",
	TrailingInputError:             "unexpected trailing input",
	DuplicateObjectKeyError:        "duplicate object key",
	NonStringKeyError:              "object key must be string",
	WrongKindError:                 "value is of another kind",
	InvalidNumberLiteralError:      "expected number literal without whitespace",
	DepthLimitOutOfRangeError:      "maxDepth must be between 0 and 256",
	InvalidArgumentTypeError:       "expected an orderedjson Value or OrderedMap",
}

func (e *failure) Kind() ErrorKind { return e.kind }
func (e *failure) Offset() int     { return e.offset }
func (e *failure) Message() string { return messages[e.kind] }
func (e *failure) Error() string   { return fmt.Sprintf("%s at byte %d", e.Message(), e.offset) }

// rejection is a refusal of the document at a byte offset; refusal is a refused argument, which has no offset.
func rejection(offset int, kind ErrorKind) error { return &failure{offset, kind} }
func refusal(kind ErrorKind) error               { return &failure{0, kind} }

// OrderedMap associates each key with one value and retains its insertion position.
// Its zero value is an empty map. Keys returns JSON string values in that order.
type OrderedMap struct {
	state *orderedMapState
}

type orderedMapState struct {
	keys    []*Value
	values  []*Value
	indices map[string]int // nil while len(keys) <= linearMembers
}

// unitsName is a lossless identity for decoded JSON keys: UTF-8, with lone
// surrogates encoded as WTF-8. Unescaped key tokens already have this form.
func unitsName(units []uint16) string {
	out := make([]byte, 0, len(units)*3)
	for i := 0; i < len(units); i++ {
		r := rune(units[i])
		if r >= 0xd800 && r <= 0xdbff && i+1 < len(units) && units[i+1] >= 0xdc00 && units[i+1] <= 0xdfff {
			r = utf16.DecodeRune(r, rune(units[i+1]))
			i++
		}
		switch {
		case r < 0x80:
			out = append(out, byte(r))
		case r < 0x800:
			out = append(out, 0xc0|byte(r>>6), 0x80|byte(r)&0x3f)
		case r < 0x10000:
			out = append(out, 0xe0|byte(r>>12), 0x80|byte(r>>6)&0x3f, 0x80|byte(r)&0x3f)
		default:
			out = append(out, 0xf0|byte(r>>18), 0x80|byte(r>>12)&0x3f, 0x80|byte(r>>6)&0x3f, 0x80|byte(r)&0x3f)
		}
	}
	return string(out)
}

// decodeUnits decodes the contents of a validated string token.
func decodeUnits(content string) []uint16 {
	units := make([]uint16, 0, len(content))
	for i := 0; i < len(content); {
		ch := content[i]
		switch {
		case ch == '\\':
			escape := content[i+1]
			i += 2
			switch escape {
			case 'u':
				var u uint16
				for end := i + 4; i < end; i++ {
					d, _ := hex(content[i])
					u = u<<4 | d
				}
				units = append(units, u)
			case 'b':
				units = append(units, 8)
			case 'f':
				units = append(units, 12)
			case 'n':
				units = append(units, 10)
			case 'r':
				units = append(units, 13)
			case 't':
				units = append(units, 9)
			default:
				units = append(units, uint16(escape))
			}
		case ch < utf8.RuneSelf:
			units = append(units, uint16(ch))
			i++
		default:
			r, width := utf8.DecodeRuneInString(content[i:])
			if r >= 0x10000 {
				hi, lo := utf16.EncodeRune(r)
				units = append(units, uint16(hi), uint16(lo))
			} else {
				units = append(units, uint16(r))
			}
			i += width
		}
	}
	return units
}

func (s *orderedMapState) find(name string) int {
	if s.indices != nil {
		if index, ok := s.indices[name]; ok {
			return index
		}
		return -1
	}
	for index, key := range s.keys {
		if key.name() == name {
			return index
		}
	}
	return -1
}

func (m *OrderedMap) Set(key, value *Value) error {
	if key.Kind() != StringKind {
		return refusal(NonStringKeyError)
	}
	if !value.valid() {
		return refusal(InvalidArgumentTypeError)
	}
	if m.state == nil {
		m.state = &orderedMapState{}
	}
	name := key.name()
	if index := m.state.find(name); index >= 0 {
		m.state.values[index] = value
		return nil
	}
	m.state.keys = append(m.state.keys, key)
	m.state.values = append(m.state.values, value)
	if m.state.indices != nil {
		m.state.indices[name] = len(m.state.keys) - 1
	} else if len(m.state.keys) > linearMembers {
		m.state.indices = make(map[string]int, len(m.state.keys))
		for index, key := range m.state.keys {
			m.state.indices[key.name()] = index
		}
	}
	return nil
}
func (m *OrderedMap) get(name string) *Value {
	if m.state == nil {
		return nil
	}
	index := m.state.find(name)
	if index < 0 {
		return nil
	}
	return m.state.values[index]
}
func (m *OrderedMap) GetUnits(key []uint16) *Value {
	if m.state == nil {
		return nil
	}
	return m.get(unitsName(key))
}
func (m *OrderedMap) Get(key string) *Value {
	if !utf8.ValidString(key) {
		return nil
	}
	return m.get(key)
}
func (m *OrderedMap) orderedKeys() []*Value {
	if m.state == nil {
		return nil
	}
	return m.state.keys
}
func (m *OrderedMap) Keys() []*Value { return append([]*Value{}, m.orderedKeys()...) }
func (m *OrderedMap) Len() int       { return len(m.orderedKeys()) }
func (m *OrderedMap) clone() *OrderedMap {
	out := &OrderedMap{}
	if m.state == nil {
		return out
	}
	out.state = &orderedMapState{keys: m.Keys(), values: append([]*Value{}, m.state.values...)}
	if m.state.indices != nil {
		out.state.indices = make(map[string]int, len(m.state.indices))
		for key, index := range m.state.indices {
			out.state.indices[key] = index
		}
	}
	return out
}

// Value is immutable. Construct values with Parse or the factory functions.
// The zero value is invalid. Members and Items return independent map/slice copies.
type Value struct {
	source     string
	start, end int // value token; a root's Raw text also includes surrounding whitespace
	kind       uint8
	flags      uint8
	members    OrderedMap
	items      []*Value
}

func (v *Value) valid() bool { return v != nil && v.kind != invalidKind }
func (v *Value) Kind() Kind {
	if !v.valid() {
		return ""
	}
	return kindNames[v.kind]
}
func (v *Value) Raw() string {
	if !v.valid() {
		return ""
	}
	if v.flags&flagRoot != 0 {
		return v.source
	}
	return v.source[v.start:v.end]
}

// name returns the key identity of a string value; see unitsName.
func (v *Value) name() string {
	content := v.source[v.start+1 : v.end-1]
	if v.flags&flagEscaped == 0 {
		return content
	}
	return unitsName(decodeUnits(content))
}

// String implements fmt.Stringer. A Value that does not serialize has no text, so String panics with the error rather
// than return an empty string that looks like a value (P8).
func (v *Value) String() string {
	out, err := v.Compact()
	if err != nil {
		panic(err)
	}
	return out
}
func (v *Value) Members() (*OrderedMap, error) {
	if v.Kind() != ObjectKind {
		return nil, refusal(WrongKindError)
	}
	return v.members.clone(), nil
}
func (v *Value) Items() ([]*Value, error) {
	if v.Kind() != ArrayKind {
		return nil, refusal(WrongKindError)
	}
	return append([]*Value{}, v.items...), nil
}
func (v *Value) StringUnits() ([]uint16, error) {
	if v.Kind() != StringKind {
		return nil, refusal(WrongKindError)
	}
	return decodeUnits(v.source[v.start+1 : v.end-1]), nil
}
func (v *Value) StringValue() (string, error) {
	if v.Kind() != StringKind {
		return "", refusal(WrongKindError)
	}
	content := v.source[v.start+1 : v.end-1]
	if v.flags&flagEscaped == 0 {
		return content, nil
	}
	// An unpaired surrogate has no UTF-8 encoding; the string value keeps it as WTF-8, the form of the keys (unitsName).
	return unitsName(decodeUnits(content)), nil
}
func (v *Value) NumberLiteral() (string, error) {
	if v.Kind() != NumberKind {
		return "", refusal(WrongKindError)
	}
	return strings.TrimSpace(v.Raw()), nil
}
func (v *Value) BooleanValue() (bool, error) {
	if v.Kind() != BooleanKind {
		return false, refusal(WrongKindError)
	}
	return strings.TrimSpace(v.Raw()) == "true", nil
}
func (v *Value) GetUnits(key []uint16) *Value {
	if v.Kind() != ObjectKind {
		return nil
	}
	return v.members.GetUnits(key)
}
func (v *Value) Get(key string) *Value {
	if !utf8.ValidString(key) || v.Kind() != ObjectKind {
		return nil
	}
	return v.members.get(key)
}
func String(text string) (*Value, error) {
	if !utf8.ValidString(text) {
		return nil, refusal(InvalidUTF8Error)
	}
	return StringFromUnits(utf16.Encode([]rune(text))), nil
}
func StringFromUnits(units []uint16) *Value {
	var out strings.Builder
	out.WriteByte('"')
	for _, u := range units {
		if writeShortEscape(&out, rune(u)) {
			continue
		}
		if u >= 0x20 && u <= 0x7e {
			out.WriteByte(byte(u))
		} else {
			fmt.Fprintf(&out, "\\u%04x", u)
		}
	}
	out.WriteByte('"')
	return mustBuild(out.String())
}
func Number(literal string) (*Value, error) {
	v, err := Parse(literal)
	if err != nil {
		return nil, err
	}
	if v.kind != numberKind || strings.TrimSpace(literal) != literal {
		return nil, refusal(InvalidNumberLiteralError)
	}
	return v, nil
}

// mustBuild parses a literal that this package builds itself. Such a literal always parses, so a failure is a defect of
// the package and panics with the literal instead of returning a Value that is nil.
func mustBuild(literal string) *Value {
	v, err := Parse(literal)
	if err != nil {
		panic(fmt.Sprintf("orderedjson: built literal %q does not parse: %v", literal, err))
	}
	return v
}
func Boolean(value bool) *Value {
	if value {
		return mustBuild("true")
	}
	return mustBuild("false")
}
func Null() *Value { return mustBuild("null") }
func Array(items []*Value) (*Value, error) {
	parts := make([]string, len(items))
	for i, v := range items {
		if !v.valid() {
			return nil, refusal(InvalidArgumentTypeError)
		}
		part, err := v.Compact()
		if err != nil {
			return nil, err
		}
		parts[i] = part
	}
	return Parse("[" + strings.Join(parts, ",") + "]")
}
func Object(members *OrderedMap) (*Value, error) {
	if members == nil {
		return nil, refusal(InvalidArgumentTypeError)
	}
	parts := make([]string, members.Len())
	for i, key := range members.orderedKeys() {
		child, err := members.state.values[i].Compact()
		if err != nil {
			return nil, err
		}
		parts[i] = strings.TrimSpace(key.Raw()) + ":" + child
	}
	return Parse("{" + strings.Join(parts, ",") + "}")
}
func Stringify(value *Value) (string, error) {
	if !value.valid() {
		return "", refusal(InvalidArgumentTypeError)
	}
	return value.Compact()
}

// MarshalJSON integrates with encoding/json while preserving ordered-json values.
func (v *Value) MarshalJSON() ([]byte, error) {
	raw, err := Stringify(v)
	return []byte(raw), err
}

// UnmarshalJSON parses the document of a field with the parser of the library, so the value keeps its order, its number
// tokens and its unpaired surrogates, and a document that the parser rejects is an error of the decoder.
func (v *Value) UnmarshalJSON(data []byte) error {
	parsed, err := ParseBytes(data)
	if err != nil {
		return err
	}
	*v = *parsed
	return nil
}
func (v *Value) Compact() (string, error) {
	if !v.valid() {
		return "", refusal(InvalidArgumentTypeError)
	}
	if v.flags&flagCompact != 0 {
		return v.source[v.start:v.end], nil
	}
	var out strings.Builder
	out.Grow(v.end - v.start)
	v.writeJSON(&out)
	return out.String(), nil
}
func (v *Value) writeJSON(out *strings.Builder) {
	if v.flags&flagCompact != 0 {
		out.WriteString(v.source[v.start:v.end])
		return
	}
	switch v.kind {
	case objectKind:
		out.WriteByte('{')
		for i, key := range v.members.orderedKeys() {
			if i > 0 {
				out.WriteByte(',')
			}
			out.WriteString(key.source[key.start:key.end])
			out.WriteByte(':')
			v.members.state.values[i].writeJSON(out)
		}
		out.WriteByte('}')
	case arrayKind:
		out.WriteByte('[')
		for i, item := range v.items {
			if i > 0 {
				out.WriteByte(',')
			}
			item.writeJSON(out)
		}
		out.WriteByte(']')
	default:
		out.WriteString(v.source[v.start:v.end])
	}
}

func Parse(source string) (*Value, error)      { return ParseWithMaxDepth(source, MaxDepth) }
func ParseBytes(source []byte) (*Value, error) { return Parse(string(source)) }

func ParseWithMaxDepth(source string, maxDepth int) (*Value, error) {
	return parse(source, maxDepth, 0)
}

// ParseRejectDuplicates parses source with the normal grammar and the default depth limit, but rejects a repeated decoded
// object key at any depth with the message "duplicate object key" at the first byte of the second key.
func ParseRejectDuplicates(source string) (*Value, error) {
	return parse(source, MaxDepth, flagRejectDuplicates)
}

// utf8.ValidString reports only that an invalid sequence exists, so the error
// position comes from the first one.
func firstInvalidByte(source string) int {
	for i := 0; i < len(source); {
		r, size := utf8.DecodeRuneInString(source[i:])
		if r == utf8.RuneError && size <= 1 {
			return i
		}
		i += size
	}
	return len(source)
}

func parse(source string, maxDepth int, flags uint8) (*Value, error) {
	if maxDepth < 0 || maxDepth > MaxDepth {
		return nil, refusal(DepthLimitOutOfRangeError)
	}
	if !utf8.ValidString(source) {
		return nil, rejection(firstInvalidByte(source), InvalidUTF8Error)
	}
	p := parser{source: source, maxDepth: maxDepth, flags: flags, estimate: -1}
	v, err := p.value(0)
	if err != nil {
		return nil, err
	}
	p.ws()
	if p.pos != len(source) {
		return nil, p.fail(TrailingInputError)
	}
	v.flags |= flagRoot
	return v, nil
}

type member struct {
	name       string
	key, value *Value
}

type parser struct {
	source                 string
	pos, maxDepth          int
	flags                  uint8
	whitespace, duplicates int
	estimate, chunks       int      // estimated value count (-1 until counted); chunks allocated
	slab                   []Value  // values are allocated in chunks
	items                  []*Value // pending array items of open arrays
	members                []member // pending members of open objects
}

func (p *parser) newValue(kind uint8, start int, flags uint8) *Value {
	if len(p.slab) == cap(p.slab) {
		// A scalar document allocates only its value; others size chunks by their separators.
		size := 1
		if p.chunks == 1 {
			size = p.nodes()
		} else if p.chunks > 1 {
			size = max(p.nodes()/2, 16)
		}
		p.slab = make([]Value, 0, min(max(size, 1), maxChunk))
		p.chunks++
	}
	p.slab = p.slab[:len(p.slab)+1]
	v := &p.slab[len(p.slab)-1]
	v.source, v.start, v.end, v.kind, v.flags = p.source, start, p.pos, kind, flags|p.flags&^flagRejectDuplicates
	return v
}

// nodes estimates the number of values in the document from its separators.
func (p *parser) nodes() int {
	if p.estimate < 0 {
		s := p.source
		p.estimate = strings.Count(s, ",") + strings.Count(s, ":") + strings.Count(s, "[") + strings.Count(s, "{")
	}
	return p.estimate
}
func (p *parser) peek() byte {
	if p.pos >= len(p.source) {
		return 0
	}
	return p.source[p.pos]
}
func (p *parser) fail(kind ErrorKind) error { return rejection(p.pos, kind) }
func (p *parser) ws() {
	pos := p.pos
	for pos < len(p.source) {
		if ch := p.source[pos]; ch != ' ' && ch != '\t' && ch != '\n' && ch != '\r' {
			break
		}
		pos++
	}
	p.whitespace += pos - p.pos
	p.pos = pos
}
func (p *parser) expect(ch byte, kind ErrorKind) error {
	if p.peek() != ch {
		return p.fail(kind)
	}
	p.pos++
	return nil
}
func hex(ch byte) (uint16, bool) {
	switch {
	case ch >= '0' && ch <= '9':
		return uint16(ch - '0'), true
	case ch >= 'a' && ch <= 'f':
		return uint16(ch - 'a' + 10), true
	case ch >= 'A' && ch <= 'F':
		return uint16(ch - 'A' + 10), true
	}
	return 0, false
}

// string validates a string token and reports whether it contains escapes.
func (p *parser) string() (bool, error) {
	if err := p.expect('"', ExpectedObjectKeyError); err != nil {
		return false, err
	}
	escaped := false
	for p.pos < len(p.source) {
		ch := p.source[p.pos]
		p.pos++
		switch {
		case ch == '"':
			return escaped, nil
		case ch < 32:
			// The scanner has consumed the offending byte; the offset names it.
			return false, rejection(p.pos-1, UnescapedControlCharacterError)
		case ch == '\\':
			if p.pos >= len(p.source) {
				return false, p.fail(UnfinishedEscapeError)
			}
			escape := p.source[p.pos]
			p.pos++
			escaped = true
			switch escape {
			case 'u':
				for i := 0; i < 4; i++ {
					if _, ok := hex(p.peek()); !ok {
						return false, p.fail(InvalidUnicodeEscapeError)
					}
					p.pos++
				}
			case '"', '\\', '/', 'b', 'f', 'n', 'r', 't':
			default:
				// The escape character has been consumed; the offset names it.
				return false, rejection(p.pos-1, InvalidEscapeError)
			}
		}
	}
	return false, p.fail(UnterminatedStringError)
}
func isDigit(ch byte) bool { return ch >= '0' && ch <= '9' }
func (p *parser) digits() error {
	if !isDigit(p.peek()) {
		return p.fail(ExpectedDigitError)
	}
	for isDigit(p.peek()) {
		p.pos++
	}
	return nil
}
func (p *parser) value(depth int) (*Value, error) {
	p.ws()
	start := p.pos
	switch ch := p.peek(); {
	case ch == '{' || ch == '[':
		return p.container(depth, start, ch == '{')
	case ch == '"':
		escaped, err := p.string()
		if err != nil {
			return nil, err
		}
		flags := flagCompact
		if escaped {
			flags |= flagEscaped
		}
		return p.newValue(stringKind, start, flags), nil
	case ch == '-' || isDigit(ch):
		if ch == '-' {
			p.pos++
		}
		if p.peek() == '0' {
			p.pos++
		} else if err := p.digits(); err != nil {
			return nil, err
		}
		if p.peek() == '.' {
			p.pos++
			if err := p.digits(); err != nil {
				return nil, err
			}
		}
		if p.peek() == 'e' || p.peek() == 'E' {
			p.pos++
			if p.peek() == '+' || p.peek() == '-' {
				p.pos++
			}
			if err := p.digits(); err != nil {
				return nil, err
			}
		}
		return p.newValue(numberKind, start, flagCompact), nil
	case ch == 't' && strings.HasPrefix(p.source[p.pos:], "true"):
		p.pos += 4
		return p.newValue(booleanKind, start, flagCompact), nil
	case ch == 'f' && strings.HasPrefix(p.source[p.pos:], "false"):
		p.pos += 5
		return p.newValue(booleanKind, start, flagCompact), nil
	case ch == 'n' && strings.HasPrefix(p.source[p.pos:], "null"):
		p.pos += 4
		return p.newValue(nullKind, start, flagCompact), nil
	}
	return nil, p.fail(ExpectedValueError)
}
func (p *parser) container(depth, start int, object bool) (*Value, error) {
	if depth >= p.maxDepth {
		return nil, p.fail(MaximumDepthExceededError)
	}
	close, kind, base := byte(']'), arrayKind, len(p.items)
	if object {
		close, kind, base = '}', objectKind, len(p.members)
	}
	whitespace, duplicates := p.whitespace, p.duplicates
	var index map[string]int
	p.pos++
	p.ws()
	if p.peek() != close {
		for {
			if object {
				keyStart := p.pos
				escaped, err := p.string()
				if err != nil {
					return nil, err
				}
				flags := flagCompact
				if escaped {
					flags |= flagEscaped
				}
				key := p.newValue(stringKind, keyStart, flags)
				p.ws()
				if err := p.expect(':', ExpectedColonError); err != nil {
					return nil, err
				}
				child, err := p.value(depth + 1)
				if err != nil {
					return nil, err
				}
				duplicates := p.duplicates
				index = p.addMember(base, index, key, child)
				if p.flags&flagRejectDuplicates != 0 && p.duplicates != duplicates {
					return nil, rejection(keyStart, DuplicateObjectKeyError)
				}
			} else {
				child, err := p.value(depth + 1)
				if err != nil {
					return nil, err
				}
				if cap(p.items) == 0 {
					p.items = make([]*Value, 0, min(max(p.nodes(), 4), maxChunk))
				}
				p.items = append(p.items, child)
			}
			p.ws()
			if p.peek() == close {
				break
			}
			if err := p.expect(',', ExpectedDelimiterError); err != nil {
				return nil, err
			}
			p.ws()
		}
	}
	p.pos++
	flags := uint8(0)
	if p.whitespace == whitespace && p.duplicates == duplicates {
		flags = flagCompact
	}
	v := p.newValue(kind, start, flags)
	if object {
		if members := p.members[base:]; len(members) > 0 {
			n := len(members)
			pointers := make([]*Value, 2*n)
			state := &orderedMapState{keys: pointers[:n:n], values: pointers[n:], indices: index}
			for i, m := range members {
				state.keys[i], state.values[i] = m.key, m.value
			}
			v.members.state = state
			p.members = p.members[:base]
		}
	} else if items := p.items[base:]; len(items) > 0 {
		if depth == 0 {
			// The root array is the last user of the stack.
			v.items = items[:len(items):len(items)]
			p.items = nil
		} else {
			v.items = make([]*Value, len(items))
			copy(v.items, items)
			p.items = p.items[:base]
		}
	}
	return v, nil
}

// addMember records a parsed member of the object whose pending members start at base.
// A repeated key keeps its first position and token and takes the new value.
func (p *parser) addMember(base int, index map[string]int, key, value *Value) map[string]int {
	name := key.name()
	members := p.members[base:]
	if index != nil {
		if i, ok := index[name]; ok {
			members[i].value = value
			p.duplicates++
			return index
		}
		index[name] = len(members)
	} else {
		for i := range members {
			if members[i].name == name {
				members[i].value = value
				p.duplicates++
				return index
			}
		}
		if len(members) == linearMembers {
			index = make(map[string]int, 2*linearMembers)
			for i := range members {
				index[members[i].name] = i
			}
			index[name] = len(members)
		}
	}
	if cap(p.members) == 0 {
		p.members = make([]member, 0, min(max(strings.Count(p.source, ":"), 4), maxChunk))
	}
	p.members = append(p.members, member{name, key, value})
	return index
}

// writeShortEscape writes the two-character escape of c that JSON defines (quote, backslash and the control characters
// with a letter), and reports whether c had one.
func writeShortEscape(out *strings.Builder, c rune) bool {
	switch c {
	case '"':
		out.WriteString(`\"`)
	case '\\':
		out.WriteString(`\\`)
	case '\b':
		out.WriteString(`\b`)
	case '\f':
		out.WriteString(`\f`)
	case '\n':
		out.WriteString(`\n`)
	case '\r':
		out.WriteString(`\r`)
	case '\t':
		out.WriteString(`\t`)
	default:
		return false
	}
	return true
}
