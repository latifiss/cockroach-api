const Parser = require('rss-parser');
const crypto = require('crypto');
const axios = require('axios'); // For JSON feeds

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

const fetchFoxSportsBasketball = async () => {
  const feedUrl = 'https://www.foxsports.com.au/content-feeds/basketball/';
  const websiteName = 'foxsports-au-basketball';

  try {
    // Try as RSS first
    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (rssError) {
      // If RSS fails, try as JSON
      console.log('RSS parsing failed, trying JSON...');
      const response = await axios.get(feedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept:
            'application/json, application/rss+xml, application/xml, text/xml',
        },
        timeout: 10000,
      });

      // Handle JSON response (structure may vary)
      const jsonData = response.data;
      feed = convertJsonToFeed(jsonData);
    }

    return {
      source_id: 1142, // New ID for Fox Sports Australia Basketball
      source_name: 'Fox Sports Australia Basketball',
      source_link: 'https://www.foxsports.com.au',
      source_origin: 'Australia',
      source_tags: [
        'basketball',
        'nba',
        'australian basketball',
        'fox sports australia',
        'nbl',
        'australian nbl',
        'nba australia',
        'ben simmons',
        'josh giddey',
        'patty mills',
        'joe ingles',
        'matisse thybulle',
        'dante exum',
        'boomers',
        'australian boomers',
        'wnba',
        'nba draft',
        'nba playoffs',
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
    console.error(
      'Error fetching Fox Sports Australia Basketball feed:',
      error,
    );
    return {
      source_name: 'Fox Sports Australia Basketball',
      source_link: 'https://www.foxsports.com.au',
      source_origin: 'Australia',
      source_tags: ['basketball', 'nba', 'australian basketball', 'fox sports'],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

// Helper function if the endpoint returns JSON instead of RSS
function convertJsonToFeed(jsonData) {
  // This structure will need adjustment based on actual JSON response
  // Common patterns for content feeds:
  if (jsonData.items || jsonData.articles || jsonData.posts) {
    const items = jsonData.items || jsonData.articles || jsonData.posts;
    return {
      items: items.map((item) => ({
        title: item.title || item.headline,
        link: item.link || item.url || item.permalink,
        pubDate: item.pubDate || item.date || item.published,
        isoDate: item.isoDate || item.date,
        description: item.description || item.excerpt,
        contentEncoded: item.content || item.body,
        creator: item.author || item.creator,
        categories: item.categories || item.tags,
      })),
    };
  }

  // If JSON has RSS-like structure
  if (jsonData.rss?.channel?.item) {
    return { items: jsonData.rss.channel.item };
  }

  throw new Error('Unknown JSON feed structure');
}

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
  // Fox Sports might have a custom image field
  if (item.image || item.image_url || item.thumbnail) {
    return item.image || item.image_url || item.thumbnail;
  }
  return '';
}

const main = async () => {
  console.log('Fetching Fox Sports Australia Basketball news...');
  const response = await fetchFoxSportsBasketball();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log('   https://www.foxsports.com.au/content-feeds/basketball/');
    console.log('2. Add proper headers (already included in code):');
    console.log('   - User-Agent: Mozilla/5.0');
    console.log('   - Accept: application/json, application/rss+xml');
    console.log('3. Try alternative Fox Sports Australia feeds:');
    console.log('   - Main feed: https://www.foxsports.com.au/content-feeds/');
    console.log('   - NBL specific: https://www.foxsports.com.au/nbl/feed');
    console.log(
      '   - NBA section: https://www.foxsports.com.au/basketball/nba/feed',
    );
    console.log(
      '4. Consider alternative basketball RSS sources for Australian content:',
    );
    console.log(
      '   - NBL (National Basketball League): https://nbl.com.au/news/feed',
    );
    console.log(
      '   - ESPN Australia NBA: https://www.espn.com.au/espn/rss/nba/news',
    );
    console.log(
      '   - ABC Australia Basketball: https://www.abc.net.au/news/feed/10840/rss.xml',
    );
    console.log('   - The Pick and Roll: https://pickandroll.com.au/feed');
    console.log('   - Basketball Australia: https://australia.basketball/feed');
    console.log('   - ESPN NBL: https://www.espn.com/espn/rss/nbl/news');
    console.log('5. Check if the feed requires authentication or cookies');
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

module.exports = { fetchFoxSportsBasketball };
