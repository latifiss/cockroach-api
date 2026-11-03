const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ripples_ng: {
    id: 1125,
    name: 'Ripples Nigeria',
    domain_url: 'ripplesnigeria.com',
    source_category: 'Africa',
    tags: [
      'news',
      'nigeria',
      'politics',
      'business',
      'economy',
      'analysis',
      'africa',
      'international',
    ],
    origin: 'Nigeria',
    credibility: 4.3,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: false }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosure', { keepArray: false }],
      ['content:encoded', 'fullContent', { keepArray: false }],
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
  // Check for featured image in content
  const content = item.fullContent || item.content || '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch) return imgMatch[1];

  // Fallback to standard image sources
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

const fetchRipplesNGNews = async () => {
  const rssUrl = 'https://www.ripplesnigeria.com/feed/';
  const websiteName = 'ripples_ng';

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
          : [item.creator || 'Ripples Nigeria'],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.contentSnippet || item.description || ''
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
        full_content: item.fullContent || null,
      }));

    return {
      source_id: SOURCE_CONFIG.ripples_ng.id,
      source_name: SOURCE_CONFIG.ripples_ng.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.ripples_ng.origin,
      source_tags: SOURCE_CONFIG.ripples_ng.tags,
      source_credibility: SOURCE_CONFIG.ripples_ng.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Ripples Nigeria RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.ripples_ng,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchRipplesNGNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from Ripples Nigeria`
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
  fetchRipplesNGNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
