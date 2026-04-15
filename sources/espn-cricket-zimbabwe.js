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

const fetchESPNCricketZimbabwe = async () => {
  const rssUrl = 'https://www.espncricinfo.com/rss/content/story/feeds/9.xml';
  const websiteName = 'espncricinfo';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1135,
      source_name: 'ESPNcricinfo Zimbabwe',
      source_link: 'https://www.espncricinfo.com',
      source_origin: 'Zimbabwe',
      source_tags: [
        'cricket',
        'zimbabwe cricket',
        'espncricinfo',
        'cricket news',
        'zimbabwe national cricket team',
        'test cricket',
        'odi',
        't20',
        'sikandar raza',
        'craig ervine',
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
    console.error('Error fetching ESPNcricinfo Zimbabwe RSS feed:', error);
    return {
      source_name: 'ESPNcricinfo Zimbabwe',
      source_link: 'https://www.espncricinfo.com',
      source_origin: 'Zimbabwe',
      source_tags: [
        'cricket',
        'zimbabwe cricket',
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
  console.log('Fetching ESPNcricinfo Zimbabwe news...');
  const response = await fetchESPNCricketZimbabwe();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://www.espncricinfo.com/rss/content/story/feeds/9.xml in your browser',
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
    console.log(
      '   - Other country feeds: 2.xml (Australia), 5.xml (England), 6.xml (India), 7.xml (New Zealand), 8.xml (Pakistan), 9.xml (South Africa/Zimbabwe - current), 10.xml (Sri Lanka), 11.xml (West Indies), 12.xml (Zimbabwe), 25.xml (Bangladesh)',
    );
    console.log(
      '   - Note: Feed 9 is typically South Africa, try feed 12 for Zimbabwe',
    );
    console.log('4. Consider alternative cricket RSS sources:');
    console.log(
      '   - ZC (Zimbabwe Cricket): https://www.zimbabwecricket.org/rss',
    );
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

module.exports = { fetchESPNCricketZimbabwe };
