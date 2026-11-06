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

const fetchFrance24Earth = async () => {
  const rssUrl = 'https://www.france24.com/en/earth/rss';
  const websiteName = 'france24earth';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1016,
      source_name: 'France 24',
      source_link: rssUrl,
      source_origin: 'France',
      source_tags: [
        'environment',
        'climate',
        'nature',
        'sustainability',
        'ecology',
      ],
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
    console.error('Error fetching France 24 Earth RSS feed:', error);
    return {
      source_name: 'France 24',
      source_link: rssUrl,
      source_origin: 'France',
      source_tags: [
        'environment',
        'climate',
        'nature',
        'sustainability',
        'ecology',
      ],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchFrance24Earth();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchFrance24Earth };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'france24.com', 'Science & Health');
