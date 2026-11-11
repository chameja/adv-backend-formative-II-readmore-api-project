const express = require('express');
const { createAuthor, getAuthors } = require('../controllers/authorController');

const router = express.Router();

router.post('/', createAuthor);
router.get('/', getAuthors);

module.exports = router;
