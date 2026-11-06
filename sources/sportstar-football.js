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

const fetchSportstarFootball = async () => {
  const rssUrl = 'https://sportstar.thehindu.com/football/feeder/default.rss';
  const websiteName = 'sportstar-football';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1136, // New ID for Sportstar Football
      source_name: 'Sportstar Football',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: [
        'football',
        'soccer',
        'indian football',
        'sportstar',
        'the hindu',
        'football news',
        'isl',
        'indian super league',
        'premier league',
        'la liga',
        'uefa champions league',
        'world cup',
        'european football',
        'transfer news',
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
        image_url: extractSportstarImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Sportstar Football RSS feed:', error);
    return {
      source_name: 'Sportstar Football',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: ['football', 'soccer', 'indian football', 'sportstar'],
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
  console.log('Fetching Sportstar Football news...');
  const response = await fetchSportstarFootball();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log(
      '   https://sportstar.thehindu.com/football/feeder/default.rss',
    );
    console.log(
      '2. The feed might require a User-Agent header. Add to parser:',
    );
    console.log(
      '   headers: { "User-Agent": "Mozilla/5.0 (compatible; YourBot/1.0)" }',
    );
    console.log('3. Try alternative Sportstar RSS URLs:');
    console.log('   - https://sportstar.thehindu.com/rss/?section=football');
    console.log('   - https://sportstar.thehindu.com/football/feeder/feed.rss');
    console.log('4. Consider alternative football RSS sources:');
    console.log(
      '   - BBC Football: http://feeds.bbci.co.uk/sport/football/rss.xml',
    );
    console.log(
      '   - Sky Sports Football: https://www.skysports.com/rss/12040',
    );
    console.log('   - ESPN FC: https://www.espn.com/espn/rss/football/news');
    console.log('   - Goal.com: https://www.goal.com/rss/news/en');
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

module.exports = { fetchSportstarFootball };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
