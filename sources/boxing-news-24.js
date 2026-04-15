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

const fetchBoxingNews24 = async () => {
  const rssUrl = 'https://www.boxingnews24.com/feed/';
  const websiteName = 'boxingnews24';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1116,
      source_name: 'Boxing News 24',
      source_link: 'https://www.boxingnews24.com',
      source_origin: 'USA',
      source_tags: [
        'boxing',
        'combat sports',
        'heavyweight',
        'boxing news',
        'fight news',
        'mike tyson',
        'canelo alvarez',
        'tyson fury',
        'oleksandr usyk',
      ],
      source_credibility: 3,
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
        image_url: extractBoxingNews24Image(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Boxing News 24 RSS feed:', error);
    return {
      source_name: 'Boxing News 24',
      source_link: 'https://www.boxingnews24.com',
      source_origin: 'USA',
      source_tags: [
        'boxing',
        'combat sports',
        'heavyweight',
        'boxing news',
        'fight news',
      ],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractBoxingNews24Image(item) {
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
  console.log('Fetching Boxing News 24 news...');
  const response = await fetchBoxingNews24();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed is returning a 403 Forbidden error.',
    );
    console.log('This means Boxing News 24 is blocking automated requests.');
    console.log('\nSuggestions:');
    console.log(
      '1. Try accessing https://www.boxingnews24.com/feed/ in your browser',
    );
    console.log(
      '2. Add proper headers to mimic a real browser (User-Agent, Accept, etc.)',
    );
    console.log(
      '3. The site may require cookies or have Cloudflare protection',
    );
    console.log('4. Consider alternative boxing RSS sources:');
    console.log('   - ESPN Boxing: https://www.espn.com/espn/rss/boxing/news');
    console.log(
      '   - Bad Left Hook (SB Nation): https://www.badlefthook.com/rss',
    );
    console.log('   - Fight Sports: https://www.fightsports.com/feed/');
    console.log('   - Boxing Scene: https://www.boxingscene.com/feed/');
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

module.exports = { fetchBoxingNews24 };
