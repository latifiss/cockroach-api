const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ajplus: {
    id: 1031,
    name: 'AJ Plus',
    tags: ['news', 'global', 'politics', 'culture', 'international'],
    origin: 'International',
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

const fetchAJPlusNews = async () => {
  const rssUrl = 'https://www.ajplus.net/stories?format=rss';
  const websiteName = 'ajplus';

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
      source_id: SOURCE_CONFIG.ajplus.id,
      source_name: SOURCE_CONFIG.ajplus.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.ajplus.origin,
      source_tags: SOURCE_CONFIG.ajplus.tags,
      source_credibility: SOURCE_CONFIG.ajplus.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching AJ+ RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.ajplus,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchAJPlusNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(`Fetched ${response.articles.length} articles from AJ+`);

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
  fetchAJPlusNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};
