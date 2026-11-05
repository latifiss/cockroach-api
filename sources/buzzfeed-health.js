const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
      ['dc:creator', 'dc:creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchBuzzfeedHealthNews = async () => {
  const rssUrl = 'https://www.buzzfeed.com/health.xml';
  const websiteName = 'buzzfeed';

  try {
    const feed = await parser.parseURL(rssUrl);

    return {
      source_id: 1000,
      source_name: 'Buzzfeed',
      source_link: 'https://www.buzzfeed.com/health.xml',
      source_origin: 'United States',
      source_tags: ['health'],
      source_credibility: 4,
      image: true,
      articles: feed.items.map((item) => {
        const keywords = Array.isArray(item.categories)
          ? item.categories
              .filter((cat) => typeof cat === 'string')
              .map((cat) => cat.replace(/.*\//, ''))
          : [];

        return {
          article_id: generateArticleId(
            item.title,
            item.link,
            websiteName,
            item.pubDate
          ),
          title: item.title,
          link: item.link,
          keywords,
          creator: item['dc:creator'] || [],
          image_url: item['media:thumbnail']?.[0]?.$?.url || '',
          description: item.description || item.contentSnippet || '',
          published_at: item.isoDate || item.pubDate,
        };
      }),
    };
  } catch (error) {
    console.error('Error fetching Buzzfeed Health RSS feed:', error);
    return {
      source_name: 'Buzzfeed',
      source_link: 'https://www.buzzfeed.com/health.xml',
      source_origin: 'United States',
      source_tags: ['health'],
      articles: [],
      error: { code: error?.response?.status ? `HTTP_${error.response.status}` : error.code || 'SOURCE_FETCH_FAILED', message: error.message },
    };
  }
};

const main = async () => {
  const response = await fetchBuzzfeedHealthNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchBuzzfeedHealthNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'buzzfeed.com', 'Science & Health');
