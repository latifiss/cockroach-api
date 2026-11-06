const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  the_herald_ghana: {
    id: 1169,
    name: 'The Herald Ghana',
    domain_url: 'theheraldghana.com',
    source_category: 'Africa',
    tags: ['ghana', 'local', 'news', 'general'],
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

const fetchTheHeraldGhanaNews = async () => {
  const categoryUrl = 'https://theheraldghana.com/category/general/';
  const websiteName = 'the_herald_ghana';
  const initialTags = SOURCE_CONFIG.the_herald_ghana.tags;

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Select each article element
    $('.p-wrap.p-list.p-list-1').each((i, el) => {
      const element = $(el);

      // Title and Link
      const title = element.find('.entry-title a').text().trim();
      const link = element.find('.entry-title a').attr('href');

      // Published Date - using the datetime attribute for more reliable parsing
      const dateTime = element.find('time.published').attr('datetime');
      let publishedAt = '';
      try {
        publishedAt = dateTime
          ? new Date(dateTime).toISOString()
          : new Date().toISOString();
      } catch (e) {
        console.warn(
          `Could not parse date "${dateTime}". Using current date. Error: ${e.message}`
        );
        publishedAt = new Date().toISOString();
      }

      // Image URL - using the img tag's src attribute
      const imageUrl = element.find('.featured-img').attr('src') || '';

      // Description - using the entry-summary paragraph
      const descriptionSnippet = element.find('.entry-summary').text().trim();

      // Categories - collect all categories listed
      const categories = [];
      element.find('.p-categories .p-category').each((i, catEl) => {
        const category = $(catEl).text().trim();
        if (category && !categories.includes(category)) {
          categories.push(category);
        }
      });

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link,
          creator: ['The Herald Ghana'], // Default creator
          image_url: imageUrl,
          description: cleanDescription(descriptionSnippet),
          published_at: publishedAt,
          categories: categories.length > 0 ? categories : ['General'], // Fallback to 'General'
          tags: initialTags,
          has_image: !!imageUrl,
        });
      }
    });

    return {
      ...SOURCE_CONFIG.the_herald_ghana,
      source_link: categoryUrl,
      image: articles.some((a) => a.has_image), // Indicates if ANY article has an image
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.the_herald_ghana,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const result = await fetchTheHeraldGhanaNews();
      console.log(JSON.stringify(result, '', 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchTheHeraldGhanaNews,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
