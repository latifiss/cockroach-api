const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  accramail: {
    id: 1157,
    name: 'Accra Mail',
    domain_url: 'accramail.com',
    source_category: 'Local',
    tags: [
      'news',
      'ghana',
      'politics',
      'local',
      'sports',
      'entertainment',
      'health',
      'education',
    ],
    origin: 'Ghana',
    credibility: 5,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: false }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosure', { keepArray: false }],
      ['content:encoded', 'contentEncoded', { keepArray: false }],
      ['media:thumbnail', 'thumbnail', { keepArray: false }],
    ],
  },
  timeout: 100000,
});

// Helper functions
const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const cleanDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const cleanCategories = (categories) => {
  return (categories || [])
    .map((c) => {
      if (typeof c === 'string') return c.trim();
      if (c && typeof c === 'object' && c._) return c._.trim();
      return '';
    })
    .filter((c) => c);
};

const getImageUrl = (item) => {
  // Check standard RSS image locations first
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  if (item.media?.$?.url) {
    return item.media.$.url;
  }
  if (item.thumbnail?.$?.url) {
    return item.thumbnail.$.url;
  }

  // Then try to extract from content:encoded HTML
  if (item.contentEncoded) {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const match = imgRegex.exec(item.contentEncoded);
    if (match && match[1]) {
      return match[1].split('?')[0]; // Remove query parameters
    }
  }

  return '';
};

const fetchAccraMailNews = async () => {
  const rssUrl = 'https://accramail.com/feed/';
  const websiteName = 'accramail';

  try {
    const feed = await parser.parseURL(rssUrl);

    const articles = feed.items
      .filter((item) => item.title && item.link)
      .map((item) => {
        const imageUrl = getImageUrl(item);

        return {
          article_id: generateArticleId(
            item.title,
            item.link,
            websiteName,
            item.pubDate
          ),
          title: item.title.trim(),
          link: item.link,
          creator: Array.isArray(item.creator)
            ? item.creator
            : [item.creator || 'Accra Mail'],
          image_url: imageUrl,
          description: cleanDescription(
            item.content || item.contentSnippet || item.description
          ),
          published_at: item.isoDate || item.pubDate,
          categories: cleanCategories(item.categories),
          has_image: !!imageUrl,
        };
      });

    return {
      source_id: SOURCE_CONFIG.accramail.id,
      source_name: SOURCE_CONFIG.accramail.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.accramail.origin,
      source_tags: SOURCE_CONFIG.accramail.tags,
      source_credibility: SOURCE_CONFIG.accramail.credibility,
      image: articles.some((article) => article.has_image),
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Accra Mail RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.accramail,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchAccraMailNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(`Fetched ${response.articles.length} articles from Accra Mail`);

    if (response.articles.length > 0) {
      console.log('\nSample article:');
      console.log({
        title: response.articles[0].title,
        link: response.articles[0].link,
        image_url: response.articles[0].image_url,
        creator: response.articles[0].creator,
        categories: response.articles[0].categories,
      });
    }
  } catch (error) {
    console.error('Main execution failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  fetchAccraMailNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
