const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const articleController = require('../../controllers/news/article.controller');

router.post(
  '/articles',
  upload.single('image_url'),
  articleController.createArticle
);
router.patch(
  '/articles/:id',
  upload.single('image_url'),
  articleController.updateArticle
);
router.get('/articles/:id', articleController.getArticle);
router.get('/articles', articleController.getAllArticles);
router.get(
  '/articles/category/:category',
  articleController.getArticlesByCategory
);
router.get('/articles/similar/:id', articleController.getSimilarArticles);
router.get('/articles/breaking', articleController.getBreakingNews);

module.exports = router;
