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

module.exports = { createBook, getBooks };
