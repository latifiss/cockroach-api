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

const fetchBleacherReportNews = async () => {
  const rssUrl = 'https://feeds.bleacherreport.com/articles';
  const websiteName = 'bleacherreport';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1085,
      source_name: 'Bleacher Report',
      source_link: 'https://bleacherreport.com',
      source_origin: 'USA',
      source_tags: [
        'sports news',
        'nba',
        'nfl',
        'mlb',
        'nhl',
        'football',
        'basketball',
        'baseball',
        'hockey',
        'sports analysis',
      ],
      source_credibility: 4,
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
        image_url: extractBleacherReportImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Bleacher Report RSS feed:', error);
    return {
      source_name: 'Bleacher Report',
      source_link: 'https://bleacherreport.com',
      source_origin: 'USA',
      source_tags: [
        'sports news',
        'nba',
        'nfl',
        'mlb',
        'nhl',
        'football',
        'basketball',
        'baseball',
        'hockey',
        'sports analysis',
      ],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractBleacherReportImage(item) {
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
  console.log('Fetching Bleacher Report news...');
  const response = await fetchBleacherReportNews();

  if (response.articles.length === 0) {
    console.log('\n⚠️ No articles fetched. The RSS feed may be unavailable.');
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://feeds.bleacherreport.com/articles in your browser',
    );
    console.log(
      '2. Check if the feed requires special headers or authentication',
    );
    console.log('3. The feed might have moved to a different URL');
    console.log(`\nError details: ${response.error || 'None'}`);
  } else {
    console.log(
      `\n✅ Successfully fetched ${response.articles.length} articles`,
    );
  }

  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchBleacherReportNews };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
