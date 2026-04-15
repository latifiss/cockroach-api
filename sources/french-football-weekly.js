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

const fetchFrenchFootballWeeklyNews = async () => {
  const rssUrl = 'https://frenchfootballweekly.com/feed/';
  const websiteName = 'frenchfootballweekly';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1075,
      source_name: 'French Football Weekly',
      source_link: 'https://frenchfootballweekly.com',
      source_origin: 'France',
      source_tags: [
        'ligue 1',
        'french football',
        'psg',
        'olympique marseille',
        'soccer',
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
        image_url: extractFrenchFootballWeeklyImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching French Football Weekly RSS feed:', error);
    return {
      source_name: 'French Football Weekly',
      source_link: 'https://frenchfootballweekly.com',
      source_origin: 'France',
      source_tags: [
        'ligue 1',
        'french football',
        'psg',
        'olympique marseille',
        'soccer',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractFrenchFootballWeeklyImage(item) {
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
  const response = await fetchFrenchFootballWeeklyNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchFrenchFootballWeeklyNews };
