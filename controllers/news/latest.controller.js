const newsSources = require('../../sourcesIndex.js');
const Latest = require('../../models/latest.model.js');

const createLatest = async (req, res) => {
  try {
    const { isBreaking, label, ...latestData } = req.body;

    // Validate label when isBreaking is false
    if (isBreaking === false && !label) {
      return res.status(400).json({
        error: 'Label is required when isBreaking is false',
      });
    }

    // If setting as breaking news, ensure no label is set
    if (isBreaking && label) {
      return res.status(400).json({
        error: 'Cannot set label when isBreaking is true',
      });
    }

    // If setting as breaking news, unset any existing breaking news
    if (isBreaking) {
      await Latest.updateMany(
        { isBreaking: true },
        { $set: { isBreaking: false } }
      );
    }

    // Generate article_id if not provided
    if (!latestData.article_id) {
      latestData.article_id = new mongoose.Types.ObjectId().toString();
    }

    const latestNews = new Latest({
      ...latestData,
      isBreaking: isBreaking || false,
      label: isBreaking ? undefined : label,
    });

    await latestNews.save();

    res.status(201).json({
      success: true,
      message: 'Latest news created successfully',
      data: latestNews,
    });
  } catch (error) {
    console.error('Error creating latest news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create latest news',
      details: error.message,
    });
  }
};

const updateLatest = async (req, res) => {
  try {
    const { isBreaking, label, article_id, ...updateData } = req.body;
    const { id } = req.params;

    // Prevent changing article_id
    if (article_id) {
      return res.status(400).json({
        error: 'Cannot update article_id',
      });
    }

    // Find existing document
    const existingLatest = await Latest.findById(id);
    if (!existingLatest) {
      return res.status(404).json({
        error: 'Latest news not found',
      });
    }

    // Handle isBreaking and label logic
    if (isBreaking !== undefined) {
      if (isBreaking && label) {
        return res.status(400).json({
          error: 'Cannot set label when isBreaking is true',
        });
      }
      if (!isBreaking && !label && !existingLatest.label) {
        return res.status(400).json({
          error: 'Label is required when setting isBreaking to false',
        });
      }

      // If setting as breaking news, unset any existing breaking news
      if (isBreaking) {
        await Latest.updateMany(
          { isBreaking: true },
          { $set: { isBreaking: false } }
        );
        updateData.label = undefined;
      }
      updateData.isBreaking = isBreaking;
    } else if (label !== undefined) {
      // If just updating label, verify isBreaking status
      if (existingLatest.isBreaking && label) {
        return res.status(400).json({
          error: 'Cannot set label when isBreaking is true',
        });
      }
      updateData.label = label;
    }

    const updatedLatest = await Latest.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Latest news updated successfully',
      data: updatedLatest,
    });
  } catch (error) {
    console.error('Error updating latest news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update latest news',
      details: error.message,
    });
  }
};

const retrieveLatest = async (req, res) => {
  try {
    const allNews = await Promise.all(newsSources.map((fetch) => fetch()));

    let allArticles = [];
    allNews.forEach((source) => {
      if (source.articles && source.articles.length > 0) {
        const articlesWithSource = source.articles.map((article) => ({
          ...article,
          source_id: source.source_id,
          source_name: source.source_name,
          source_link: source.source_link,
          source_origin: source.source_origin,
          source_tags: source.source_tags,
          has_image: source.image,
        }));
        allArticles = [...allArticles, ...articlesWithSource];
      }
    });

    allArticles.sort((a, b) => {
      const dateA = new Date(a.published_at);
      const dateB = new Date(b.published_at);
      return dateB - dateA;
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedArticles = allArticles.slice(startIndex, endIndex);

    res.json({
      total: allArticles.length,
      page,
      total_pages: Math.ceil(allArticles.length / limit),
      articles: paginatedArticles,
    });
  } catch (error) {
    console.error('Error retrieving latest news:', error);
    res.status(500).json({
      error: 'Failed to retrieve latest news',
      details: error.message,
    });
  }
};

const getLatestNews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100; // Fixed limit of 100 as requested
    const skip = (page - 1) * limit;

    // Fetch news from Latest collection with pagination
    const [articles, total] = await Promise.all([
      Latest.find()
        .sort({ published_at: -1 }) // Sort by most recent first
        .skip(skip)
        .limit(limit),
      Latest.countDocuments(),
    ]);

    res.json({
      total,
      page,
      total_pages: Math.ceil(total / limit),
      articles,
    });
  } catch (error) {
    console.error('Error fetching latest news:', error);
    res.status(500).json({
      error: 'Failed to fetch latest news',
      details: error.message,
    });
  }
};

const getLatestNewsByCat = async (req, res) => {
  const category = (req.query.category || '').toLowerCase().trim();

  if (!category) {
    return res.status(400).json({ error: 'Missing category parameter' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100; // Fixed limit of 100 as requested
    const skip = (page - 1) * limit;

    // Query for news that have the category in their source_tags
    const [filteredArticles, total] = await Promise.all([
      Latest.find({
        source_tags: { $regex: new RegExp(category, 'i') },
      })
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(limit),
      Latest.countDocuments({
        source_tags: { $regex: new RegExp(category, 'i') },
      }),
    ]);

    res.json({
      total,
      page,
      total_pages: Math.ceil(total / limit),
      articles: filteredArticles,
    });
  } catch (error) {
    console.error('Error fetching news by category:', error);
    res.status(500).json({
      error: 'Failed to fetch news by category',
      details: error.message,
    });
  }
};

const getLatestNewsByCategory = async (req, res) => {
  const category = (req.query.category || '').toLowerCase().trim();

  if (!category) {
    return res.status(400).json({ error: 'Missing category parameter' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const skip = (page - 1) * limit;

    // Use aggregation with $facet to avoid 2 separate queries
    const result = await Latest.aggregate([
      {
        $match: {
          source_tags: category, // assumes source_tags are lowercased
        },
      },
      {
        $facet: {
          articles: [
            { $sort: { published_at: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const articles = result[0].articles || [];
    const total = result[0].totalCount[0]?.count || 0;

    res.json({
      total,
      page,
      total_pages: Math.ceil(total / limit),
      articles,
    });
  } catch (error) {
    console.error('Error fetching news by category:', error);
    res.status(500).json({
      error: 'Failed to fetch news by category',
      details: error.message,
    });
  }
};

module.exports = {
  createLatest,
  updateLatest,
  retrieveLatest,
  getLatestNews,
  getLatestNewsByCat,
  getLatestNewsByCategory,
};
