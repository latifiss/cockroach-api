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

const fetchFoxSportsWNBANews = async () => {
  const rssUrl =
    'https://api.foxsports.com/v2/content/optimized-rss?partnerKey=MB0Wehpmuj2lUhuRhQaafhBjAJqaPU244mlTDK1i&size=30&tags=fs/wnba';
  const websiteName = 'foxsports';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1114,
      source_name: 'Fox Sports WNBA',
      source_link: 'https://www.foxsports.com/wnba',
      source_origin: 'USA',
      source_tags: [
        'wnba',
        'womens basketball',
        'basketball',
        'womens sports',
        'fox sports',
        'wnba news',
        'basketball news',
        'wnba draft',
        'womens professional basketball',
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
    console.error('Error fetching Fox Sports WNBA RSS feed:', error);
    return {
      source_name: 'Fox Sports WNBA',
      source_link: 'https://www.foxsports.com/wnba',
      source_origin: 'USA',
      source_tags: [
        'wnba',
        'womens basketball',
        'basketball',
        'womens sports',
        'fox sports',
        'wnba news',
        'basketball news',
        'wnba draft',
        'womens professional basketball',
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
  console.log('Fetching Fox Sports WNBA news...');
  const response = await fetchFoxSportsWNBANews();

  if (response.articles.length === 0) {
    console.log('\n⚠️ No articles fetched. The RSS feed may be unavailable.');
    console.log('Suggestions:');
    console.log('1. The partner key may have expired or be invalid');
    console.log('2. Try accessing the URL in your browser to see if it works');
    console.log(
      '3. Fox Sports may require additional headers or authentication',
    );
    console.log('4. Alternative URLs to try:');
    console.log('   - https://www.foxsports.com/rss/wnba');
    console.log('   - https://www.foxsports.com/feeds/wnba');
    console.log('   - https://api.foxsports.com/v2/content/rss?tags=fs/wnba');
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

module.exports = { fetchFoxSportsWNBANews };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
