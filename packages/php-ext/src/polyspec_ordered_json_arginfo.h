/* This is a generated file, edit the .stub.php file instead.
 * Stub hash: 1d67296eee0bd2d769c37876fdebf5217063f58c */

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_Polyspec_OrderedJson_parse, 0, 1, Polyspec\\OrderedJson\\Value, 0)
	ZEND_ARG_TYPE_INFO(0, source, IS_STRING, 0)
	ZEND_ARG_TYPE_INFO_WITH_DEFAULT_VALUE(0, maxDepth, IS_LONG, 0, "Polyspec\\OrderedJson\\MAX_DEPTH")
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_TYPE_INFO_EX(arginfo_Polyspec_OrderedJson_stringify, 0, 1, IS_STRING, 0)
	ZEND_ARG_OBJ_INFO(0, value, Polyspec\\OrderedJson\\Value, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_INFO_EX(arginfo_class_Polyspec_OrderedJson_ParseError___construct, 0, 0, 2)
	ZEND_ARG_TYPE_INFO(0, message, IS_STRING, 0)
	ZEND_ARG_TYPE_INFO(0, offset, IS_LONG, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_INFO_EX(arginfo_class_Polyspec_OrderedJson_ArgumentError___construct, 0, 0, 2)
	ZEND_ARG_TYPE_INFO(0, kind, IS_STRING, 0)
	ZEND_ARG_TYPE_INFO(0, message, IS_STRING, 0)
ZEND_END_ARG_INFO()

#define arginfo_class_Polyspec_OrderedJson_UsageError___construct arginfo_class_Polyspec_OrderedJson_ArgumentError___construct

ZEND_BEGIN_ARG_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value___construct, 0, 0, 0)
ZEND_END_ARG_INFO()

#define arginfo_class_Polyspec_OrderedJson_Value_parse arginfo_Polyspec_OrderedJson_parse

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_parseRejectDuplicates, 0, 1, Polyspec\\OrderedJson\\Value, 0)
	ZEND_ARG_TYPE_INFO(0, source, IS_STRING, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_TYPE_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_kind, 0, 0, IS_STRING, 0)
ZEND_END_ARG_INFO()

#define arginfo_class_Polyspec_OrderedJson_Value_raw arginfo_class_Polyspec_OrderedJson_Value_kind

ZEND_BEGIN_ARG_WITH_RETURN_TYPE_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_members, 0, 0, IS_ARRAY, 0)
ZEND_END_ARG_INFO()

#define arginfo_class_Polyspec_OrderedJson_Value_items arginfo_class_Polyspec_OrderedJson_Value_members

#define arginfo_class_Polyspec_OrderedJson_Value_stringUnits arginfo_class_Polyspec_OrderedJson_Value_members

#define arginfo_class_Polyspec_OrderedJson_Value_stringValue arginfo_class_Polyspec_OrderedJson_Value_kind

#define arginfo_class_Polyspec_OrderedJson_Value_numberLiteral arginfo_class_Polyspec_OrderedJson_Value_kind

ZEND_BEGIN_ARG_WITH_RETURN_TYPE_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_booleanValue, 0, 0, _IS_BOOL, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_get, 0, 1, Polyspec\\OrderedJson\\Value, 1)
	ZEND_ARG_TYPE_INFO(0, key, IS_STRING, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_getUnits, 0, 1, Polyspec\\OrderedJson\\Value, 1)
	ZEND_ARG_TYPE_INFO(0, units, IS_ARRAY, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_string, 0, 1, Polyspec\\OrderedJson\\Value, 0)
	ZEND_ARG_TYPE_INFO(0, text, IS_STRING, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_fromUnits, 0, 1, Polyspec\\OrderedJson\\Value, 0)
	ZEND_ARG_TYPE_INFO(0, units, IS_ARRAY, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_number, 0, 1, Polyspec\\OrderedJson\\Value, 0)
	ZEND_ARG_TYPE_INFO(0, literal, IS_STRING, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_boolean, 0, 1, Polyspec\\OrderedJson\\Value, 0)
	ZEND_ARG_TYPE_INFO(0, value, _IS_BOOL, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_null, 0, 0, Polyspec\\OrderedJson\\Value, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_array, 0, 1, Polyspec\\OrderedJson\\Value, 0)
	ZEND_ARG_TYPE_INFO(0, items, IS_ARRAY, 0)
ZEND_END_ARG_INFO()

