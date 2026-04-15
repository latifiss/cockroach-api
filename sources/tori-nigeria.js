const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  tori_ng: {
    id: 1123,
    name: 'Tori News',
    tags: [
      'news',
      'nigeria',
      'entertainment',
      'gossip',
      'lifestyle',
      'politics',
      'africa',
    ],
    origin: 'Nigeria',
    credibility: 3.8,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: false }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosure', { keepArray: false }],
      ['media:thumbnail', 'thumbnail', { keepArray: false }],
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
  if (item.thumbnail?.$?.url) return item.thumbnail.$.url;
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/'))
    return item.enclosure.url;
  if (item.media?.$?.url) return item.media.$.url;

  const imgMatch = item.content?.match(/<img[^>]+src="([^">]+)"/);
  return imgMatch ? imgMatch[1] : '';
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

const fetchToriNGNews = async () => {
  const rssUrl = 'https://www.tori.ng/feed/rss.xml';
  const websiteName = 'tori_ng';

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
          : [item.creator || 'Tori News'],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.content || item.contentSnippet || item.description
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
      }));

    return {
      source_id: SOURCE_CONFIG.tori_ng.id,
      source_name: SOURCE_CONFIG.tori_ng.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.tori_ng.origin,
      source_tags: SOURCE_CONFIG.tori_ng.tags,
      source_credibility: SOURCE_CONFIG.tori_ng.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Tori News RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.tori_ng,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchToriNGNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(`Fetched ${response.articles.length} articles from Tori News`);

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
  fetchToriNGNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};
