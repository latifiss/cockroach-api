const router = require('express').Router();
const {
  createLatest,
  updateLatest,
  getLatestNews,
  getLatestNewsByCategory,
} = require('../../controllers/news/latest.controller');

router.post('/create/latest', createLatest);

router.put('/update/latest', updateLatest);

router.get('/latest', getLatestNews);

router.get('/latest-by-category', getLatestNewsByCategory);

module.exports = router;
