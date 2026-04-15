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

const fetchSportstarBasketball = async () => {
  const rssUrl = 'https://sportstar.thehindu.com/basketball/feeder/default.rss';
  const websiteName = 'sportstar-basketball';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1139, // New ID for Sportstar Basketball
      source_name: 'Sportstar Basketball',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: [
        'basketball',
        'sportstar',
        'the hindu',
        'basketball news',
        'nba',
        'indian basketball',
        'wnba',
        'euroleague',
        'lebron james',
        'stephen curry',
        'giannis antetokounmpo',
        'nba draft',
        'nba playoffs',
        'basketball world cup',
        'olympic basketball',
        'princepal singh',
        'amjyot singh',
        'india basketball team',
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
    console.error('Error fetching Sportstar Basketball RSS feed:', error);
    return {
      source_name: 'Sportstar Basketball',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: ['basketball', 'nba', 'sportstar'],
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
  console.log('Fetching Sportstar Basketball news...');
  const response = await fetchSportstarBasketball();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log(
      '   https://sportstar.thehindu.com/basketball/feeder/default.rss',
    );
    console.log('2. Add a User-Agent header to parser options:');
    console.log(
      '   headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSBot/1.0)" }',
    );
    console.log('3. Try alternative Sportstar RSS URLs for basketball:');
    console.log('   - https://sportstar.thehindu.com/rss/?section=basketball');
    console.log(
      '   - https://sportstar.thehindu.com/basketball/feeder/feed.rss',
    );
    console.log('   - https://sportstar.thehindu.com/basketball.rss');
    console.log('4. Consider alternative basketball RSS sources:');
    console.log('   - NBA: https://www.nba.com/news.rss');
    console.log('   - ESPN NBA: https://www.espn.com/espn/rss/nba/news');
    console.log('   - CBS Sports NBA: https://www.cbssports.com/nba/rss');
    console.log(
      '   - Bleacher Report NBA: https://bleacherreport.com/nba/feed',
    );
    console.log(
      '   - BBC Basketball: http://feeds.bbci.co.uk/sport/basketball/rss.xml',
    );
    console.log('   - Sky Sports NBA: https://www.skysports.com/rss/12058');
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

module.exports = { fetchSportstarBasketball };
