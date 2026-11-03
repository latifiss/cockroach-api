const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchBBCPoliticsNews = async () => {
  const rssUrl = 'https://feeds.bbci.co.uk/news/politics/rss.xml';
  const websiteName = 'bbcpolitics';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1014,
      source_name: 'BBC Politics',
      source_link: rssUrl,
      source_origin: 'United Kingdom',
      source_tags: ['politics', 'government', 'elections', 'policy'],
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
        keywords: item.categories || [],
        creator: [],
        image_url: item['media:thumbnail']?.[0]?.$.url || '',
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error('Error fetching BBC Politics RSS feed:', error);
    return {
      source_name: 'BBC Politics',
      source_link: rssUrl,
      source_origin: 'United Kingdom',
      source_tags: ['politics', 'government', 'elections', 'policy'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchBBCPoliticsNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchBBCPoliticsNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'bbci.co.uk', 'Politics');
