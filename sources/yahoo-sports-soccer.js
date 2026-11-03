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

const fetchYahooSoccerNews = async () => {
  const rssUrl = 'https://sports.yahoo.com/soccer/rss/';
  const websiteName = 'yahoosports';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1095,
      source_name: 'Yahoo Sports Soccer',
      source_link: 'https://sports.yahoo.com/soccer/',
      source_origin: 'USA',
      source_tags: [
        'soccer',
        'football',
        'premier league',
        'la liga',
        'bundesliga',
        'serie a',
        'ligue 1',
        'mls',
        'champions league',
        'world cup',
        'sports news',
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
        image_url: extractYahooImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Yahoo Sports Soccer RSS feed:', error);
    return {
      source_name: 'Yahoo Sports Soccer',
      source_link: 'https://sports.yahoo.com/soccer/',
      source_origin: 'USA',
      source_tags: [
        'soccer',
        'football',
        'premier league',
        'la liga',
        'bundesliga',
        'serie a',
        'ligue 1',
        'mls',
        'champions league',
        'world cup',
        'sports news',
      ],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractYahooImage(item) {
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
  console.log('Fetching Yahoo Sports Soccer news...');
  const response = await fetchYahooSoccerNews();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://sports.yahoo.com/soccer/rss/ in your browser',
    );
    console.log(
      '2. Yahoo blocks automated requests - add User-Agent headers to bypass',
    );
    console.log('3. Try alternative Yahoo Sports Soccer feeds:');
    console.log('   - https://sports.yahoo.com/soccer/news/rss/');
    console.log('   - https://sports.yahoo.com/soccer/rumors/rss/');
    console.log('4. Consider alternative soccer RSS sources:');
    console.log('   - ESPN FC: https://www.espn.com/espn/rss/football/news');
    console.log(
      '   - BBC Sport Football: http://feeds.bbci.co.uk/sport/football/rss.xml',
    );
    console.log(
      '   - Sky Sports Football: https://www.skysports.com/rss/12040',
    );
    console.log(
      '   - The Guardian Football: https://www.theguardian.com/football/rss',
    );
    console.log(
      '   - Bleacher Report Soccer: https://feeds.bleacherreport.com/soccer',
    );
    console.log('   - Goal.com: https://www.goal.com/feeds/news');
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

module.exports = { fetchYahooSoccerNews };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
