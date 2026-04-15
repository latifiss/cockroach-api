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

const fetchYahooMMANews = async () => {
  const rssUrl = 'https://sports.yahoo.com/mma/rss/';
  const websiteName = 'yahoosports';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1097,
      source_name: 'Yahoo Sports MMA',
      source_link: 'https://sports.yahoo.com/mma/',
      source_origin: 'USA',
      source_tags: [
        'mma',
        'mixed martial arts',
        'ufc',
        'fighting',
        'combat sports',
        'bellator',
        'conor mcgregor',
        'jon jones',
        'mma news',
        'ufc news',
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
    console.error('Error fetching Yahoo Sports MMA RSS feed:', error);
    return {
      source_name: 'Yahoo Sports MMA',
      source_link: 'https://sports.yahoo.com/mma/',
      source_origin: 'USA',
      source_tags: [
        'mma',
        'mixed martial arts',
        'ufc',
        'fighting',
        'combat sports',
        'bellator',
        'conor mcgregor',
        'jon jones',
        'mma news',
        'ufc news',
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
  console.log('Fetching Yahoo Sports MMA news...');
  const response = await fetchYahooMMANews();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://sports.yahoo.com/mma/rss/ in your browser',
    );
    console.log(
      '2. Yahoo blocks automated requests - add User-Agent headers to bypass',
    );
    console.log('3. Try alternative Yahoo Sports MMA feeds:');
    console.log('   - https://sports.yahoo.com/mma/news/rss/');
    console.log('   - https://sports.yahoo.com/mma/rumors/rss/');
    console.log('4. Consider alternative MMA RSS sources:');
    console.log('   - ESPN MMA: https://www.espn.com/espn/rss/mma/news');
    console.log(
      '   - MMA Fighting (SB Nation): https://www.mmafighting.com/rss',
    );
    console.log('   - MMA Junkie: https://mmajunkie.usatoday.com/feed');
    console.log(
      '   - Bleacher Report MMA: https://feeds.bleacherreport.com/mma',
    );
    console.log('   - Bloody Elbow: https://www.bloodyelbow.com/rss');
    console.log('   - MMA Weekly: https://www.mmaweekly.com/feed');
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

module.exports = { fetchYahooMMANews };
