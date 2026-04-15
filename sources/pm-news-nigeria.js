const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  pm_news: {
    id: 1117,
    name: 'PM News Nigeria',
    tags: [
      'news',
      'nigeria',
      'breaking',
      'politics',
      'entertainment',
      'sports',
      'business',
      'international',
    ],
    origin: 'Nigeria',
    credibility: 4,
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
  // PM News often uses enclosure for images
  if (
    item.enclosure &&
    item.enclosure.url &&
    item.enclosure.type.startsWith('image/')
  ) {
    return item.enclosure.url;
  }
  return item.media?.$?.url || '';
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

const fetchPMNews = async () => {
  const rssUrl = 'https://pmnewsnigeria.com/feed/';
  const websiteName = 'pm_news';

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
          : [item.creator || 'PM News'],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.content || item.contentSnippet || item.description
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
      }));

    return {
      source_id: SOURCE_CONFIG.pm_news.id,
      source_name: SOURCE_CONFIG.pm_news.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.pm_news.origin,
      source_tags: SOURCE_CONFIG.pm_news.tags,
      source_credibility: SOURCE_CONFIG.pm_news.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching PM News RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.pm_news,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchPMNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(`Fetched ${response.articles.length} articles from PM News`);

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
  fetchPMNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};
