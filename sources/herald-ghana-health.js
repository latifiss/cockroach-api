const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  the_herald_ghana_health: {
    id: 1169,
    name: 'The Herald Ghana',
    domain_url: 'theheraldghana.com',
    source_category: 'Science & Health',
    tags: [
      'ghana',
      'health',
      'medicine',
      'wellness',
      'public health',
      'healthcare',
    ],
    origin: 'Ghana',
    credibility: 5,
  },
};

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

const fetchTheHeraldGhanaHealth = async () => {
  const categoryUrl = 'https://theheraldghana.com/category/health/';
  const websiteName = 'the_herald_ghana_health';
  const initialTags = SOURCE_CONFIG.the_herald_ghana_health.tags;

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // The health section uses the same list layout as sports
    $('.p-wrap.p-list.p-list-1').each((i, el) => {
      const element = $(el);

      const title = element.find('.entry-title a').text().trim();
      const link = element.find('.entry-title a').attr('href');
      const pubDateElement = element.find('time.published');
      const publishedAt = pubDateElement.length
        ? new Date(pubDateElement.attr('datetime')).toISOString()
        : new Date().toISOString();
      const imageUrl = element.find('.featured-img').attr('src') || '';
      const descriptionSnippet = element.find('.entry-summary').text().trim();

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link,
          creator: ['The Herald Ghana'],
          image_url: imageUrl,
          description: cleanDescription(descriptionSnippet),
          published_at: publishedAt,
          categories: ['Health'],
          tags: initialTags,
          has_image: !!imageUrl,
        });
      }
    });

    return {
      ...SOURCE_CONFIG.the_herald_ghana_health,
      source_link: categoryUrl,
      image: articles.some((a) => a.has_image),
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.the_herald_ghana_health,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const result = await fetchTheHeraldGhanaHealth();
      console.log(JSON.stringify(result, '', 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchTheHeraldGhanaHealth,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
