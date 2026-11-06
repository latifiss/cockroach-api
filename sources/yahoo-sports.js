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

const fetchYahooSportsNews = async () => {
  const rssUrl = 'https://sports.yahoo.com/top/rss.xml';
  const websiteName = 'yahoo-sports';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1013,
      source_name: 'Yahoo',
      source_link: 'https://sports.yahoo.com',
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
        'mma',
        'boxing',
        'olympics',
      ],
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
        image_url: extractYahooSportsImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Yahoo Sports RSS feed:', error);
    return {
      source_name: 'Yahoo Sports',
      source_link: 'https://sports.yahoo.com',
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
        'mma',
        'boxing',
        'olympics',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractYahooSportsImage(item) {
  if (item.mediaThumbnail?.$.url) {
    return item.mediaThumbnail.$.url;
  }
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
  const response = await fetchYahooSportsNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchYahooSportsNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'yahoo.com', 'Sports');
