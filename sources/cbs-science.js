const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  cbsnewsScience: {
    id: 111012,
    name: 'CBS News',
    domain_url: 'cbsnews.com',
    source_category: 'Science & Health',
    tags: ['science', 'research', 'space', 'climate'],
    origin: 'United States',
    credibility: 4,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['dc:creator', 'dc:creator', { keepArray: true }],
      ['image', 'image', { keepArray: false }],
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
  const imageNode = item.image;
  if (!imageNode) return '';

  if (typeof imageNode === 'string' && imageNode.trim() !== '') {
    return imageNode.trim();
  }

  if (typeof imageNode === 'object') {
    return imageNode.url || imageNode._ || '';
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

const fetchCBSNewsScience = async () => {
  const rssUrl = 'https://www.cbsnews.com/latest/rss/science';
  const websiteName = 'cbsnews-science';

  try {
    const feed = await parser.parseURL(rssUrl);

    const articles = feed.items
      .filter((item) => item.title && item.link)
      .map((item) => ({
        article_id: generateArticleId(
          item.title,
          item.link,
          websiteName,
          item.pubDate,
        ),
        title: item.title.trim(),
        link: item.link,
        creator: Array.isArray(item['dc:creator'])
          ? item['dc:creator'].map((c) => c.replace(/^by /i, '').trim())
          : [],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.content || item.contentSnippet || item.description,
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
      }));

    return {
      source_id: SOURCE_CONFIG.cbsnewsScience.id,
      source_name: SOURCE_CONFIG.cbsnewsScience.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.cbsnewsScience.origin,
      source_tags: SOURCE_CONFIG.cbsnewsScience.tags,
      source_credibility: SOURCE_CONFIG.cbsnewsScience.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(
      `Error fetching CBS News Science RSS feed: ${error.message}`,
      {
        url: rssUrl,
        stack: error.stack,
      },
    );
    return {
      ...SOURCE_CONFIG.cbsnewsScience,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchCBSNewsScience();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from CBS News Science`,
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
  fetchCBSNewsScience,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};

require('../utils/sourceConfig').attachSourceConfigName(
  module.exports,
  SOURCE_CONFIG,
);
