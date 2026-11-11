const Author = require('../models/Author');

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

module.exports = { createAuthor, getAuthors };
