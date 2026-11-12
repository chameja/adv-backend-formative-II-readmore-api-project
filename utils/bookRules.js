// Business rules the Book schema can't express on its own (Rule 3, 422).
// Only checks the fields that are present, so partial updates work: a PUT
// that only changes the genre doesn't re-check the price or year.
// Expects values already cast by Mongoose (numbers, not strings).
const MIN_YEAR = 1450;

const validateBookRules = (data) => {
  const errors = [];

  if (data.price !== undefined && data.price !== null && data.price <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (data.publishedYear !== undefined && data.publishedYear !== null) {
    const currentYear = new Date().getFullYear();
    const year = data.publishedYear;
    if (!Number.isInteger(year) || year < MIN_YEAR || year > currentYear) {
      errors.push(`Published year must be a whole number from ${MIN_YEAR} to ${currentYear}`);
    }
  }

  return errors;
};

// Escapes regex special characters so user input is matched literally,
// e.g. a title like "C++ (2nd ed.)" or a malicious ".*".
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { validateBookRules, escapeRegex };
