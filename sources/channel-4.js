const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  channel4: {
    id: 1025,
    name: 'Channel 4 News',
    domain_url: 'channel4.com',
    source_category: 'News',
    tags: ['uk', 'news', 'politics', 'current-affairs'],
    origin: 'United Kingdom',
    credibility: 3,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'thumbnail', { keepArray: false }],
      ['media:content', 'media', { keepArray: true }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
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
  return description
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getImageUrl = (item) => {
  if (item.media && Array.isArray(item.media)) {
    const image = item.media.find((m) => m.$ && m.$.medium === 'image');
    return image?.$?.url || '';
  }
  return item.thumbnail?.$?.url || '';
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

const fetchChannel4News = async () => {
  const rssUrl = 'https://www.channel4.com/news/feed';
  const websiteName = 'channel4';

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
      source_id: SOURCE_CONFIG.channel4.id,
      source_name: SOURCE_CONFIG.channel4.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.channel4.origin,
      source_tags: SOURCE_CONFIG.channel4.tags,
      source_credibility: SOURCE_CONFIG.channel4.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Channel 4 News RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.channel4,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchChannel4News();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from Channel 4 News`
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
  fetchChannel4News,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
