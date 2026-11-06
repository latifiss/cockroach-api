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

const fetchESPNBoxingNews = async () => {
  const rssUrl = 'https://www.espn.com/espn/rss/boxing/news';
  const websiteName = 'espn-boxing';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1103,
      source_name: 'ESPN',
      source_link: 'https://www.espn.com/boxing',
      source_origin: 'USA',
      source_tags: [
        'boxing',
        'sports',
        'ufc',
        'mma',
        'sports',
        'heavyweight',
        'championship',
        'fight night',
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
        image_url: extractESPNBoxingImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching ESPN Boxing RSS feed:', error);
    return {
      source_name: 'ESPN Boxing',
      source_link: 'https://www.espn.com/boxing',
      source_origin: 'USA',
      source_tags: [
        'boxing',
        'sports',
        'ufc',
        'mma',
        'combat sports',
        'heavyweight',
        'championship',
        'fight night',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractESPNBoxingImage(item) {
  // ESPN Boxing often uses media:thumbnail for fight images
  if (item.mediaThumbnail?.$.url) {
    return item.mediaThumbnail.$.url;
  }
  // Check for media:content (higher resolution images)
  if (item.mediaContent?.[0]?.$.url) {
    return item.mediaContent[0].$.url;
  }
  // Check enclosure (common for podcast episodes)
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  // Parse content for embedded images
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  // Fallback to description images
  if (item.description) {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  return '';
}

const main = async () => {
  const response = await fetchESPNBoxingNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchESPNBoxingNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'espn.com', 'Sports');
