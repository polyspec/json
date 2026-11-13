//! The ordered map of object members (RQ-001, RQ-002, RQ-016).

use std::{
    collections::{hash_map::RandomState, HashMap},
    hash::{BuildHasher, BuildHasherDefault, Hasher},
};

use crate::{value::code_units, Error, Kind, Value};

/// Objects with more members than this keep a hash index; smaller ones scan linearly.
const LINEAR_MEMBERS: usize = 8;

/// Passes through the precomputed key hashes stored in [`Index`].
#[derive(Default)]
struct IdentityHasher(u64);
impl Hasher for IdentityHasher {
    fn finish(&self) -> u64 {
        self.0
    }
    fn write(&mut self, bytes: &[u8]) {
        for &byte in bytes {
            self.0 = self.0.rotate_left(8) ^ u64::from(byte);
        }
    }
    fn write_u64(&mut self, hash: u64) {
        self.0 = hash;
    }
}

/// Key positions by the hash of each key's UTF-16 code units (RQ-002).
#[derive(Debug, Clone, Default)]
struct Index {
    state: RandomState,
    slots: HashMap<u64, usize, BuildHasherDefault<IdentityHasher>>,
}

/// The hash of a key by its UTF-16 code units, so every spelling of a key has one hash (RQ-002).
pub(crate) fn hash_units(state: &RandomState, units: impl Iterator<Item = u16>) -> u64 {
    let mut hasher = state.build_hasher();
    for unit in units {
        hasher.write_u16(unit);
    }
    hasher.finish()
}

/// An associative map that keeps each key's first insertion position and its last value (RQ-001).
#[derive(Debug, Clone, Default)]
pub struct OrderedMap {
    entries: Vec<(Value, Value)>,
    index: Option<Box<Index>>,
}

impl OrderedMap {
    /// An empty map.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets the value of a string key and returns the value it replaced; a repeated key keeps its first token and
    /// position (RQ-001).
    ///
    /// # Errors
    ///
    /// [`Error::NonStringKey`] for a key that is not a string (RQ-016).
    pub fn insert(&mut self, key: Value, value: Value) -> Result<Option<Value>, Error> {
        if key.kind() != Kind::String {
            return Err(Error::NonStringKey);
        }
        self.set(key, value)
    }

    /// Inserts under a string key; a repeated key keeps its first token and position.
    pub(crate) fn set(&mut self, key: Value, value: Value) -> Result<Option<Value>, Error> {
        let units = key.units()?;
        if let Some(position) = self.position(units)? {
            return match self.entries.get_mut(position) {
                Some(entry) => Ok(Some(std::mem::replace(&mut entry.1, value))),
                None => Err(Error::Internal {
                    what: "an index position outside the entries",
                }),
            };
        }
        let position = self.entries.len();
        if let Some(index) = &mut self.index {
            let hash = hash_units(&index.state, units.iter().copied());
            index.slots.entry(hash).or_insert(position);
        }
        self.entries.push((key, value));
        if self.index.is_none() && self.entries.len() > LINEAR_MEMBERS {
            let mut index = Box::<Index>::default();
            for (position, (key, _)) in self.entries.iter().enumerate() {
                let hash = hash_units(&index.state, key.units()?.iter().copied());
                index.slots.entry(hash).or_insert(position);
            }
            self.index = Some(index);
        }
        Ok(None)
    }

    /// The position of the key with these code units.
    fn position(&self, units: &[u16]) -> Result<Option<usize>, Error> {
        if let Some(index) = &self.index {
            match index
                .slots
                .get(&hash_units(&index.state, units.iter().copied()))
            {
                None => return Ok(None),
                Some(&position) => {
                    if let Some((key, _)) = self.entries.get(position) {
                        if key.units()? == units {
                            return Ok(Some(position));
                        }
                    }
                    // A hash collision: the key may still be present further on.
                }
            }
        }
        for (position, (key, _)) in self.entries.iter().enumerate() {
            if key.units()? == units {
                return Ok(Some(position));
            }
        }
        Ok(None)
    }

    fn value_at(&self, position: Option<usize>) -> Result<Option<&Value>, Error> {
        // RQ-033: the fault injection point gives a position outside the entries, which position never finds, so the
        // armed lookup takes the branch of that defect below.
        let position = match binding_core::fault::point(crate::fault::INTERNAL) {
            Some(_) => Some(self.entries.len()),
            None => position,
        };
        match position {
            None => Ok(None),
            Some(position) => match self.entries.get(position) {
                Some((_, value)) => Ok(Some(value)),
                None => Err(Error::Internal {
                    what: "a position outside the entries",
                }),
            },
        }
    }

    /// The value of a decoded name, or `None` when the map does not hold it (RQ-019, RQ-032).
    ///
    /// # Errors
    ///
    /// [`Error::Internal`] for a defect of the crate.
    pub fn get(&self, key: &str) -> Result<Option<&Value>, Error> {
        let units: Vec<u16> = key.encode_utf16().collect();
        self.value_at(self.position(&units)?)
    }

    /// The value of a name given as UTF-16 code units, which may hold an unpaired surrogate (RQ-009).
    ///
    /// # Errors
    ///
    /// [`Error::InvalidCodeUnit`] for a unit above 65535 (RQ-029).
    pub fn get_units(&self, key: &[u64]) -> Result<Option<&Value>, Error> {
        let units = code_units(key)?;
        self.get_code_units(&units)
    }

    pub(crate) fn get_code_units(&self, units: &[u16]) -> Result<Option<&Value>, Error> {
        self.value_at(self.position(units)?)
    }

    /// The keys and values in insertion order.
    pub fn iter(&self) -> impl DoubleEndedIterator<Item = (&Value, &Value)> {
        self.entries.iter().map(|(key, value)| (key, value))
    }

    /// The number of members.
    #[must_use]
    pub fn len(&self) -> u64 {
        // usize is at most 64 bits on every target of the crate (lib.rs).
        self.entries.len() as u64
    }

    /// Whether the map has no member.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}
