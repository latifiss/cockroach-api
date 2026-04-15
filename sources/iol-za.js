const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  iol_news: {
    id: 1129,
    name: 'IOL News',
    tags: [
      'news',
      'south-africa',
      'africa',
      'international',
      'crime',
      'business',
    ],
    origin: 'South Africa',
    credibility: 4.2,
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
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  if (item.media?.$?.url) return item.media.$.url;
  if (item.fullContent) {
    const imgMatch = item.fullContent.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch) return imgMatch[1];
  }
  return '';
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

const fetchIOLNews = async () => {
  const rssUrl = 'https://rss.iol.io/iol/news';
  const websiteName = 'iol_news';

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
          : [item.creator || 'IOL News'],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.contentSnippet || item.description || ''
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
        full_content: item.fullContent || null,
      }));

    return {
      source_id: SOURCE_CONFIG.iol_news.id,
      source_name: SOURCE_CONFIG.iol_news.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.iol_news.origin,
      source_tags: SOURCE_CONFIG.iol_news.tags,
      source_credibility: SOURCE_CONFIG.iol_news.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching IOL News RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.iol_news,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchIOLNewsRSS();
    console.log(JSON.stringify(response, null, 2));
    console.log(`Fetched ${response.articles.length} articles from IOL News`);

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
  fetchIOLNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};
