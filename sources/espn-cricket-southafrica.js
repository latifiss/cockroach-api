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

const fetchESPNCricketSouthAfrica = async () => {
  const rssUrl = 'https://www.espncricinfo.com/rss/content/story/feeds/3.xml';
  const websiteName = 'espncricinfo';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1132,
      source_name: 'ESPNcricinfo South Africa',
      source_link: 'https://www.espncricinfo.com',
      source_origin: 'South Africa',
      source_tags: [
        'cricket',
        'south africa cricket',
        'espncricinfo',
        'cricket news',
        'proteas',
        'south africa national cricket team',
        'sa20',
        'test cricket',
        'odi',
        't20',
        'kagiso rabada',
        'quinton de kock',
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
    console.error('Error fetching ESPNcricinfo South Africa RSS feed:', error);
    return {
      source_name: 'ESPNcricinfo South Africa',
      source_link: 'https://www.espncricinfo.com',
      source_origin: 'South Africa',
      source_tags: [
        'cricket',
        'south africa cricket',
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
  console.log('Fetching ESPNcricinfo South Africa news...');
  const response = await fetchESPNCricketSouthAfrica();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://www.espncricinfo.com/rss/content/story/feeds/3.xml in your browser',
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
      '   - Features feed: https://www.espncricinfo.com/rss/content/story/feeds/3.xml (current)',
    );
    console.log(
      '   - Other country feeds: 2.xml (Australia), 5.xml (England), 6.xml (India), 7.xml (New Zealand), 8.xml (Pakistan), 9.xml (South Africa), 10.xml (Sri Lanka), 11.xml (West Indies), 12.xml (Zimbabwe), 25.xml (Bangladesh)',
    );
    console.log(
      '   - Note: Feed 3 is for Features, try feed 9 for South Africa',
    );
    console.log('4. Consider alternative cricket RSS sources:');
    console.log('   - CSA (Cricket South Africa): https://cricket.co.za/rss');
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

module.exports = { fetchESPNCricketSouthAfrica };
