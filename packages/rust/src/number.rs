//! The text of a binary64 float (RQ-030).

use crate::Error;

/// The JSON number token of a float, as ECMAScript `Number::toString` (ECMA-262, radix 10) writes it: the shortest
/// digits that read back as the same float, `-0` as `0`, positional notation for exponents from -7 through 20 and
/// exponent notation beyond (RQ-030). This is the one float-to-text function of polyspec.
///
/// # Errors
///
/// [`Error::NonFiniteNumber`] for NaN and the infinities, which no JSON number token writes.
pub fn number_text(value: f64) -> Result<String, Error> {
    if !value.is_finite() {
        return Err(Error::NonFiniteNumber);
    }
    Ok(ryu_js::Buffer::new().format_finite(value).to_owned())
}
