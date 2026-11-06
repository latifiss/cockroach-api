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

const fetchWallStreetJournalTechNews = async () => {
  const rssUrl = 'https://feeds.content.dowjones.io/public/rss/RSSWSJD';
  const websiteName = 'wallstreetjournal';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1012,
      source_name: 'Wall Street Journal',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['tech'],
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
        creator: item['dc:creator'] || [],
        image_url: item['media:content']?.[0]?.$?.url || '',
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error('Error fetching Wall Street Journal Tech RSS feed:', error);
    return {
      source_name: 'Wall Street Journal',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['tech'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchWallStreetJournalTechNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchWallStreetJournalTechNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'wsj.com', 'Technology');
