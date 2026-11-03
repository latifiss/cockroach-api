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

const fetchSkySportsPremierLeagueNews = async () => {
  const rssUrl = 'http://www.skysports.com/rss/0,20514,12040,00.xml';
  const websiteName = 'skysports-premierleague';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1110,
      source_name: 'Sky Sports',
      source_link: 'https://www.skysports.com/premier-league',
      source_origin: 'UK',
      source_tags: [
        'premier league',
        'english football',
        'manchester united',
        'liverpool',
        'arsenal',
        'chelsea',
        'manchester city',
        'tottenham',
        'sports',
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
        image_url: extractSkySportsImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Sky Sports Premier League RSS feed:', error);
    return {
      source_name: 'Sky Sports Premier League',
      source_link: 'https://www.skysports.com/premier-league',
      source_origin: 'UK',
      source_tags: [
        'premier league',
        'english football',
        'manchester united',
        'liverpool',
        'arsenal',
        'chelsea',
        'manchester city',
        'tottenham',
        'sports',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractSkySportsImage(item) {
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
  const response = await fetchSkySportsPremierLeagueNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchSkySportsPremierLeagueNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'skysports.com', 'Sports');
