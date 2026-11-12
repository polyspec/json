//! The Serde integration of `Value` (RQ-020): `Serialize` writes the compact contract bytes of a value and
//! `Deserialize` parses the raw JSON text of a field with the library parser, so `serde_json` encodes and decodes any
//! structure that holds values with their order and number tokens.
use ::serde::{de, ser, Deserialize, Serialize};
use serde_json::value::RawValue;

impl Serialize for super::Value {
    fn serialize<S: ser::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let text = self.to_string();
        let mut decoder = serde_json::Deserializer::from_str(&text);
        decoder.disable_recursion_limit();
        let raw = Box::<RawValue>::deserialize(&mut decoder).map_err(ser::Error::custom)?;
        decoder.end().map_err(ser::Error::custom)?;
        raw.serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for super::Value {
    fn deserialize<D: de::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(deserializer)?;
        super::parse(raw.get().as_bytes(), &super::ParseOptions::default())
            .map_err(de::Error::custom)
    }
}
