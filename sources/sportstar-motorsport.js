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

const fetchSportstarMotorsport = async () => {
  const rssUrl = 'https://sportstar.thehindu.com/motorsport/feeder/default.rss';
  const websiteName = 'sportstar-motorsport';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1138, // New ID for Sportstar Motorsport
      source_name: 'Sportstar Motorsport',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: [
        'motorsport',
        'racing',
        'sportstar',
        'the hindu',
        'motorsport news',
        'formula 1',
        'f1',
        'moto gp',
        'formula e',
        'indian motorsport',
        'jehan daruvala',
        'kush maini',
        'force india',
        'red bull racing',
        'mercedes f1',
        'ferrari',
        'lewis hamilton',
        'max verstappen',
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
    console.error('Error fetching Sportstar Motorsport RSS feed:', error);
    return {
      source_name: 'Sportstar Motorsport',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: ['motorsport', 'racing', 'f1', 'sportstar'],
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
  console.log('Fetching Sportstar Motorsport news...');
  const response = await fetchSportstarMotorsport();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log(
      '   https://sportstar.thehindu.com/motorsport/feeder/default.rss',
    );
    console.log('2. Add a User-Agent header to parser options:');
    console.log(
      '   headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSBot/1.0)" }',
    );
    console.log('3. Try alternative Sportstar RSS URLs for motorsport:');
    console.log('   - https://sportstar.thehindu.com/rss/?section=motorsport');
    console.log(
      '   - https://sportstar.thehindu.com/motorsport/feeder/feed.rss',
    );
    console.log('   - https://sportstar.thehindu.com/motorsport.rss');
    console.log('4. Consider alternative motorsport RSS sources:');
    console.log(
      '   - Formula 1: https://www.formula1.com/content/fom-website/en/latest/all.rss',
    );
    console.log('   - MotoGP: https://www.motogp.com/en/rss/news');
    console.log('   - Autosport: https://www.autosport.com/rss/feed/all');
    console.log(
      '   - BBC Motorsport: http://feeds.bbci.co.uk/sport/motorsport/rss.xml',
    );
    console.log('   - Sky Sports F1: https://www.skysports.com/rss/12434');
    console.log('   - ESPN F1: https://www.espn.com/espn/rss/f1/news');
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

module.exports = { fetchSportstarMotorsport };
