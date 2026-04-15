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

const fetchYahooTennisNews = async () => {
  const rssUrl = 'https://sports.yahoo.com/ten/rss/';
  const websiteName = 'yahoosports';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1090,
      source_name: 'Yahoo Sports Tennis',
      source_link: 'https://sports.yahoo.com/ten/',
      source_origin: 'USA',
      source_tags: [
        'tennis',
        'atp',
        'wta',
        'grand slam',
        'wimbledon',
        'us open',
        'australian open',
        'french open',
        'tennis news',
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
    console.error('Error fetching Yahoo Sports Tennis RSS feed:', error);
    return {
      source_name: 'Yahoo Sports Tennis',
      source_link: 'https://sports.yahoo.com/ten/',
      source_origin: 'USA',
      source_tags: [
        'tennis',
        'atp',
        'wta',
        'grand slam',
        'wimbledon',
        'us open',
        'australian open',
        'french open',
        'tennis news',
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
  console.log('Fetching Yahoo Sports Tennis news...');
  const response = await fetchYahooTennisNews();

  if (response.articles.length === 0) {
    console.log('\n⚠️ No articles fetched. The RSS feed may be unavailable.');
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://sports.yahoo.com/ten/rss/ in your browser',
    );
    console.log('2. Check if the feed requires additional headers');
    console.log('3. The feed might have moved to a different URL');
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

module.exports = { fetchYahooTennisNews };
