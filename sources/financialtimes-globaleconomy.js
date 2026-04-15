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

const fetchFinancialTimesGlobalEconomyNews = async () => {
  const rssUrl = 'https://www.ft.com/global-economy?format=rss';
  const websiteName = 'financialtimes';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1002,
      source_name: 'Financial Times',
      source_link: 'https://www.ft.com/global-economy?format=rss',
      source_origin: 'United Kingdom',
      source_tags: ['world', 'business', 'economy'],
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
        image_url: item['media:content']?.[0]?.$?.url || '',
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error(
      'Error fetching Financial Times Global Economy RSS feed:',
      error
    );
    return {
      source_name: 'Financial Times',
      source_link: 'https://www.ft.com/global-economy?format=rss',
      source_origin: 'United Kingdom',
      source_tags: ['world', 'business', 'economy'],
      Image: 'true',
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchFinancialTimesGlobalEconomyNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchFinancialTimesGlobalEconomyNews };
