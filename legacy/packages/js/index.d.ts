export declare enum Kind {
  Object = 'object',
  Array = 'array',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Null = 'null',
}
export interface ParseOptions {
  maxDepth?: number;
  rejectDuplicates?: boolean;
}
export declare const MAX_DEPTH: 256;
/** A rejection kind of the JSON contract, or duplicate_object_key of rejectDuplicates: the kind of a ParseError. */
export type RejectionKind = 'expected_value' | 'expected_digit' | 'expected_colon' | 'expected_delimiter'
  | 'expected_object_key' | 'invalid_escape' | 'invalid_unicode_escape' | 'unfinished_escape' | 'unterminated_string'
  | 'unescaped_control_character' | 'unescaped_lone_surrogate' | 'invalid_utf8' | 'maximum_depth_exceeded'
  | 'trailing_input' | 'duplicate_object_key';
/** An argument kind of the JSON contract that can arise in JavaScript: the kind of a TypeError or RangeError of the package. */
export type ArgumentKind = 'non_string_key' | 'wrong_kind' | 'invalid_number_literal' | 'depth_limit_out_of_range'
  | 'invalid_argument_type' | 'host_serialization_refused' | 'direct_construction';
/** A refused argument: the host TypeError or RangeError that the package throws, with its argument kind. */
export type ArgumentError = (TypeError | RangeError) & { readonly kind: ArgumentKind };
export declare class ParseError extends SyntaxError {
  readonly offset: number;
  readonly unit: 'utf16' | 'byte';
  readonly kind: RejectionKind;
}
export declare class Value {
  private constructor();
  readonly kind: Kind;
  readonly raw: string;
  readonly members: ReadonlyMap<string, Value>;
  readonly keys: readonly Value[];
  readonly items: readonly Value[];
  stringValue(): string;
  stringUnits(): number[];
  numberLiteral(): string;
  booleanValue(): boolean;
  get(key: string): Value | undefined;
  toString(): string;
  toJSON(): never;
  static string(text: string): Value;
  static number(literal: string): Value;
  static boolean(value: boolean): Value;
  static null(): Value;
  static array(items: Iterable<Value>): Value;
  static object(entries: Iterable<readonly [string | Value, Value]>): Value;
}
export declare function parse(source: string, options?: ParseOptions): Value;
export declare function parseBytes(bytes: Uint8Array, options?: ParseOptions): Value;
export declare function stringify(value: Value): string;
