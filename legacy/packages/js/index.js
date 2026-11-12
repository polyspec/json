/** Strict, immutable JSON values. Objects use insertion-ordered associative maps. */
export const MAX_DEPTH = 256;
const internal = Symbol('ordered-json');
const writeInternal = Symbol('write-internal');
const noOptions = Object.freeze({});
const noItems = Object.freeze([]);
const utf8 = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
// A compact value serializes to exactly its source token: it contains no
// insignificant whitespace and no duplicate object keys.
const ROOT = 1, COMPACT = 2, KEY_VALUES = 4;
let isValue;

/**
 * Throws the host error `Type` with `message` and the argument kind `kind` of the JSON contract, which every implementation
 * names alike.
 */
function refuse(Type, kind, message) {
  const error = new Type(message);
  error.kind = kind;
  throw error;
}
const isIterable = value => value != null && typeof value[Symbol.iterator] === 'function';

const hexValue = code => {
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 65 && code <= 70) return code - 55;
  if (code >= 97 && code <= 102) return code - 87;
  return -1;
};

function codeUnits(text) {
  return Array.from({length: text.length}, (_, i) => text.charCodeAt(i));
}

function quoteUnits(units) {
  let out = '"';
  for (const unit of units) {
    if (unit === 34) out += '\\\"';
    else if (unit === 92) out += '\\\\';
    else if (unit === 8) out += '\\b';
    else if (unit === 12) out += '\\f';
    else if (unit === 10) out += '\\n';
    else if (unit === 13) out += '\\r';
    else if (unit === 9) out += '\\t';
    else if (unit >= 0x20 && unit <= 0x7e) out += String.fromCharCode(unit);
    else out += `\\u${unit.toString(16).padStart(4, '0')}`;
  }
  return out + '"';
}

/** End offset of a validated string token that starts at `start`. */
function stringEnd(source, start) {
  let pos = start + 1;
  for (;;) {
    const code = source.charCodeAt(pos++);
    if (code === 34) return pos;
    if (code === 92) pos++;
  }
}

const KINDS = {
  'Expected JSON value': 'expected_value',
  'Expected integer': 'expected_digit',
  'Expected fraction digit': 'expected_digit',
  'Expected exponent digit': 'expected_digit',
  'Expected colon': 'expected_colon',
  'Expected comma or closing delimiter': 'expected_delimiter',
  'Expected object key': 'expected_object_key',
  'Invalid escape': 'invalid_escape',
  'Unfinished escape': 'unfinished_escape',
  'Invalid Unicode escape': 'invalid_unicode_escape',
  'Unterminated string': 'unterminated_string',
  'Unescaped control character': 'unescaped_control_character',
  'Unescaped unpaired surrogate': 'unescaped_lone_surrogate',
  'Invalid UTF-8': 'invalid_utf8',
  'Maximum nesting depth exceeded': 'maximum_depth_exceeded',
  'Unexpected trailing input': 'trailing_input',
  'Duplicate object key': 'duplicate_object_key',
};

/** The names of the kinds of a value, which Value.kind returns. */
export const Kind = Object.freeze({
  Object: 'object',
  Array: 'array',
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Null: 'null',
});

export class ParseError extends SyntaxError {
  constructor(message, offset, unit = 'UTF-16 offset') {
    if (!Object.hasOwn(KINDS, message)) refuse(TypeError, 'direct_construction', `ParseError has no kind for the message ${JSON.stringify(message)}`);
    super(`${message} at ${unit} ${offset}`);
    this.name = 'ParseError';
    this.offset = offset;
    // 'utf16' for parse positions, 'byte' when the input never decoded.
    this.unit = unit === 'byte' ? 'byte' : 'utf16';
    // The reason the document was rejected, shared by every implementation.
    this.kind = KINDS[message];
  }
}

