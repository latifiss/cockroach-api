const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchDWWorldNews = async () => {
  const rssUrl = 'https://rss.dw.com/rdf/rss-en-world';
  const websiteName = 'dw';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1017,
      source_name: 'DW',
      source_link: rssUrl,
      source_origin: 'Germany',
      source_tags: ['world', 'international', 'news'],
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
        creator: item.creator || [],
        image_url: item.mediaThumbnail?.[0]?.$.url || '',
        description:
          item.content || item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error('Error fetching DW World News RSS feed:', error);
    return {
      source_name: 'DW',
      source_link: rssUrl,
      source_origin: 'Germany',
      source_tags: ['world', 'international', 'news'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchDWWorldNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchDWWorldNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'dw.com', 'World');
