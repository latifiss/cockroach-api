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

const fetchEconomistFinanceNews = async () => {
  const rssUrl = 'https://www.economist.com/finance-and-economics/rss.xml';
  const websiteName = 'economist';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1001,
      source_name: 'The Economist',
      source_link: 'https://www.economist.com/finance-and-economics/rss.xml',
      source_origin: 'United Kingdom',
      source_tags: ['finance', 'economics'],
      source_credibility: 4,
      image: false,
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
        image_url: item['media:content']?.[0]?.$?.url || null,
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error('Error fetching The Economist Finance RSS feed:', error);
    return {
      source_name: 'The Economist',
      source_link: 'https://www.economist.com/finance-and-economics/rss.xml',
      source_origin: 'United Kingdom',
      source_tags: ['finance', 'economics'],
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchEconomistFinanceNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchEconomistFinanceNews };
