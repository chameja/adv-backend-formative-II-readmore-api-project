const Author = require('../models/Author');
const Book = require('../models/Book');

// Errors thrown here (e.g. a Mongoose ValidationError) are passed by Express 5
// to the central error handler in middleware/errorHandler.js, which turns
// them into a { message } response with the right status code.

const authorNotFound = (res, id) =>
  res.status(404).json({ message: `No author found with id ${id}` });

// POST /authors
const createAuthor = async (req, res) => {
  const { name, country, bio } = req.body ?? {};
  const author = await Author.create({ name, country, bio });
  res.status(201).json(author);
};

// GET /authors
const getAuthors = async (req, res) => {
  const authors = await Author.find().sort({ name: 1 });
  res.status(200).json(authors);
};

// GET /authors/:id
const getAuthorById = async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) return authorNotFound(res, req.params.id);
  res.status(200).json(author);
};

// PUT /authors/:id
// Fields left out of the body are not changed.
const updateAuthor = async (req, res) => {
  const { name, country, bio } = req.body ?? {};
  const author = await Author.findByIdAndUpdate(
    req.params.id,
    { name, country, bio },
    { returnDocument: 'after', runValidators: true }
  );
  if (!author) return authorNotFound(res, req.params.id);
  res.status(200).json(author);
};

// DELETE /authors/:id
// Delete policy A (Block): an author who still has books can't be deleted
// (409). The client must delete or reassign those books first, so no book is
// ever left pointing at a missing author and nothing is lost by accident.
const deleteAuthor = async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) return authorNotFound(res, req.params.id);

  const bookCount = await Book.countDocuments({ author: author._id });
  if (bookCount > 0) {
    return res.status(409).json({
      message: `Cannot delete author "${author.name}": they still have ${bookCount} book${bookCount === 1 ? '' : 's'}. Delete or reassign the books first.`,
    });
  }

  await author.deleteOne();
  res.status(200).json({ message: 'Author deleted', author });
};

// GET /authors/:id/books
const getAuthorBooks = async (req, res) => {
  const author = await Author.exists({ _id: req.params.id });
  if (!author) return authorNotFound(res, req.params.id);

  const books = await Book.find({ author: req.params.id }).sort({ title: 1 });
  res.status(200).json(books);
};

// GET /authors/:id/stats
// Summarises an author's books in one aggregation pipeline, so MongoDB does
// the counting and averaging instead of sending every book to Node.
// No books: bookCount 0 and null for everything else. A price of 0 would look
// like real data (and break Rule 3), while null clearly means "no value".
const getAuthorStats = async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) return authorNotFound(res, req.params.id);

  const bookSummary = { _id: '$_id', title: '$title', price: '$price' };
  // aggregate() doesn't cast types like find() does, so match on the ObjectId
  const [stats] = await Book.aggregate([
    { $match: { author: author._id } },
    {
      $group: {
        _id: null,
        bookCount: { $sum: 1 },
        averagePrice: { $avg: '$price' },
        // Ties on price are broken by title, so the result is predictable
        cheapestBook: { $top: { sortBy: { price: 1, title: 1 }, output: bookSummary } },
        mostExpensiveBook: { $top: { sortBy: { price: -1, title: 1 }, output: bookSummary } },
      },
    },
  ]);

  res.status(200).json({
    author: { _id: author._id, name: author.name },
    bookCount: stats?.bookCount ?? 0,
    averagePrice: stats ? Math.round((stats.averagePrice + Number.EPSILON) * 100) / 100 : null,
    cheapestBook: stats?.cheapestBook ?? null,
    mostExpensiveBook: stats?.mostExpensiveBook ?? null,
  });
};

module.exports = {
  createAuthor,
  getAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
  getAuthorBooks,
  getAuthorStats,
};
