const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  the_herald_ghana_entertainment: {
    id: 1169,
    name: 'The Herald Ghana',
    domain_url: 'theheraldghana.com',
    source_category: 'Entertainment',
    tags: ['ghana', 'entertainment', 'music', 'arts', 'culture'],
    origin: 'Ghana',
    credibility: 5,
  },
};

// Reuse helper functions
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

const fetchTheHeraldGhanaEntertainment = async () => {
  const categoryUrl = 'https://theheraldghana.com/entertainment/';
  const websiteName = 'the_herald_ghana_entertainment';
  const initialTags = SOURCE_CONFIG.the_herald_ghana_entertainment.tags;

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Select each article element in the entertainment section
    $('.p-wrap.p-grid.p-grid-small-1').each((i, el) => {
      const element = $(el);

      // Title and Link
      const title = element.find('.entry-title a').text().trim();
      const link = element.find('.entry-title a').attr('href');

      // Note: The HTML snippet provided doesn't show dates for these articles
      // If dates are available elsewhere on the page, we'd need to adjust the selector
      let publishedAt = new Date().toISOString(); // Default to current date

      // Image URL
      const imageUrl = element.find('.featured-img').attr('src') || '';

      // Description - not available in the snippet, but we'll leave the field
      const descriptionSnippet = '';

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link,
          creator: ['The Herald Ghana'],
          image_url: imageUrl,
          description: cleanDescription(descriptionSnippet),
          published_at: publishedAt,
          categories: ['Entertainment'], // Default category
          tags: initialTags,
          has_image: !!imageUrl,
        });
      }
    });

    return {
      ...SOURCE_CONFIG.the_herald_ghana_entertainment,
      source_link: categoryUrl,
      image: articles.some((a) => a.has_image),
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.the_herald_ghana_entertainment,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const result = await fetchTheHeraldGhanaEntertainment();
      console.log(JSON.stringify(result, '', 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchTheHeraldGhanaEntertainment,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
