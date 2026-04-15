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

const fetchSportstarGolf = async () => {
  const rssUrl = 'https://sportstar.thehindu.com/golf/feeder/default.rss';
  const websiteName = 'sportstar-golf';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1137, // New ID for Sportstar Golf
      source_name: 'Sportstar Golf',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: [
        'golf',
        'sportstar',
        'the hindu',
        'golf news',
        'pga tour',
        'european tour',
        'lpga',
        'asian tour',
        'indian golf',
        'ankur mittal',
        'shubhankar sharma',
        'anishir madappa',
        'anirban lahiri',
        'major championships',
        'the masters',
        'us open',
        'the open championship',
        'pga championship',
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
    console.error('Error fetching Sportstar Golf RSS feed:', error);
    return {
      source_name: 'Sportstar Golf',
      source_link: 'https://sportstar.thehindu.com',
      source_origin: 'India',
      source_tags: ['golf', 'sportstar', 'the hindu'],
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
  console.log('Fetching Sportstar Golf news...');
  const response = await fetchSportstarGolf();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log('   https://sportstar.thehindu.com/golf/feeder/default.rss');
    console.log('2. Add a User-Agent header to parser options:');
    console.log(
      '   headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSBot/1.0)" }',
    );
    console.log('3. Try alternative Sportstar RSS URLs for golf:');
    console.log('   - https://sportstar.thehindu.com/rss/?section=golf');
    console.log('   - https://sportstar.thehindu.com/golf/feeder/feed.rss');
    console.log('   - https://sportstar.thehindu.com/golf.rss');
    console.log('4. Consider alternative golf RSS sources:');
    console.log(
      '   - PGA Tour: https://www.pgatour.com/rss/feeds/top-stories/',
    );
    console.log('   - European Tour: https://www.europeantour.com/rssnews/');
    console.log('   - LPGA: https://www.lpga.com/rssfeeds/lpga-news');
    console.log('   - Golf Channel: https://www.golfchannel.com/rss-feed');
    console.log('   - BBC Golf: http://feeds.bbci.co.uk/sport/golf/rss.xml');
    console.log('   - Sky Sports Golf: https://www.skysports.com/rss/12198');
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

module.exports = { fetchSportstarGolf };
