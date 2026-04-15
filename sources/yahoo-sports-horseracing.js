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

const fetchYahooHorseRacingNews = async () => {
  const rssUrl = 'https://sports.yahoo.com/horse-racing/rss/';
  const websiteName = 'yahoosports';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1115,
      source_name: 'Yahoo Sports Horse Racing',
      source_link: 'https://sports.yahoo.com/horse-racing/',
      source_origin: 'USA',
      source_tags: [
        'horse racing',
        'thoroughbred racing',
        'kentucky derby',
        'preakness stakes',
        'belmont stakes',
        'triple crown',
        'breeders cup',
        'horse racing news',
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
    console.error('Error fetching Yahoo Sports Horse Racing RSS feed:', error);
    return {
      source_name: 'Yahoo Sports Horse Racing',
      source_link: 'https://sports.yahoo.com/horse-racing/',
      source_origin: 'USA',
      source_tags: [
        'horse racing',
        'thoroughbred racing',
        'kentucky derby',
        'preakness stakes',
        'belmont stakes',
        'triple crown',
        'breeders cup',
        'horse racing news',
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
  console.log('Fetching Yahoo Sports Horse Racing news...');
  const response = await fetchYahooHorseRacingNews();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://sports.yahoo.com/horse-racing/rss/ in your browser',
    );
    console.log(
      '2. Yahoo blocks automated requests - add User-Agent headers to bypass',
    );
    console.log('3. Try alternative Yahoo Sports Horse Racing feeds:');
    console.log('   - https://sports.yahoo.com/horse-racing/news/rss/');
    console.log('4. Consider alternative horse racing RSS sources:');
    console.log(
      '   - ESPN Horse Racing: https://www.espn.com/espn/rss/horse-racing/news',
    );
    console.log('   - BloodHorse: https://www.bloodhorse.com/rss');
    console.log(
      '   - Horse Racing Nation: https://www.horseracingnation.com/feed',
    );
    console.log('   - Paulick Report: https://paulickreport.com/feed/');
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

module.exports = { fetchYahooHorseRacingNews };
