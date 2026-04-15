const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  mylondon: {
    id: 1021,
    name: 'My London',
    tags: ['london', 'uk', 'news'],
    origin: 'United Kingdom',
    credibility: 3,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['dc:creator', 'dc:creator', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
      ['media:content', 'media:content', { keepArray: true }],
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
  if (item['media:content'] && Array.isArray(item['media:content'])) {
    const images = item['media:content']
      .filter((media) => media.$ && media.$.url)
      .sort((a, b) => parseInt(b.$.width || 0) - parseInt(a.$.width || 0));
    return images[0]?.$.url || '';
  }
  return item['media:thumbnail']?.$?.url || '';
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

const fetchMyLondonNews = async () => {
  const rssUrl = 'https://www.mylondon.news/news/?service=rss';
  const websiteName = 'mylondon';

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
        creator: Array.isArray(item['dc:creator'])
          ? item['dc:creator'].map((c) => c.replace(/^by /i, '').trim())
          : [],
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.content || item.contentSnippet || item.description
        ),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
      }));

    return {
      source_id: SOURCE_CONFIG.mylondon.id,
      source_name: SOURCE_CONFIG.mylondon.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.mylondon.origin,
      source_tags: SOURCE_CONFIG.mylondon.tags,
      source_credibility: SOURCE_CONFIG.mylondon.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching MyLondon News RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.mylondon,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchMyLondonNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from MyLondon News`
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
  fetchMyLondonNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};
