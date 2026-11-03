const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  daily_maverick: {
    id: 1131,
    name: 'Daily Maverick',
    domain_url: 'dailymaverick.co.za',
    source_category: 'Africa',
    tags: [
      'news',
      'south-africa',
      'politics',
      'africa',
      'investigative',
      'analysis',
    ],
    origin: 'South Africa',
    credibility: 4.6,
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
  if (item.fullContent) {
    const featuredImgMatch = item.fullContent.match(
      /<img[^>]+class="[^"]*featured-image[^"]*"[^>]+src="([^">]+)"/i
    );
    if (featuredImgMatch) return featuredImgMatch[1];

    const imgMatch = item.fullContent.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch) return imgMatch[1];
  }
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

const fetchDailyMaverickNews = async () => {
  const rssUrl = 'https://www.dailymaverick.co.za/dmrss/';
  const websiteName = 'daily_maverick';

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
          : [item.creator || 'Daily Maverick'],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.contentSnippet || item.description || ''
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
        full_content: item.fullContent || null,
      }));

    return {
      source_id: SOURCE_CONFIG.daily_maverick.id,
      source_name: SOURCE_CONFIG.daily_maverick.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.daily_maverick.origin,
      source_tags: SOURCE_CONFIG.daily_maverick.tags,
      source_credibility: SOURCE_CONFIG.daily_maverick.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Daily Maverick RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.daily_maverick,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchDailyMaverickNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from Daily Maverick`
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
  fetchDailyMaverickNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