ZEND_BEGIN_ARG_WITH_RETURN_OBJ_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_object, 0, 1, Polyspec\\OrderedJson\\Value, 0)
	ZEND_ARG_TYPE_INFO(0, members, IS_ARRAY, 0)
ZEND_END_ARG_INFO()

#define arginfo_class_Polyspec_OrderedJson_Value_compact arginfo_class_Polyspec_OrderedJson_Value_kind

#define arginfo_class_Polyspec_OrderedJson_Value___toString arginfo_class_Polyspec_OrderedJson_Value_kind

ZEND_BEGIN_ARG_WITH_RETURN_TYPE_INFO_EX(arginfo_class_Polyspec_OrderedJson_Value_jsonSerialize, 0, 0, IS_NEVER, 0)
ZEND_END_ARG_INFO()

ZEND_FUNCTION(Polyspec_OrderedJson_parse);
ZEND_FUNCTION(Polyspec_OrderedJson_stringify);
ZEND_METHOD(Polyspec_OrderedJson_ParseError, __construct);
ZEND_METHOD(Polyspec_OrderedJson_ArgumentError, __construct);
ZEND_METHOD(Polyspec_OrderedJson_UsageError, __construct);
ZEND_METHOD(Polyspec_OrderedJson_Value, __construct);
ZEND_METHOD(Polyspec_OrderedJson_Value, parse);
ZEND_METHOD(Polyspec_OrderedJson_Value, parseRejectDuplicates);
ZEND_METHOD(Polyspec_OrderedJson_Value, kind);
ZEND_METHOD(Polyspec_OrderedJson_Value, raw);
ZEND_METHOD(Polyspec_OrderedJson_Value, members);
ZEND_METHOD(Polyspec_OrderedJson_Value, items);
ZEND_METHOD(Polyspec_OrderedJson_Value, stringUnits);
ZEND_METHOD(Polyspec_OrderedJson_Value, stringValue);
ZEND_METHOD(Polyspec_OrderedJson_Value, numberLiteral);
ZEND_METHOD(Polyspec_OrderedJson_Value, booleanValue);
ZEND_METHOD(Polyspec_OrderedJson_Value, get);
ZEND_METHOD(Polyspec_OrderedJson_Value, getUnits);
ZEND_METHOD(Polyspec_OrderedJson_Value, string);
ZEND_METHOD(Polyspec_OrderedJson_Value, fromUnits);
ZEND_METHOD(Polyspec_OrderedJson_Value, number);
ZEND_METHOD(Polyspec_OrderedJson_Value, boolean);
ZEND_METHOD(Polyspec_OrderedJson_Value, null);
ZEND_METHOD(Polyspec_OrderedJson_Value, array);
ZEND_METHOD(Polyspec_OrderedJson_Value, object);
ZEND_METHOD(Polyspec_OrderedJson_Value, compact);
ZEND_METHOD(Polyspec_OrderedJson_Value, __toString);
ZEND_METHOD(Polyspec_OrderedJson_Value, jsonSerialize);

static const zend_function_entry ext_functions[] = {
	ZEND_RAW_FENTRY(ZEND_NS_NAME("Polyspec\\OrderedJson", "parse"), zif_Polyspec_OrderedJson_parse, arginfo_Polyspec_OrderedJson_parse, 0, NULL, NULL)
	ZEND_RAW_FENTRY(ZEND_NS_NAME("Polyspec\\OrderedJson", "stringify"), zif_Polyspec_OrderedJson_stringify, arginfo_Polyspec_OrderedJson_stringify, 0, NULL, NULL)
	ZEND_FE_END
};

static const zend_function_entry class_Polyspec_OrderedJson_ParseError_methods[] = {
	ZEND_ME(Polyspec_OrderedJson_ParseError, __construct, arginfo_class_Polyspec_OrderedJson_ParseError___construct, ZEND_ACC_PUBLIC)
	ZEND_FE_END
};

static const zend_function_entry class_Polyspec_OrderedJson_ArgumentError_methods[] = {
	ZEND_ME(Polyspec_OrderedJson_ArgumentError, __construct, arginfo_class_Polyspec_OrderedJson_ArgumentError___construct, ZEND_ACC_PUBLIC)
	ZEND_FE_END
};

static const zend_function_entry class_Polyspec_OrderedJson_UsageError_methods[] = {
	ZEND_ME(Polyspec_OrderedJson_UsageError, __construct, arginfo_class_Polyspec_OrderedJson_UsageError___construct, ZEND_ACC_PUBLIC)
	ZEND_FE_END
};

