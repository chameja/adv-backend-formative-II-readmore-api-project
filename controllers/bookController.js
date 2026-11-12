const Author = require('../models/Author');
const Book = require('../models/Book');
const { validateBookRules, escapeRegex } = require('../utils/bookRules');
const { buildBookQuery, QueryError } = require('../utils/bookQuery');

const BOOK_FIELDS = ['title', 'genre', 'price', 'publishedYear', 'author'];

// Copies only the book fields that were actually sent, so omitted fields
// are left untouched on update.
const pickBookFields = (body) => {
  const fields = {};
  for (const key of BOOK_FIELDS) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  return fields;
};

// Runs the business rules against a book document that has the incoming
// changes applied but is not yet saved. Returns { status, message } for the
// first failing check, or null if the book may be saved.
//
// Check order (cheapest and most fundamental first):
//   400 schema   missing required fields / wrong types (Mongoose validateSync)
//   422 Rule 3   price > 0, publishedYear 1450..current year
//   400 Rule 1   the referenced author exists
//   409 Rule 2   no case-insensitive duplicate title for the same author
//
// `changed` lists the fields being written, so a partial update only
// re-checks what it touches.
const checkBookRules = async (book, changed) => {
  const schemaError = book.validateSync();
  if (schemaError) {
    return { status: 400, message: schemaError.message };
  }

  const ruleInput = {};
  if (changed.includes('price')) ruleInput.price = book.price;
  if (changed.includes('publishedYear')) ruleInput.publishedYear = book.publishedYear;
  const ruleErrors = validateBookRules(ruleInput);
  if (ruleErrors.length > 0) {
    return { status: 422, message: ruleErrors.join('; ') };
  }

  if (changed.includes('author')) {
    const authorExists = await Author.exists({ _id: book.author });
    if (!authorExists) {
      return { status: 400, message: `No author found with id ${book.author}` };
    }
  }

  if (changed.includes('title') || changed.includes('author')) {
    const duplicate = await Book.exists({
      _id: { $ne: book._id },
      author: book.author,
      title: { $regex: `^${escapeRegex(book.title)}$`, $options: 'i' },
    });
    if (duplicate) {
      return {
        status: 409,
        message: `This author already has a book titled "${book.title}"`,
      };
    }
  }

  return null;
};

// POST /books
const createBook = async (req, res) => {
  try {
    const fields = pickBookFields(req.body ?? {});
    const book = new Book(fields);

    const failure = await checkBookRules(book, BOOK_FIELDS);
    if (failure) {
      return res.status(failure.status).json({ message: failure.message });
    }

    await book.save();
    res.status(201).json(book);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create book' });
  }
};

// GET /books
// Optional params: genre, minPrice, maxPrice, author, search, sort, order,
// page, limit. Responds with { page, limit, total, results }, where total is
// the number of books matching the filter (not the whole collection).
const getBooks = async (req, res) => {
  try {
    const { filter, sort, page, limit, skip } = buildBookQuery(req.query);

    const [total, results] = await Promise.all([
      Book.countDocuments(filter),
      Book.find(filter).sort(sort).skip(skip).limit(limit).populate('author'),
    ]);

    res.status(200).json({ page, limit, total, results });
  } catch (err) {
    if (err instanceof QueryError) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to fetch books' });
  }
};

// GET /books/:id
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('author');
    if (!book) {
      return res.status(404).json({ message: `No book found with id ${req.params.id}` });
    }
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch book' });
  }
};

// PUT /books/:id
// Loads the book, applies the changes in memory, runs the same rules as
// create, and only then saves. Partial updates are supported.
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: `No book found with id ${req.params.id}` });
    }

    const fields = pickBookFields(req.body ?? {});
    book.set(fields);

    const failure = await checkBookRules(book, Object.keys(fields));
    if (failure) {
      return res.status(failure.status).json({ message: failure.message });
    }

    await book.save();
    await book.populate('author');
    res.status(200).json(book);
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to update book' });
  }
};

// DELETE /books/:id
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: `No book found with id ${req.params.id}` });
    }
    res.status(200).json({ message: 'Book deleted', book });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete book' });
  }
};

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
};
