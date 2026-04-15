const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
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

const fetchFrance24Business = async () => {
  const rssUrl = 'https://www.france24.com/en/business/rss';
  const websiteName = 'france24business';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1016,
      source_name: 'France 24',
      source_link: rssUrl,
      source_origin: 'France',
      source_tags: ['business', 'economy', 'finance', 'markets'],
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
        image_url:
          item.mediaContent?.[0]?.$.url ||
          item.mediaThumbnail?.[0]?.$.url ||
          '',
        description:
          item.content || item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error('Error fetching France 24 Business RSS feed:', error);
    return {
      source_name: 'France 24',
      source_link: rssUrl,
      source_origin: 'France',
      source_tags: ['business', 'economy', 'finance', 'markets'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchFrance24Business();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchFrance24Business };
