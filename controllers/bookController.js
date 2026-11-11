const Book = require('../models/Book');

// POST /books
const createBook = async (req, res) => {
  try {
    const { title, genre, price, publishedYear, author } = req.body ?? {};
    const book = await Book.create({ title, genre, price, publishedYear, author });
    res.status(201).json(book);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create book' });
  }
};

// GET /books
const getBooks = async (req, res) => {
  try {
    const books = await Book.find().populate('author').sort({ title: 1 });
    res.status(200).json(books);
  } catch (err) {
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
const updateBook = async (req, res) => {
  try {
    const { title, genre, price, publishedYear, author } = req.body ?? {};
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { title, genre, price, publishedYear, author },
      { returnDocument: 'after', runValidators: true }
    ).populate('author');
    if (!book) {
      return res.status(404).json({ message: `No book found with id ${req.params.id}` });
    }
    res.status(200).json(book);
  } catch (err) {
    // CastError: a field has the wrong type, e.g. price "abc" or a malformed author id
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
