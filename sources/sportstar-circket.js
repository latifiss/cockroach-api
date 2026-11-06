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

const fetchSportstarCricket = async () => {
  const rssUrl = 'https://sportstar.thehindu.com/cricket/feeder/default.rss';
  const websiteName = 'sportstar';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1135, // New ID for Sportstar
      source_name: 'Sportstar Cricket',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: [
        'cricket',
        'indian cricket',
        'sportstar',
        'the hindu',
        'cricket news',
        'ipl',
        'test cricket',
        'odi',
        't20',
        'bcci',
        'indian national cricket team',
        'domestic cricket',
      ],
      source_credibility: 4, // Reputable but adjust as needed
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
        image_url: extractSportstarImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Sportstar Cricket RSS feed:', error);
    return {
      source_name: 'Sportstar Cricket',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: ['cricket', 'indian cricket', 'sportstar'],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractSportstarImage(item) {
  // Check for media:content first
  if (item.mediaContent?.[0]?.$.url) {
    return item.mediaContent[0].$.url;
  }
  // Check enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  // Extract from content:encoded
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  // Extract from description
  if (item.description) {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  return '';
}

const main = async () => {
  console.log('Fetching Sportstar Cricket news...');
  const response = await fetchSportstarCricket();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log('   https://sportstar.thehindu.com/cricket/feeder/default.rss');
    console.log(
      '2. Sportstar may block automated requests – add a User-Agent header:',
    );
    console.log(
      '   Example: add `headers: { "User-Agent": "Mozilla/5.0" }` to parser options',
    );
    console.log('3. The feed might require a different URL. Try:');
    console.log('   - https://sportstar.thehindu.com/cricket/feeder/feed.rss');
    console.log('   - https://sportstar.thehindu.com/rss/?section=cricket');
    console.log('4. Consider alternative cricket RSS sources:');
    console.log(
      '   - ESPNcricinfo: https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
    );
    console.log('   - Cricbuzz: https://www.cricbuzz.com/rss/cricket-news.xml');
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

module.exports = { fetchSportstarCricket };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
