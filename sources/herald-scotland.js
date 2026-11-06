const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  heraldscotland: {
    id: 1027,
    name: 'The Herald Scotland',
    domain_url: 'heraldscotland.com',
    source_category: 'Local',
    tags: ['scotland', 'news', 'politics', 'business'],
    origin: 'United Kingdom',
    credibility: 2,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: false }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosure', { keepArray: false }],
    ],
  },
  timeout: 100000,
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const cleanDescription = (description) => {
  if (!description) return '';
  // Remove HTML tags and multiple spaces
  return description
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getImageUrl = (item) => {
  // Check media:content first, then enclosure
  return item.media?.$?.url || item.enclosure?.url || '';
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

const fetchHeraldScotlandNews = async () => {
  const rssUrl = 'https://www.heraldscotland.com/news/rss/';
  const websiteName = 'heraldscotland';

  try {
    const feed = await parser.parseURL(rssUrl);

    const articles = feed.items
      .filter((item) => item.title && item.link)
      .map((item) => ({
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
          : [item.creator || ''],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.content || item.contentSnippet || item.description
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
      }));

    return {
      source_id: SOURCE_CONFIG.heraldscotland.id,
      source_name: SOURCE_CONFIG.heraldscotland.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.heraldscotland.origin,
      source_tags: SOURCE_CONFIG.heraldscotland.tags,
      source_credibility: SOURCE_CONFIG.heraldscotland.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(
      `Error fetching The Herald Scotland RSS feed: ${error.message}`,
      {
        url: rssUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.heraldscotland,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchHeraldScotlandNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from The Herald Scotland`
    );

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
  fetchHeraldScotlandNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
