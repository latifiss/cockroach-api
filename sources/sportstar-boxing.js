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

const fetchSportstarBoxing = async () => {
  const rssUrl = 'https://sportstar.thehindu.com/boxing/feeder/default.rss';
  const websiteName = 'sportstar-boxing';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1140, // New ID for Sportstar Boxing
      source_name: 'Sportstar Boxing',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: [
        'boxing',
        'sportstar',
        'the hindu',
        'boxing news',
        'indian boxing',
        'professional boxing',
        'olympic boxing',
        'world boxing',
        'mary kom',
        'lovlina borgohain',
        'nikhat zareen',
        'amit panghal',
        'canelo alvarez',
        'tyson fury',
        'oleksandr usyk',
        'anthony joshua',
        'wbc',
        'wba',
        'wbo',
        'ibf',
        'heavyweight boxing',
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
    console.error('Error fetching Sportstar Boxing RSS feed:', error);
    return {
      source_name: 'Sportstar Boxing',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: ['boxing', 'indian boxing', 'sportstar'],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractSportstarImage(item) {
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
  console.log('Fetching Sportstar Boxing news...');
  const response = await fetchSportstarBoxing();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log('   https://sportstar.thehindu.com/boxing/feeder/default.rss');
    console.log('2. Add a User-Agent header to parser options:');
    console.log(
      '   headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSBot/1.0)" }',
    );
    console.log('3. Try alternative Sportstar RSS URLs for boxing:');
    console.log('   - https://sportstar.thehindu.com/rss/?section=boxing');
    console.log('   - https://sportstar.thehindu.com/boxing/feeder/feed.rss');
    console.log('   - https://sportstar.thehindu.com/boxing.rss');
    console.log('4. Consider alternative boxing RSS sources:');
    console.log('   - ESPN Boxing: https://www.espn.com/espn/rss/boxing/news');
    console.log('   - Sky Sports Boxing: https://www.skysports.com/rss/12056');
    console.log('   - Boxing News 24: https://www.boxingnews24.com/feed');
    console.log(
      '   - Bad Left Hook (SB Nation): https://www.badlefthook.com/rss',
    );
    console.log(
      '   - BBC Boxing: http://feeds.bbci.co.uk/sport/boxing/rss.xml',
    );
    console.log('   - Ring Magazine: https://www.ringtv.com/feed');
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

module.exports = { fetchSportstarBoxing };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
