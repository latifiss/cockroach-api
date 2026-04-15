const Article = require('../../models/article.model');
const {
  generateSlug,
  generateMetaDescription,
} = require('../../utils/helpers');
const { uploadToR2, deleteFromR2 } = require('../../utils/r2');
const mongoose = require('mongoose');

const parseField = (field) => {
  if (
    typeof field === 'string' &&
    field.startsWith('[') &&
    field.endsWith(']')
  ) {
    try {
      return JSON.parse(field);
    } catch {
      return field.split(',').map((item) => item.trim());
    }
  }
  return field;
};

const createArticle = async (req, res) => {
  try {
    const isBreaking = req.body.isBreaking === 'true';
    const label = req.body.label;

    const articleData = {
      title: req.body.title,
      description: req.body.description,
      content: req.body.content,
      source_name: req.body.source_name,
      source_url: req.body.source_url,
      source_origin: req.body.source_origin,
      source_tags: parseField(req.body.source_tags || '[]'),
      categories: parseField(req.body.categories || '[]'),
      isFirstParty: req.body.isFirstParty === 'true',
      published_at: req.body.published_at || new Date(),
      isLive: req.body.isLive === 'true' ? true : false,
    };

    if (isBreaking === false && !label) {
      return res
        .status(400)
        .json({ error: 'Label is required when isBreaking is false' });
    }

    if (isBreaking && label) {
      return res
        .status(400)
        .json({ error: 'Cannot set label when isBreaking is true' });
    }

    if (isBreaking) {
      await Article.updateMany(
        { isBreaking: true },
        { $set: { isBreaking: false } }
      );
    }

    let imageUrl = null;
    if (req.file) {
      const uploadedUrl = await uploadToR2(
        req.file.buffer,
        req.file.mimetype,
        'articles'
      );
      imageUrl = uploadedUrl;
    }

    const slug = generateSlug(articleData.title);
    const meta = generateMetaDescription({
      summary: articleData.description,
      source_name: articleData.source_name,
      title: articleData.title,
    });

    const article = new Article({
      ...articleData,
      slug,
      meta,
      isBreaking: isBreaking !== undefined ? isBreaking : true,
      label: isBreaking ? undefined : label,
      article_id: new mongoose.Types.ObjectId(),
      ...(imageUrl && { image_url: imageUrl }),
    });

    await article.save();
    res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(400).json({ error: error.message });
  }
};

const updateArticle = async (req, res) => {
  try {
    const isBreaking = req.body.isBreaking === 'true';
    const label = req.body.label;
    const article_id = req.body.article_id;

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      content: req.body.content,
      source_name: req.body.source_name,
      source_url: req.body.source_url,
      source_origin: req.body.source_origin,
      source_tags: parseField(req.body.source_tags),
      categories: parseField(req.body.categories),
      isFirstParty: req.body.isFirstParty === 'true',
      published_at: req.body.published_at,
      isLive: req.body.isLive === 'true' ? true : false,
    };

    if (article_id) {
      return res.status(400).json({ error: 'Cannot update article_id' });
    }

    const existingArticle = await Article.findById(req.params.id);
    if (!existingArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (req.file) {
      if (existingArticle.image_url) {
        await deleteFromR2(
          typeof existingArticle.image_url === 'string'
            ? existingArticle.image_url
            : existingArticle.image_url.url
        );
      }

      const uploadedUrl = await uploadToR2(
        req.file.buffer,
        req.file.mimetype,
        'articles'
      );
      updateData.image_url = uploadedUrl; // Now storing just the URL string
    }

    if (isBreaking !== undefined) {
      if (isBreaking && label) {
        return res
          .status(400)
          .json({ error: 'Cannot set label when isBreaking is true' });
      }
      if (!isBreaking && !label && !existingArticle.label) {
        return res.status(400).json({
          error: 'Label is required when setting isBreaking to false',
        });
      }

      if (isBreaking) {
        await Article.updateMany(
          { isBreaking: true },
          { $set: { isBreaking: false } }
        );
        updateData.label = undefined;
      }
      updateData.isBreaking = isBreaking;
    } else if (label !== undefined) {
      if (existingArticle.isBreaking && label) {
        return res
          .status(400)
          .json({ error: 'Cannot set label when isBreaking is true' });
      }
      updateData.label = label;
    }

    if (updateData.title && updateData.title !== existingArticle.title) {
      updateData.slug = generateSlug(updateData.title);
    }

    const article = await Article.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(400).json({ error: error.message });
  }
};

const getArticle = async (req, res) => {
  try {
    const article = await Article.findOne({
      $or: [{ _id: req.params.id }, { article_id: req.params.id }],
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(article);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.isFirstParty) {
      filter.isFirstParty = req.query.isFirstParty === 'true';
    }
    if (req.query.source_origin) {
      filter.source_origin = req.query.source_origin;
    }
    if (req.query.category) {
      filter.categories = req.query.category;
    }

    const articles = await Article.find(filter)
      .sort({ published_at: -1 })
      .skip(skip)
      .limit(limit);

    const count = await Article.countDocuments(filter);

    res.json({
      articles,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getArticlesByCategory = async (req, res) => {
  try {
    const articles = await Article.find({
      categories: req.params.category,
    }).sort({ published_at: -1 });

    res.json(articles);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getSimilarArticles = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const similarArticles = await Article.find({
      _id: { $ne: article._id },
      $or: [
        { categories: { $in: article.categories } },
        { source_tags: { $in: article.source_tags } },
      ],
    })
      .sort({ published_at: -1 })
      .limit(5);

    res.json(similarArticles);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getBreakingNews = async (req, res) => {
  try {
    const breakingNews = await Article.findOne({
      isBreaking: true,
    });

    if (!breakingNews) {
      return res.status(404).json({ error: 'No breaking news found' });
    }

    res.json(breakingNews);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createArticle,
  updateArticle,
  getArticle,
  getAllArticles,
  getArticlesByCategory,
  getSimilarArticles,
  getBreakingNews,
};
