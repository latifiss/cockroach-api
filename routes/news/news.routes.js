const express = require('express');
const router = express.Router();

const {
  updateNewsInDB,
  getNewsFromDB,
  getNewsByCategory,
  getNewsById,
} = require('../../controllers/news/news.controller');

router.post('/update', updateNewsInDB);

router.get('/', getNewsFromDB);

router.get('/category', getNewsByCategory);

router.get('/:id', getNewsById);

module.exports = router;
