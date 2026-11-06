const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchESPNNews = async () => {
  const rssUrl = 'https://www.espn.com/espn/rss/news';
  const websiteName = 'espn-news';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1103,
      source_name: 'ESPN',
      source_link: 'https://www.espn.com',
      source_origin: 'USA',
      source_tags: [
        'sports',
        'nfl',
        'nba',
        'mlb',
        'nhl',
        'soccer',
        'tennis',
        'golf',
        'college sports',
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
        image_url: extractESPNImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching ESPN News RSS feed:', error);
    return {
      source_name: 'ESPN News',
      source_link: 'https://www.espn.com',
      source_origin: 'USA',
      source_tags: [
        'sports',
        'nfl',
        'nba',
        'mlb',
        'nhl',
        'soccer',
        'tennis',
        'golf',
        'college sports',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractESPNImage(item) {
  // ESPN often uses media:thumbnail
  if (item.mediaThumbnail?.$.url) {
    return item.mediaThumbnail.$.url;
  }
  // Check media:content
  if (item.mediaContent?.[0]?.$.url) {
    return item.mediaContent[0].$.url;
  }
  // Check enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  // Check content encoded
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  // Check description
  if (item.description) {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  return '';
}

const main = async () => {
  const response = await fetchESPNNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchESPNNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'espn.com', 'Sports');
