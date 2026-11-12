const mongoose = require('mongoose');
const { escapeRegex } = require('./bookRules');

const SORT_FIELDS = ['price', 'title', 'publishedYear'];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// An invalid query param. status tells the central error handler to send 400.
class QueryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QueryError';
    this.status = 400;
  }
}

// Query params arrive as strings. A repeated param (?genre=a&genre=b) arrives
// as an array, which none of these filters support, so it is rejected.
const readParam = (query, name) => {
  const value = query[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new QueryError(`"${name}" may only be given once`);
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const toNumber = (name, value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new QueryError(`"${name}" must be a number`);
  }
  return number;
};

const toPositiveInt = (name, value) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new QueryError(`"${name}" must be a whole number of 1 or more`);
  }
  return number;
};

// Builds the Mongo filter, sort and pagination for GET /books from whatever
// params are present. Starts from an empty filter and only adds a key when
// its param was sent, so no params means "all books".
// Throws QueryError (400) for invalid values instead of silently ignoring them.
const buildBookQuery = (query) => {
  const filter = {};

  const genre = readParam(query, 'genre');
  if (genre !== undefined) {
    // Exact genre, ignoring case: ?genre=thriller matches "Thriller"
    filter.genre = { $regex: `^${escapeRegex(genre)}$`, $options: 'i' };
  }

  const minPriceParam = readParam(query, 'minPrice');
  const maxPriceParam = readParam(query, 'maxPrice');
  if (minPriceParam !== undefined || maxPriceParam !== undefined) {
    filter.price = {};
    if (minPriceParam !== undefined) filter.price.$gte = toNumber('minPrice', minPriceParam);
    if (maxPriceParam !== undefined) filter.price.$lte = toNumber('maxPrice', maxPriceParam);
    if (filter.price.$gte !== undefined && filter.price.$lte !== undefined
        && filter.price.$gte > filter.price.$lte) {
      throw new QueryError('"minPrice" cannot be greater than "maxPrice"');
    }
  }

  const author = readParam(query, 'author');
  if (author !== undefined) {
    if (!mongoose.isObjectIdOrHexString(author)) {
      throw new QueryError(`"${author}" is not a valid author id`);
    }
    filter.author = author;
  }

  const search = readParam(query, 'search');
  if (search !== undefined) {
    // Title contains the search text, ignoring case
    filter.title = { $regex: escapeRegex(search), $options: 'i' };
  }

  const sortField = readParam(query, 'sort') ?? 'title';
  if (!SORT_FIELDS.includes(sortField)) {
    throw new QueryError(`"sort" must be one of: ${SORT_FIELDS.join(', ')}`);
  }
  const order = (readParam(query, 'order') ?? 'asc').toLowerCase();
  if (order !== 'asc' && order !== 'desc') {
    throw new QueryError('"order" must be "asc" or "desc"');
  }
  // _id as a tie-breaker keeps the order stable across pages
  const sort = { [sortField]: order === 'desc' ? -1 : 1, _id: 1 };

  const pageParam = readParam(query, 'page');
  const limitParam = readParam(query, 'limit');
  const page = pageParam === undefined ? 1 : toPositiveInt('page', pageParam);
  const requestedLimit = limitParam === undefined ? DEFAULT_LIMIT : toPositiveInt('limit', limitParam);
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  return { filter, sort, page, limit, skip: (page - 1) * limit };
};

module.exports = { buildBookQuery, QueryError };
