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

const fetchGlamourHealthNews = async () => {
  const rssUrl = 'https://www.glamour.com/feed/health-fitness/rss';
  const websiteName = 'glamour';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1003,
      source_name: 'Glamour',
      source_link: 'https://www.glamour.com/feed/health-fitness/rss',
      source_origin: 'United States',
      source_tags: ['health'],
      source_credibility: 3,
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
    console.error('Error fetching Glamour Health RSS feed:', error);
    return {
      source_name: 'Glamour',
      source_link: 'https://www.glamour.com/feed/health-fitness/rss',
      source_origin: 'United States',
      source_tags: ['health'],
      Image: 'true',
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchGlamourHealthNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchGlamourHealthNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'glamour.com', 'Science & Health');
