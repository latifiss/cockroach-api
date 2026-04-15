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

const fetchESPNSoccerNews = async () => {
  const rssUrl = 'https://www.espn.com/espn/rss/soccer/news';
  const websiteName = 'espn-soccer';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1103,
      source_name: 'ESPN',
      source_link: 'https://www.espn.com/soccer',
      source_origin: 'USA',
      source_tags: [
        'soccer',
        'football',
        'premier league',
        'la liga',
        'bundesliga',
        'serie a',
        'ligue 1',
        'mls',
        'champions league',
        'europa league',
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
        image_url: extractESPNSoccerImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching ESPN Soccer RSS feed:', error);
    return {
      source_name: 'ESPN Soccer',
      source_link: 'https://www.espn.com/soccer',
      source_origin: 'USA',
      source_tags: [
        'soccer',
        'football',
        'premier league',
        'la liga',
        'bundesliga',
        'serie a',
        'ligue 1',
        'mls',
        'champions league',
        'europa league',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractESPNSoccerImage(item) {
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
  const response = await fetchESPNSoccerNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchESPNSoccerNews };
