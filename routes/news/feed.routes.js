const router = require('express').Router();
const { getNewsFeed } = require('../../controllers/news/feed.controller');

router.get('/feed', getNewsFeed);

module.exports = router;
