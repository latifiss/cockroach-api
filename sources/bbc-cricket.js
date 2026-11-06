const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
      ['description', 'description'],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchBBCCricket = async () => {
  const rssUrl = 'http://feeds.bbci.co.uk/sport/cricket/rss.xml';
  const websiteName = 'bbc';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1143,
      source_name: 'BBC Cricket',
      source_link: 'https://www.bbc.com/sport/cricket',
      source_origin: 'UK',
      source_tags: [
        'cricket',
        'bbc cricket',
        'cricket news',
        'england cricket',
        'test cricket',
        'odi',
        't20',
        'county cricket',
        'ashes',
      ],
      source_credibility: 5,
      image: true,
      articles: feed.items.map((item) => ({
        article_id: generateArticleId(
          item.title,
          item.link,
          websiteName,
          item.pubDate,
        ),
        title: item.title,
        link: item.link,
        creator: item.creator || [],
        image_url: extractBBCImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching BBC Cricket RSS feed:', error);
    return {
      source_name: 'BBC Cricket',
      source_link: 'https://www.bbc.com/sport/cricket',
      source_origin: 'UK',
      source_tags: ['cricket', 'bbc cricket', 'cricket news'],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractBBCImage(item) {
  if (item.mediaContent?.[0]?.$.url) return item.mediaContent[0].$.url;
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) return imgMatch[1];
  }
  if (item.description) {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) return imgMatch[1];
  }
  return '';
}

const main = async () => {
  console.log('Fetching BBC Cricket news...');
  const response = await fetchBBCCricket();

  if (response.articles.length === 0) {
    console.log('❌ Failed to fetch articles');
  } else {
    console.log(`✅ Successfully fetched ${response.articles.length} articles`);
    console.log(JSON.stringify(response, null, 2));
  }
};

if (require.main === module) {
  main();
}

module.exports = { fetchBBCCricket };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