export class Value {
  // #start/#end span the value token; the root's raw text also includes surrounding whitespace.
  // Object #keys holds first key token offsets until the keys getter replaces them with values.
  #source; #start; #end; #kind; #flags; #members; #keys; #items; #text;
  constructor(token, source, start, end, kind, flags = 0, members = null, items = noItems, text, keys = null) {
    if (token !== internal) refuse(TypeError, 'direct_construction', 'Use parse() or Value factories');
    this.#source = source; this.#start = start; this.#end = end;
    this.#kind = kind; this.#flags = flags; this.#members = members; this.#keys = keys;
    this.#items = items === noItems ? items : Object.freeze(items); this.#text = text;
  }
  static {
    isValue = value => typeof value === 'object' && value !== null && #kind in value;
  }
  get kind() { return this.#kind; }
  get raw() { return this.#flags & ROOT ? this.#source : this.#source.slice(this.#start, this.#end); }
  get members() { this.#expect('object'); return new Map(this.#members); }
  get keys() {
    this.#expect('object');
    const keys = this.#keys;
    if (!(this.#flags & KEY_VALUES)) {
      let i = 0;
      for (const name of this.#members.keys()) {
        const start = keys[i];
        keys[i++] = new Value(internal, this.#source, start, stringEnd(this.#source, start),
          'string', COMPACT, null, noItems, name);
      }
      this.#flags |= KEY_VALUES;
    }
    return Object.freeze(keys.slice());
  }
  get items() { this.#expect('array'); return this.#items; }
  #expect(kind) {
    if (this.#kind !== kind) refuse(TypeError, 'wrong_kind', `Expected ${kind}, got ${this.#kind}`);
  }
  stringValue() { this.#expect('string'); return this.#text; }
  stringUnits() {
    const s = this.stringValue();
    return Array.from({length: s.length}, (_, i) => s.charCodeAt(i));
  }
  numberLiteral() { this.#expect('number'); return this.raw.trim(); }
  booleanValue() { this.#expect('boolean'); return this.raw.trim() === 'true'; }
  get(key) {
    if (typeof key !== 'string') refuse(TypeError, 'non_string_key', 'Key must be a string');
    this.#expect('object');
    return this.#members.get(key);
  }
  [writeInternal](out) {
    const source = this.#source;
    if (this.#flags & COMPACT) return out + source.slice(this.#start, this.#end);
    if (this.#kind === 'object') {
      const keys = this.#keys;
      out += '{';
      let i = 0;
      for (const value of this.#members.values()) {
        const key = keys[i];
        if (i++) out += ',';
        out += typeof key === 'number' ? source.slice(key, stringEnd(source, key)) : source.slice(key.#start, key.#end);
        out = value[writeInternal](out + ':');
      }
      return out + '}';
    }
    const items = this.#items;
    out += '[';
    for (let i = 0; i < items.length; i++) {
      if (i) out += ',';
      out = items[i][writeInternal](out);
    }
    return out + ']';
  }
  toString() { return stringify(this); }
  // Host JSON serialization must not silently serialize the AST as an ordinary object.
  toJSON() { refuse(TypeError, 'host_serialization_refused', 'Use stringify(value) from ordered-json'); }
  static string(text) {
    if (typeof text !== 'string') refuse(TypeError, 'invalid_argument_type', 'Expected string');
    return parse(quoteUnits(codeUnits(text)));
  }
  static number(literal) {
    if (typeof literal !== 'string') refuse(TypeError, 'invalid_argument_type', 'Pass a number literal as a string');
    const v = parse(literal);
    if (v.#kind !== 'number') refuse(TypeError, 'invalid_number_literal', `Expected a number literal, got ${v.#kind}`);
    if (v.raw !== v.raw.trim()) refuse(TypeError, 'invalid_number_literal', 'Number literal cannot contain whitespace');
    return v;
  }
  static boolean(value) {
    if (typeof value !== 'boolean') refuse(TypeError, 'invalid_argument_type', 'Expected boolean');
    return parse(value ? 'true' : 'false');
  }
  static null() { return parse('null'); }
  static array(items) {
    if (!isIterable(items)) refuse(TypeError, 'invalid_argument_type', 'Expected an iterable of values');
    return parse('[' + Array.from(items, stringify).join(',') + ']');
  }
  static object(entries) {
    if (!isIterable(entries)) refuse(TypeError, 'invalid_argument_type', 'Expected an iterable of entries');
    return parse('{' + Array.from(entries, entry => {
      const pair = isIterable(entry) && typeof entry !== 'string' ? Array.from(entry) : [];
      if (pair.length !== 2) refuse(TypeError, 'invalid_argument_type', 'Expected an entry of a key and a value');
      let [key, value] = pair;
      if (typeof key === 'string') key = Value.string(key);
      if (!isValue(key) || key.#kind !== 'string') refuse(TypeError, 'non_string_key', 'Key must be a string');
      checkValue(value);
      return key.raw.trim() + ':' + stringify(value);
    }).join(',') + '}');
  }
}

function checkValue(value) {
  if (!isValue(value)) refuse(TypeError, 'invalid_argument_type', 'Expected an ordered-json Value');
}

// Parser state. Parsing never re-enters itself, so one module-level cursor suffices.
let src = '', pos = 0, depthLimit = MAX_DEPTH, whitespace = 0, duplicates = 0, rejectDuplicates = false;

function fail(message) { throw new ParseError(message, pos); }
function failAt(message, at) { throw new ParseError(message, at); }

function skipWhitespace() {
  let code = src.charCodeAt(pos);
  if (code > 32) return;
  const start = pos;
  while (code === 32 || code === 10 || code === 13 || code === 9) code = src.charCodeAt(++pos);
  whitespace += pos - start;
}

function checkUnit(code) {
  if (code < 32) failAt('Unescaped control character', pos - 1);
  // parse checked the text for unpaired surrogates, so a high surrogate starts a pair.
  if ((code & 0xfc00) === 0xd800) pos++;
}

/** Reads the string token at pos and returns its decoded text. */
function scanString() {
  const start = ++pos, length = src.length;
  while (pos < length) {
    const code = src.charCodeAt(pos++);
    if (code === 34) return src.slice(start, pos - 1);
    if (code === 92) return scanEscapedString(src.slice(start, pos - 1));
    if (code < 32 || (code & 0xf800) === 0xd800) checkUnit(code);
  }
  fail('Unterminated string');
}

/** Continues a string after a backslash; pos is at the escape character. */
function scanEscapedString(text) {
  const length = src.length;
  for (;;) {
    if (pos >= length) failAt('Unfinished escape', pos);
    const escape = src.charCodeAt(pos++);
    if (escape === 117) {
      let unit = 0;
      for (let i = 0; i < 4; i++) {
        const value = hexValue(src.charCodeAt(pos));
        if (value < 0) fail('Invalid Unicode escape');
        unit = (unit << 4) | value;
        pos++;
      }
      text += String.fromCharCode(unit);
    } else if (escape === 34 || escape === 92 || escape === 47) text += String.fromCharCode(escape);
    else if (escape === 98) text += '\b';
    else if (escape === 102) text += '\f';
    else if (escape === 110) text += '\n';
    else if (escape === 114) text += '\r';
    else if (escape === 116) text += '\t';
    else failAt('Invalid escape', pos - 1);
    const chunk = pos;
    for (;;) {
      if (pos >= length) fail('Unterminated string');
      const code = src.charCodeAt(pos++);
      if (code === 34) return text + src.slice(chunk, pos - 1);
      if (code === 92) { text += src.slice(chunk, pos - 1); break; }
      if (code < 32 || (code & 0xf800) === 0xd800) checkUnit(code);
    }
  }
}

function skipDigits(code) {
  while (code >= 48 && code <= 57) code = src.charCodeAt(++pos);
  return code;
}

function parseValue(depth) {
  skipWhitespace();
  const start = pos, code = src.charCodeAt(pos), root = depth === 0 ? ROOT : 0;
  if (code === 123 || code === 91) {
    if (depth >= depthLimit) fail('Maximum nesting depth exceeded');
    const object = code === 123, close = object ? 125 : 93;
    const whitespaceBefore = whitespace, duplicatesBefore = duplicates;
    const members = object ? new Map() : null, keys = object ? [] : null, items = object ? noItems : [];
    pos++; skipWhitespace();
    if (src.charCodeAt(pos) !== close) {
      for (;;) {
        if (object) {
          if (src.charCodeAt(pos) !== 34) fail('Expected object key');
          const keyStart = pos, name = scanString();
          if (rejectDuplicates && members.has(name)) failAt('Duplicate object key', keyStart);
          skipWhitespace();
          if (src.charCodeAt(pos) !== 58) fail('Expected colon');
          pos++;
          const child = parseValue(depth + 1), size = members.size;
          members.set(name, child);
          if (members.size !== size) keys.push(keyStart);
          else duplicates++;
        } else items.push(parseValue(depth + 1));
        skipWhitespace();
        const next = src.charCodeAt(pos);
        if (next === close) break;
        if (next !== 44) fail('Expected comma or closing delimiter');
        pos++; skipWhitespace();
      }
    }
    pos++;
    const compact = whitespace === whitespaceBefore && duplicates === duplicatesBefore ? COMPACT : 0;
    return new Value(internal, src, start, pos, object ? 'object' : 'array', root | compact, members, items, undefined, keys);
  }
  if (code === 34) {
    const text = scanString();
    return new Value(internal, src, start, pos, 'string', root | COMPACT, null, noItems, text);
  }
  if (code === 45 || (code >= 48 && code <= 57)) {
    let c = code === 45 ? src.charCodeAt(++pos) : code;
    if (c === 48) c = src.charCodeAt(++pos);
    else {
      if (!(c >= 48 && c <= 57)) fail('Expected integer');
      c = skipDigits(c);
    }
    if (c === 46) {
      c = src.charCodeAt(++pos);
      if (!(c >= 48 && c <= 57)) fail('Expected fraction digit');
      c = skipDigits(c);
    }
    if (c === 101 || c === 69) {
      c = src.charCodeAt(++pos);
      if (c === 43 || c === 45) c = src.charCodeAt(++pos);
      if (!(c >= 48 && c <= 57)) fail('Expected exponent digit');
      skipDigits(c);
    }
    return new Value(internal, src, start, pos, 'number', root | COMPACT);
  }
  let kind;
  if (code === 116 && src.startsWith('true', pos)) { kind = 'boolean'; pos += 4; }
  else if (code === 102 && src.startsWith('false', pos)) { kind = 'boolean'; pos += 5; }
  else if (code === 110 && src.startsWith('null', pos)) { kind = 'null'; pos += 4; }
  else fail('Expected JSON value');
  return new Value(internal, src, start, pos, kind, root | COMPACT);
}

// rejectDuplicates rejects a repeated decoded object key at the second key token.
export function parse(source, options = noOptions) {
  if (typeof source !== 'string') refuse(TypeError, 'invalid_argument_type', 'Expected JSON text');
  if (typeof options !== 'object' || options === null) refuse(TypeError, 'invalid_argument_type', 'Expected an options object');
  const {maxDepth = MAX_DEPTH, rejectDuplicates: reject = false} = options;
  if (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > MAX_DEPTH)
    refuse(RangeError, 'depth_limit_out_of_range', `maxDepth must be between 0 and ${MAX_DEPTH}`);
  if (typeof reject !== 'boolean') refuse(TypeError, 'invalid_argument_type', 'rejectDuplicates must be a boolean');
  // Text with an unpaired surrogate has no UTF-8 encoding, so it is rejected at that unit before its grammar is read, as
  // parseBytes rejects invalid UTF-8.
  if (!source.isWellFormed()) failAt('Unescaped unpaired surrogate', source.search(/\p{Cs}/u));
  src = source; pos = 0; depthLimit = maxDepth; whitespace = 0; duplicates = 0; rejectDuplicates = reject;
  try {
    const result = parseValue(0);
    skipWhitespace();
    if (pos !== source.length) fail('Unexpected trailing input');
    return result;
  } finally {
    src = '';
  }
}

export function parseBytes(bytes, options) {
  if (!(bytes instanceof Uint8Array)) refuse(TypeError, 'invalid_argument_type', 'Expected Uint8Array');
  let source;
  try { source = utf8.decode(bytes); }
  catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new ParseError('Invalid UTF-8', firstInvalidByte(bytes), 'byte');
  }
  return parse(source, options);
}

// The decoder reports no position, so the first invalid sequence is located here.
function firstInvalidByte(bytes) {
  for (let i = 0; i < bytes.length;) {
    const lead = bytes[i];
    let width = 0;
    let point = 0;
    if (lead < 0x80) { i++; continue; }
    if (lead >= 0xc2 && lead <= 0xdf) { width = 2; point = lead & 31; }
    else if (lead >= 0xe0 && lead <= 0xef) { width = 3; point = lead & 15; }
    else if (lead >= 0xf0 && lead <= 0xf4) { width = 4; point = lead & 7; }
    else return i;
    if (i + width > bytes.length) return i;
    for (let k = 1; k < width; k++) {
      const continuation = bytes[i + k];
      if ((continuation & 0xc0) !== 0x80) return i;
      point = (point << 6) | (continuation & 63);
    }
    const minimum = width === 2 ? 0x80 : width === 3 ? 0x800 : 0x10000;
    if (point < minimum || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return i;
    i += width;
  }
  return bytes.length;
}

export function stringify(value) {
  checkValue(value);
  return value[writeInternal]('');
}
