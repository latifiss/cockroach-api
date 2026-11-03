const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  newsghana_business: {
    id: 1173,
    name: 'News Ghana',
    domain_url: 'newsghana.com.gh',
    source_category: 'Business & Finance',
    tags: ['news', 'ghana', 'business', 'economy', 'finance'],
    origin: 'Ghana',
    credibility: 5,
  },
};

// Reuse the helper functions
const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${
    pubDate || new Date().toISOString()
  }`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const cleanDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseArticleDate = (dateString) => {
  if (!dateString) return new Date().toISOString();
  return new Date(dateString).toISOString();
};

const fetchNewsGhanaBusinessNews = async () => {
  const baseUrl = 'https://www.newsghana.com.gh';
  const newsUrl = 'https://www.newsghana.com.gh/business-news/';
  const websiteName = 'newsghana-business';

  try {
    const response = await axios.get(newsUrl);
    const $ = cheerio.load(response.data);

    const articlesContainer = $('#tdi_74'); // Same container element as before
    if (articlesContainer.length === 0) {
      throw new Error('Business news articles container not found');
    }

    const articles = articlesContainer
      .find('.tdb_module_loop')
      .map((i, element) => {
        const item = $(element);

        // Extract title and link
        const titleElement = item.find('.entry-title a');
        const title = titleElement.attr('title') || titleElement.text().trim();
        const link = titleElement.attr('href');

        // Extract image URL from CSS background-image
        const imageElement = item.find('.td-module-thumb .td-image-wrap span');
        let imageUrl =
          imageElement.attr('data-img-url') ||
          (imageElement.attr('style')
            ? imageElement.attr('style').match(/url\(["']?(.*?)["']?\)/)[1]
            : '');

        // Extract category (will likely be "Business" for all, but we'll check)
        const categoryElement = item.find('.td-post-category');
        const category = categoryElement.text().trim() || 'Business';

        // Extract description
        const description = item.find('.td-excerpt').text().trim();

        // Extract author and date
        const authorElement = item.find('.td-post-author-name a');
        const author = authorElement.text().trim();
        const dateElement = item.find('.td-module-date');
        const date = dateElement.attr('datetime') || dateElement.text().trim();

        return {
          article_id: generateArticleId(title, link, websiteName, date),
          title: title,
          link: link,
          creator: [author || 'News Ghana'],
          image_url: imageUrl,
          description: cleanDescription(description),
          published_at: parseArticleDate(date),
          categories: [category],
          has_image: !!imageUrl,
        };
      })
      .get();

    return {
      source_id: SOURCE_CONFIG.newsghana_business.id,
      source_name: SOURCE_CONFIG.newsghana_business.name,
      source_link: newsUrl,
      source_origin: SOURCE_CONFIG.newsghana_business.origin,
      source_tags: SOURCE_CONFIG.newsghana_business.tags,
      source_credibility: SOURCE_CONFIG.newsghana_business.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(`Error fetching NewsGhana business news: ${error.message}`, {
      url: newsUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.newsghana_business,
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchNewsGhanaBusinessNews();
    console.log(
      `Successfully scraped ${response.articles.length} business news articles\n`
    );

    console.log('[');
    response.articles.forEach((article, index) => {
      const articleJson = {
        article_id: article.article_id,
        title: article.title,
        link: article.link,
        creator: article.creator,
        image_url: article.image_url,
        description: article.description,
        published_at: article.published_at,
        categories: article.categories,
        has_image: article.has_image,
      };

      console.log(
        JSON.stringify(articleJson, null, 2) +
          (index < response.articles.length - 1 ? ',' : '')
      );
    });
    console.log(']');
  } catch (error) {
    console.error('Main execution failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  fetchNewsGhanaBusinessNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
