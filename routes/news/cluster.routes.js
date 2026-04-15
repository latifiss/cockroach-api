const router = require('express').Router();
const {
  getclusterLatestNews,
} = require('../../controllers/news/cluster.controller');

router.get('/cluster', getclusterLatestNews);

module.exports = router;
