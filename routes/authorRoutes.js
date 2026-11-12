const express = require('express');
const {
  createAuthor,
  getAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
  getAuthorBooks,
  getAuthorStats,
} = require('../controllers/authorController');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.param('id', validateObjectId);

router.post('/', createAuthor);
router.get('/', getAuthors);
router.get('/:id', getAuthorById);
router.put('/:id', updateAuthor);
router.delete('/:id', deleteAuthor);
router.get('/:id/books', getAuthorBooks);
router.get('/:id/stats', getAuthorStats);

module.exports = router;
