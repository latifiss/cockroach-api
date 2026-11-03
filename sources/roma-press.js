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

const fetchRomaPressNews = async () => {
  const rssUrl = 'https://romapress.net/feed/';
  const websiteName = 'romapress';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1062,
      source_name: 'RomaPress',
      source_link: rssUrl,
      source_origin: 'Italy',
      source_tags: ['roma', 'as roma', 'football', 'soccer', 'serie a'],
      source_credibility: 3,
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
        image_url: extractRomaPressImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching RomaPress RSS feed:', error);
    return {
      source_name: 'RomaPress',
      source_link: rssUrl,
      source_origin: 'Italy',
      source_tags: ['roma', 'as roma', 'football', 'soccer', 'serie a'],
      image: true,
      articles: [],
    };
  }
};

function extractRomaPressImage(item) {
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
  if (item.description) {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  return '';
}

const main = async () => {
  const response = await fetchRomaPressNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchRomaPressNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'romapress.net', 'Sports');