static const zend_function_entry class_Polyspec_OrderedJson_Value_methods[] = {
	ZEND_ME(Polyspec_OrderedJson_Value, __construct, arginfo_class_Polyspec_OrderedJson_Value___construct, ZEND_ACC_PRIVATE)
	ZEND_ME(Polyspec_OrderedJson_Value, parse, arginfo_class_Polyspec_OrderedJson_Value_parse, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, parseRejectDuplicates, arginfo_class_Polyspec_OrderedJson_Value_parseRejectDuplicates, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, kind, arginfo_class_Polyspec_OrderedJson_Value_kind, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, raw, arginfo_class_Polyspec_OrderedJson_Value_raw, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, members, arginfo_class_Polyspec_OrderedJson_Value_members, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, items, arginfo_class_Polyspec_OrderedJson_Value_items, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, stringUnits, arginfo_class_Polyspec_OrderedJson_Value_stringUnits, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, stringValue, arginfo_class_Polyspec_OrderedJson_Value_stringValue, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, numberLiteral, arginfo_class_Polyspec_OrderedJson_Value_numberLiteral, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, booleanValue, arginfo_class_Polyspec_OrderedJson_Value_booleanValue, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, get, arginfo_class_Polyspec_OrderedJson_Value_get, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, getUnits, arginfo_class_Polyspec_OrderedJson_Value_getUnits, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, string, arginfo_class_Polyspec_OrderedJson_Value_string, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, fromUnits, arginfo_class_Polyspec_OrderedJson_Value_fromUnits, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, number, arginfo_class_Polyspec_OrderedJson_Value_number, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, boolean, arginfo_class_Polyspec_OrderedJson_Value_boolean, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, null, arginfo_class_Polyspec_OrderedJson_Value_null, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, array, arginfo_class_Polyspec_OrderedJson_Value_array, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, object, arginfo_class_Polyspec_OrderedJson_Value_object, ZEND_ACC_PUBLIC|ZEND_ACC_STATIC)
	ZEND_ME(Polyspec_OrderedJson_Value, compact, arginfo_class_Polyspec_OrderedJson_Value_compact, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, __toString, arginfo_class_Polyspec_OrderedJson_Value___toString, ZEND_ACC_PUBLIC)
	ZEND_ME(Polyspec_OrderedJson_Value, jsonSerialize, arginfo_class_Polyspec_OrderedJson_Value_jsonSerialize, ZEND_ACC_PUBLIC)
	ZEND_FE_END
};

static void register_polyspec_ordered_json_symbols(int module_number)
{
	REGISTER_LONG_CONSTANT("Polyspec\\OrderedJson\\MAX_DEPTH", 256, CONST_PERSISTENT);
}

static zend_class_entry *register_class_Polyspec_OrderedJson_Kind(void)
{
	zend_class_entry *class_entry = zend_register_internal_enum("Polyspec\\OrderedJson\\Kind", IS_STRING, NULL);

	zval enum_case_Object_value;
	zend_string *enum_case_Object_value_str = zend_string_init("object", strlen("object"), 1);
	ZVAL_STR(&enum_case_Object_value, enum_case_Object_value_str);
	zend_enum_add_case_cstr(class_entry, "Object", &enum_case_Object_value);

	zval enum_case_Array_value;
	zend_string *enum_case_Array_value_str = zend_string_init("array", strlen("array"), 1);
	ZVAL_STR(&enum_case_Array_value, enum_case_Array_value_str);
	zend_enum_add_case_cstr(class_entry, "Array", &enum_case_Array_value);

	zval enum_case_String_value;
	zend_string *enum_case_String_value_str = zend_string_init("string", strlen("string"), 1);
	ZVAL_STR(&enum_case_String_value, enum_case_String_value_str);
	zend_enum_add_case_cstr(class_entry, "String", &enum_case_String_value);

	zval enum_case_Number_value;
	zend_string *enum_case_Number_value_str = zend_string_init("number", strlen("number"), 1);
	ZVAL_STR(&enum_case_Number_value, enum_case_Number_value_str);
	zend_enum_add_case_cstr(class_entry, "Number", &enum_case_Number_value);

	zval enum_case_Boolean_value;
	zend_string *enum_case_Boolean_value_str = zend_string_init("boolean", strlen("boolean"), 1);
	ZVAL_STR(&enum_case_Boolean_value, enum_case_Boolean_value_str);
	zend_enum_add_case_cstr(class_entry, "Boolean", &enum_case_Boolean_value);

	zval enum_case_Null_value;
	zend_string *enum_case_Null_value_str = zend_string_init("null", strlen("null"), 1);
	ZVAL_STR(&enum_case_Null_value, enum_case_Null_value_str);
	zend_enum_add_case_cstr(class_entry, "Null", &enum_case_Null_value);

	return class_entry;
}

