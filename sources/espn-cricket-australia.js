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

const fetchESPNCricketAustralia = async () => {
  const rssUrl = 'https://www.espncricinfo.com/rss/content/story/feeds/2.xml';
  const websiteName = 'espncricinfo';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1126,
      source_name: 'ESPNcricinfo Australia',
      source_link: 'https://www.espncricinfo.com',
      source_origin: 'Australia',
      source_tags: [
        'cricket',
        'australian cricket',
        'espncricinfo',
        'cricket news',
        'australia cricket team',
        'big bash league',
        'sheffield shield',
        'test cricket',
        'odi',
        't20',
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
        image_url: extractESPNCricketImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching ESPNcricinfo Australia RSS feed:', error);
    return {
      source_name: 'ESPNcricinfo Australia',
      source_link: 'https://www.espncricinfo.com',
      source_origin: 'Australia',
      source_tags: [
        'cricket',
        'australian cricket',
        'espncricinfo',
        'cricket news',
      ],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractESPNCricketImage(item) {
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
  console.log('Fetching ESPNcricinfo Australia news...');
  const response = await fetchESPNCricketAustralia();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://www.espncricinfo.com/rss/content/story/feeds/2.xml in your browser',
    );
    console.log(
      '2. ESPNcricinfo may block automated requests - add User-Agent headers',
    );
    console.log(
      '3. The feed URL might have changed. Try alternative ESPNcricinfo feeds:',
    );
    console.log(
      '   - Main feed: https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
    );
    console.log(
      '   - News feed: https://www.espncricinfo.com/rss/content/story/feeds/1.xml',
    );
    console.log(
      '   - Features feed: https://www.espncricinfo.com/rss/content/story/feeds/3.xml',
    );
    console.log('4. Consider alternative cricket RSS sources:');
    console.log('   - Cricket Australia: https://www.cricket.com.au/news/feed');
    console.log(
      '   - BBC Cricket: http://feeds.bbci.co.uk/sport/cricket/rss.xml',
    );
    console.log('   - Sky Sports Cricket: https://www.skysports.com/rss/12042');
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

module.exports = { fetchESPNCricketAustralia };
