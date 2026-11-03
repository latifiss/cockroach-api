const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchAndroidCentralNews = async () => {
  const rssUrl = 'https://www.androidcentral.com/feed';
  const websiteName = 'androidcentral';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1049,
      source_name: 'Android Central',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: [
        'android',
        'mobile',
        'technology',
        'apps',
        'devices',
        'tech',
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
        creator: item.creator || [],
        image_url: extractAndroidCentralImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Android Central RSS feed:', error);
    return {
      source_name: 'Android Central',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: [
        'android',
        'mobile',
        'google',
        'technology',
        'devices',
        'tech',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractAndroidCentralImage(item) {
  if (item.mediaContent?.[0]?.$.url) {
    return item.mediaContent[0].$.url;
  }
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  return '';
}

const main = async () => {
  const response = await fetchAndroidCentralNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchAndroidCentralNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'androidcentral.com', 'Technology');
