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

const fetchESPNNBANews = async () => {
  const rssUrl = 'https://www.espn.com/espn/rss/nba/news';
  const websiteName = 'espn-nba';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1103,
      source_name: 'ESPN',
      source_link: 'https://www.espn.com/nba',
      source_origin: 'USA',
      source_tags: [
        'nba',
        'basketball',
        'basketball',
        'nba playoffs',
        'nba finals',
        'nba draft',
        'nba all-star',
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
        image_url: extractESPNNBAImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching ESPN NBA RSS feed:', error);
    return {
      source_name: 'ESPN NBA',
      source_link: 'https://www.espn.com/nba',
      source_origin: 'USA',
      source_tags: [
        'nba',
        'basketball',
        'nba playoffs',
        'nba finals',
        'nba draft',
        'nba all-star',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractESPNNBAImage(item) {
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
  const response = await fetchESPNNBANews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchESPNNBANews };
