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

const fetchFoxSportsSoccerNews = async () => {
  const rssUrl =
    'https://api.foxsports.com/v2/content/optimized-rss?partnerKey=MB0Wehpmuj2lUhuRhQaafhBjAJqaPU244mlTDK1i&size=30&tags=fs/soccer,soccer/epl/league/1,soccer/mls/league/5,soccer/ucl/league/7,soccer/europa/league/8,soccer/wc/league/12,soccer/euro/league/13,soccer/wwc/league/14,soccer/nwsl/league/20,soccer/cwc/league/26,soccer/gold_cup/league/32,soccer/unl/league/67';
  const websiteName = 'foxsports';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1108,
      source_name: 'Fox Sports Soccer',
      source_link: 'https://www.foxsports.com/soccer',
      source_origin: 'USA',
      source_tags: [
        'soccer',
        'football',
        'premier league',
        'mls',
        'champions league',
        'europa league',
        'world cup',
        'euro',
        'wwc',
        'nwsl',
        'gold cup',
        'nations league',
        'fox sports',
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
        image_url: extractFoxSportsImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Fox Sports Soccer RSS feed:', error);
    return {
      source_name: 'Fox Sports Soccer',
      source_link: 'https://www.foxsports.com/soccer',
      source_origin: 'USA',
      source_tags: [
        'soccer',
        'football',
        'premier league',
        'mls',
        'champions league',
        'europa league',
        'world cup',
        'euro',
        'wwc',
        'nwsl',
        'gold cup',
        'nations league',
        'fox sports',
      ],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractFoxSportsImage(item) {
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
  console.log('Fetching Fox Sports Soccer news...');
  const response = await fetchFoxSportsSoccerNews();

  if (response.articles.length === 0) {
    console.log('\n⚠️ No articles fetched. The RSS feed may be unavailable.');
    console.log('Suggestions:');
    console.log('1. The partner key may have expired or be invalid');
    console.log('2. Try accessing the URL in your browser to see if it works');
    console.log(
      '3. Fox Sports may require additional headers or authentication',
    );
    console.log('4. This feed combines multiple soccer competitions:');
    console.log('   - Premier League (EPL)');
    console.log('   - MLS');
    console.log('   - UEFA Champions League (UCL)');
    console.log('   - UEFA Europa League');
    console.log('   - World Cup (WC)');
    console.log('   - UEFA Euro');
    console.log("   - Women's World Cup (WWC)");
    console.log('   - NWSL');
    console.log('   - Club World Cup (CWC)');
    console.log('   - Gold Cup');
    console.log('   - UEFA Nations League (UNL)');
    console.log('5. Alternative URLs to try:');
    console.log('   - https://www.foxsports.com/rss/soccer');
    console.log('   - https://www.foxsports.com/feeds/soccer');
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

module.exports = { fetchFoxSportsSoccerNews };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
