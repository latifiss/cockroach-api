const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['dc:creator', 'dc:creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchYahooHealthNews = async () => {
  const rssUrl = 'https://news.yahoo.com/rss/health';
  const websiteName = 'yahoo';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1013,
      source_name: 'Yahoo',
      source_link: rssUrl,
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
          image_url: item['media:content']?.[0]?.$?.url || '',
          description: item.description || item.contentSnippet || '',
          published_at: item.isoDate || item.pubDate,
        };
      }),
    };
  } catch (error) {
    console.error('Error fetching Yahoo Health RSS feed:', error);
    return {
      source_name: 'Yahoo',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['health'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchYahooHealthNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchYahooHealthNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'yahoo.com', 'Science & Health');
