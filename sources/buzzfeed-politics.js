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

const fetchBuzzfeedPoliticsNews = async () => {
  const rssUrl = 'https://www.buzzfeed.com/politics.xml';
  const websiteName = 'buzzfeed';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1000,
      source_name: 'Buzzfeed',
      source_link: 'https://www.buzzfeed.com/politics.xml',
      source_origin: 'United States',
      source_tags: ['us', 'politics'],
      source_credibility: 4,
      image: true,
      articles: feed.items.map((item) => ({
        article_id: generateArticleId(
          item.title,
          item.link,
          websiteName,
          item.pubDate
        ),
        title: item.title,
        link: item.link,
        creator: item['dc:creator'] || [],
        image_url: item['media:thumbnail']?.[0]?.$?.url || '',
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error('Error fetching Buzzfeed Politics RSS feed:', error);
    return {
      source_name: 'Buzzfeed',
      source_link: 'https://www.buzzfeed.com/politics.xml',
      source_origin: 'United States',
      source_tags: ['us', 'politics'],
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchBuzzfeedPoliticsNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchBuzzfeedPoliticsNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'buzzfeed.com', 'Politics');
