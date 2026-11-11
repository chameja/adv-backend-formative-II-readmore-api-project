const mongoose = require('mongoose');

// Used with router.param('id', ...): rejects malformed ids with 400 before
// they reach a controller, so Mongoose never throws a CastError (500).
// isObjectIdOrHexString only accepts 24-char hex strings, unlike
// isValidObjectId, which also accepts any 12-character string.
const validateObjectId = (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ message: `"${id}" is not a valid id` });
  }
  next();
};

module.exports = validateObjectId;
