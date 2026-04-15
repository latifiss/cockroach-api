const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  huffpost: {
    id: 1028,
    name: 'Huffington Post UK',
    tags: ['uk', 'news', 'politics', 'international'],
    origin: 'United Kingdom',
    credibility: 3,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: true }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
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
  // Remove HTML tags and multiple spaces
  return description
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getImageUrl = (item) => {
  // Check media:content first, then thumbnail
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

const fetchHuffPostUKNews = async () => {
  const rssUrl = 'https://www.huffingtonpost.co.uk/feeds/index.xml';
  const websiteName = 'huffpost';

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
      source_id: SOURCE_CONFIG.huffpost.id,
      source_name: SOURCE_CONFIG.huffpost.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.huffpost.origin,
      source_tags: SOURCE_CONFIG.huffpost.tags,
      source_credibility: SOURCE_CONFIG.huffpost.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(
      `Error fetching Huffington Post UK RSS feed: ${error.message}`,
      {
        url: rssUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.huffpost,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchHuffPostUKNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from Huffington Post UK`
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
  fetchHuffPostUKNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};
