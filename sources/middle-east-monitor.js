const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  middleeastmonitor: {
    id: 1033,
    name: 'Middle East Monitor (Disqus)',
    tags: ['middle-east', 'news', 'politics', 'commentary', 'international'],
    origin: 'International',
    credibility: 4,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'thumbnail', { keepArray: false }],
      ['dc:creator', 'creator', { keepArray: true }],
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

const fetchMiddleEastMonitorNews = async () => {
  const rssUrl = 'https://middleeastmnt.disqus.com/latest.rss';
  const websiteName = 'middleeastmonitor';

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
      source_id: SOURCE_CONFIG.middleeastmonitor.id,
      source_name: SOURCE_CONFIG.middleeastmonitor.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.middleeastmonitor.origin,
      source_tags: SOURCE_CONFIG.middleeastmonitor.tags,
      source_credibility: SOURCE_CONFIG.middleeastmonitor.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(
      `Error fetching Middle East Monitor RSS feed: ${error.message}`,
      {
        url: rssUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.middleeastmonitor,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchMiddleEastMonitorNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from Middle East Monitor`
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
  fetchMiddleEastMonitorNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};
