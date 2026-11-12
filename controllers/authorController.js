const Author = require('../models/Author');
const Book = require('../models/Book');

// POST /authors
const createAuthor = async (req, res) => {
  try {
    const { name, country, bio } = req.body ?? {};
    const author = await Author.create({ name, country, bio });
    res.status(201).json(author);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create author' });
  }
};

// GET /authors
const getAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ name: 1 });
    res.status(200).json(authors);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch authors' });
  }
};

// GET /authors/:id
const getAuthorById = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `No author found with id ${req.params.id}` });
    }
    res.status(200).json(author);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch author' });
  }
};

// PUT /authors/:id
const updateAuthor = async (req, res) => {
  try {
    const { name, country, bio } = req.body ?? {};
    const author = await Author.findByIdAndUpdate(
      req.params.id,
      { name, country, bio },
      { returnDocument: 'after', runValidators: true }
    );
    if (!author) {
      return res.status(404).json({ message: `No author found with id ${req.params.id}` });
    }
    res.status(200).json(author);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to update author' });
  }
};

// DELETE /authors/:id
// Delete policy A (Block): an author who still has books can't be deleted
// (409). The client must delete or reassign those books first, so no book is
// ever left pointing at a missing author and nothing is lost by accident.
const deleteAuthor = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `No author found with id ${req.params.id}` });
    }

    const bookCount = await Book.countDocuments({ author: author._id });
    if (bookCount > 0) {
      return res.status(409).json({
        message: `Cannot delete author "${author.name}": they still have ${bookCount} book${bookCount === 1 ? '' : 's'}. Delete or reassign the books first.`,
      });
    }

    await author.deleteOne();
    res.status(200).json({ message: 'Author deleted', author });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete author' });
  }
};

// GET /authors/:id/books
const getAuthorBooks = async (req, res) => {
  try {
    const author = await Author.exists({ _id: req.params.id });
    if (!author) {
      return res.status(404).json({ message: `No author found with id ${req.params.id}` });
    }
    const books = await Book.find({ author: req.params.id }).sort({ title: 1 });
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch author's books" });
  }
};

module.exports = {
  createAuthor,
  getAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
  getAuthorBooks,
};
