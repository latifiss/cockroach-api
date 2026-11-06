const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  channels_tv: {
    id: 1119,
    name: 'Channels TV',
    domain_url: 'channelstv.com',
    source_category: 'Africa',
    tags: [
      'news',
      'nigeria',
      'breaking',
      'politics',
      'business',
      'health',
      'africa',
      'international',
    ],
    origin: 'Nigeria',
    credibility: 4.5,
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
  return description
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getImageUrl = (item) => {
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

const fetchChannelsTVNews = async () => {
  const rssUrl = 'https://www.channelstv.com/feed/';
  const websiteName = 'channels_tv';

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
          : [item.creator || 'Channels TV'],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.content || item.contentSnippet || item.description
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
      }));

    return {
      source_id: SOURCE_CONFIG.channels_tv.id,
      source_name: SOURCE_CONFIG.channels_tv.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.channels_tv.origin,
      source_tags: SOURCE_CONFIG.channels_tv.tags,
      source_credibility: SOURCE_CONFIG.channels_tv.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Channels TV RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.channels_tv,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchChannelsTVNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from Channels TV`
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
  fetchChannelsTVNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
