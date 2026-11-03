const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  nigerian_eye: {
    id: 1127,
    name: 'Nigerian Eye',
    domain_url: 'nigerianeye.com',
    source_category: 'Africa',
    tags: [
      'news',
      'nigeria',
      'politics',
      'entertainment',
      'sports',
      'business',
      'africa',
      'international',
    ],
    origin: 'Nigeria',
    credibility: 3.9,
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
  // Check for Blogger-specific image format
  if (item.fullContent) {
    const imgMatch = item.fullContent.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch) return imgMatch[1];
  }

  // Check standard RSS image fields
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

const fetchNigerianEyeNews = async () => {
  const rssUrl = 'https://www.nigerianeye.com/feeds/posts/default';
  const websiteName = 'nigerian_eye';

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
          : [item.creator || 'Nigerian Eye'],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.contentSnippet || item.description || ''
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
        full_content: item.fullContent || null,
      }));

    return {
      source_id: SOURCE_CONFIG.nigerian_eye.id,
      source_name: SOURCE_CONFIG.nigerian_eye.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.nigerian_eye.origin,
      source_tags: SOURCE_CONFIG.nigerian_eye.tags,
      source_credibility: SOURCE_CONFIG.nigerian_eye.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Nigerian Eye RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.nigerian_eye,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchNigerianEyeNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from Nigerian Eye`
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
  fetchNigerianEyeNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