static zend_class_entry *register_class_Polyspec_OrderedJson_ParseError(zend_class_entry *class_entry_InvalidArgumentException)
{
	zend_class_entry ce, *class_entry;

	INIT_NS_CLASS_ENTRY(ce, "Polyspec\\OrderedJson", "ParseError", class_Polyspec_OrderedJson_ParseError_methods);
	class_entry = zend_register_internal_class_with_flags(&ce, class_entry_InvalidArgumentException, ZEND_ACC_FINAL);

	zval property_kind_default_value;
	ZVAL_UNDEF(&property_kind_default_value);
	zend_string *property_kind_name = zend_string_init("kind", sizeof("kind") - 1, 1);
	zend_declare_typed_property(class_entry, property_kind_name, &property_kind_default_value, ZEND_ACC_PUBLIC|ZEND_ACC_READONLY, NULL, (zend_type) ZEND_TYPE_INIT_MASK(MAY_BE_STRING));
	zend_string_release(property_kind_name);

	zval property_offset_default_value;
	ZVAL_UNDEF(&property_offset_default_value);
	zend_string *property_offset_name = zend_string_init("offset", sizeof("offset") - 1, 1);
	zend_declare_typed_property(class_entry, property_offset_name, &property_offset_default_value, ZEND_ACC_PUBLIC|ZEND_ACC_READONLY, NULL, (zend_type) ZEND_TYPE_INIT_MASK(MAY_BE_LONG));
	zend_string_release(property_offset_name);

	return class_entry;
}

static zend_class_entry *register_class_Polyspec_OrderedJson_ArgumentError(zend_class_entry *class_entry_InvalidArgumentException)
{
	zend_class_entry ce, *class_entry;

	INIT_NS_CLASS_ENTRY(ce, "Polyspec\\OrderedJson", "ArgumentError", class_Polyspec_OrderedJson_ArgumentError_methods);
	class_entry = zend_register_internal_class_with_flags(&ce, class_entry_InvalidArgumentException, ZEND_ACC_FINAL);

	zval property_kind_default_value;
	ZVAL_UNDEF(&property_kind_default_value);
	zend_string *property_kind_name = zend_string_init("kind", sizeof("kind") - 1, 1);
	zend_declare_typed_property(class_entry, property_kind_name, &property_kind_default_value, ZEND_ACC_PUBLIC|ZEND_ACC_READONLY, NULL, (zend_type) ZEND_TYPE_INIT_MASK(MAY_BE_STRING));
	zend_string_release(property_kind_name);

	return class_entry;
}

static zend_class_entry *register_class_Polyspec_OrderedJson_UsageError(zend_class_entry *class_entry_LogicException)
{
	zend_class_entry ce, *class_entry;

	INIT_NS_CLASS_ENTRY(ce, "Polyspec\\OrderedJson", "UsageError", class_Polyspec_OrderedJson_UsageError_methods);
	class_entry = zend_register_internal_class_with_flags(&ce, class_entry_LogicException, ZEND_ACC_FINAL);

	zval property_kind_default_value;
	ZVAL_UNDEF(&property_kind_default_value);
	zend_string *property_kind_name = zend_string_init("kind", sizeof("kind") - 1, 1);
	zend_declare_typed_property(class_entry, property_kind_name, &property_kind_default_value, ZEND_ACC_PUBLIC|ZEND_ACC_READONLY, NULL, (zend_type) ZEND_TYPE_INIT_MASK(MAY_BE_STRING));
	zend_string_release(property_kind_name);

	return class_entry;
}

static zend_class_entry *register_class_Polyspec_OrderedJson_Value(zend_class_entry *class_entry_JsonSerializable, zend_class_entry *class_entry_Stringable)
{
	zend_class_entry ce, *class_entry;

	INIT_NS_CLASS_ENTRY(ce, "Polyspec\\OrderedJson", "Value", class_Polyspec_OrderedJson_Value_methods);
	class_entry = zend_register_internal_class_with_flags(&ce, NULL, ZEND_ACC_FINAL);
	zend_class_implements(class_entry, 2, class_entry_JsonSerializable, class_entry_Stringable);

	return class_entry;
}
