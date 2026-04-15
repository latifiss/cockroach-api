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

const fetchProBoxingFans = async () => {
  const rssUrl = 'https://www.proboxing-fans.com/feed/';
  const websiteName = 'proboxingfans';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1120,
      source_name: 'Pro Boxing Fans',
      source_link: 'https://www.proboxing-fans.com',
      source_origin: 'USA',
      source_tags: [
        'boxing',
        'combat sports',
        'boxing news',
        'fight news',
        'boxing fans',
        'boxing results',
        'boxing schedule',
        'boxing analysis',
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
        image_url: extractProBoxingFansImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Pro Boxing Fans RSS feed:', error);
    return {
      source_name: 'Pro Boxing Fans',
      source_link: 'https://www.proboxing-fans.com',
      source_origin: 'USA',
      source_tags: ['boxing', 'combat sports', 'boxing news', 'fight news'],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function extractProBoxingFansImage(item) {
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
  console.log('Fetching Pro Boxing Fans news...');
  const response = await fetchProBoxingFans();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The RSS feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log(
      '1. Try accessing https://www.proboxing-fans.com/feed/ in your browser',
    );
    console.log(
      '2. The site may block automated requests - add User-Agent headers',
    );
    console.log('3. Consider alternative boxing RSS sources:');
    console.log('   - ESPN Boxing: https://www.espn.com/espn/rss/boxing/news');
    console.log('   - Bad Left Hook: https://www.badlefthook.com/rss');
    console.log('   - Boxing Scene: https://www.boxingscene.com/feed/');
    console.log('   - Fight Sports: https://www.fightsports.com/feed/');
    console.log(
      '   - World Boxing News: https://www.worldboxingnews.net/feed/',
    );
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

module.exports = { fetchProBoxingFans };
