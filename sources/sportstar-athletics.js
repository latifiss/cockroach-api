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

const fetchSportstarAthletics = async () => {
  const rssUrl = 'https://sportstar.thehindu.com/athletics/feeder/default.rss';
  const websiteName = 'sportstar-athletics';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1141, // New ID for Sportstar Athletics
      source_name: 'Sportstar Athletics',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: [
        'athletics',
        'track and field',
        'sportstar',
        'the hindu',
        'athletics news',
        'indian athletics',
        'neeraj chopra',
        'avinasl sable',
        'hima das',
        'dutee chand',
        'murali sreeshankar',
        'world athletics championships',
        'olympic athletics',
        'diamond league',
        'sprinting',
        'long jump',
        'javelin throw',
        'marathon',
        'road racing',
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
    console.error('Error fetching Sportstar Athletics RSS feed:', error);
    return {
      source_name: 'Sportstar Athletics',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: ['athletics', 'track and field', 'sportstar'],
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
  console.log('Fetching Sportstar Athletics news...');
  const response = await fetchSportstarAthletics();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log(
      '   https://sportstar.thehindu.com/athletics/feeder/default.rss',
    );
    console.log('2. Add a User-Agent header to parser options:');
    console.log(
      '   headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSBot/1.0)" }',
    );
    console.log('3. Try alternative Sportstar RSS URLs for athletics:');
    console.log('   - https://sportstar.thehindu.com/rss/?section=athletics');
    console.log(
      '   - https://sportstar.thehindu.com/athletics/feeder/feed.rss',
    );
    console.log('   - https://sportstar.thehindu.com/athletics.rss');
    console.log('4. Consider alternative athletics RSS sources:');
    console.log('   - World Athletics: https://worldathletics.org/rss/news');
    console.log('   - Athletics Weekly: https://athleticsweekly.com/feed');
    console.log(
      '   - BBC Athletics: http://feeds.bbci.co.uk/sport/athletics/rss.xml',
    );
    console.log("   - Runner's World: https://www.runnersworld.com/rss");
    console.log('   - LetsRun.com: https://www.letsrun.com/feed');
    console.log(
      '   - ESPN Athletics: https://www.espn.com/espn/rss/athletics/news',
    );
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

module.exports = { fetchSportstarAthletics };
