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

const fetchSportsMoleBarcelonaNews = async () => {
  const rssUrl = 'https://www.sportsmole.co.uk/football/barcelona.xml';
  const websiteName = 'sportsmole-barcelona';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1098,
      source_name: 'Sports Mole - Barcelona',
      source_link: 'https://www.sportsmole.co.uk/football/barcelona',
      source_origin: 'UK',
      source_tags: [
        'barcelona',
        'la liga',
        'champions league',
        'spanish football',
        'sports',
        'premier league',
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
        image_url: extractSportsMoleImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Sports Mole Barcelona RSS feed:', error);
    return {
      source_name: 'Sports Mole - Barcelona',
      source_link: 'https://www.sportsmole.co.uk/football/barcelona',
      source_origin: 'UK',
      source_tags: [
        'barcelona',
        'la liga',
        'champions league',
        'spanish football',
        'sports',
        'premier league',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractSportsMoleImage(item) {
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
  const response = await fetchSportsMoleBarcelonaNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchSportsMoleBarcelonaNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'sportsmole.co.uk', 'Sports');
