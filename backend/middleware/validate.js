/**
 * Check that all specified fields are present and non-empty in the object.
 * Returns an array of missing field names.
 */
const checkRequired = (obj, fields) => {
  const missing = [];
  for (const field of fields) {
    if (
      obj[field] === undefined ||
      obj[field] === null ||
      (typeof obj[field] === 'string' && obj[field].trim() === '')
    ) {
      missing.push(field);
    }
  }
  return missing;
};

/**
 * Validate that the value is a positive number.
 */
const isPositiveNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

/**
 * Validate that the value is a non-negative integer.
 */
const isNonNegativeInteger = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
};

/**
 * Validate that the value is a positive integer.
 */
const isPositiveInteger = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
};

/**
 * Validate email format.
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate that value is one of the allowed values.
 */
const isOneOf = (value, allowedValues) => {
  return allowedValues.includes(value);
};

/**
 * Sanitize string — trim whitespace.
 */
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim();
};

module.exports = {
  checkRequired,
  isPositiveNumber,
  isNonNegativeInteger,
  isPositiveInteger,
  isValidEmail,
  isOneOf,
  sanitize,
};
