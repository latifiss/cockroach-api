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

const fetchNewYorkTimesBusinessNews = async () => {
  const rssUrl = 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml';
  const websiteName = 'newyorktimes';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1009,
      source_name: 'New York Times',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['business'],
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
        image_url: item['media:content']?.[0]?.$?.url || '',
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error('Error fetching New York Times Business RSS feed:', error);
    return {
      source_name: 'New York Times',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['business'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchNewYorkTimesBusinessNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchNewYorkTimesBusinessNews };
