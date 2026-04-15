const Parser = require('rss-parser');
const crypto = require('crypto');
const axios = require('axios');

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

const fetchFoxSportsBoxing = async () => {
  const feedUrl = 'https://www.foxsports.com.au/content-feeds/boxing/';
  const websiteName = 'foxsports-au-boxing';

  try {
    // Try as RSS first
    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (rssError) {
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

      const jsonData = response.data;
      feed = convertJsonToFeed(jsonData);
    }

    return {
      source_id: 1143, // New ID for Fox Sports Australia Boxing
      source_name: 'Fox Sports Australia Boxing',
      source_link: 'https://www.foxsports.com.au',
      source_origin: 'Australia',
      source_tags: [
        'boxing',
        'australian boxing',
        'fox sports australia',
        'boxing news',
        'tim tszyu',
        'george kambosos jr',
        'jeff horn',
        'jai opetaia',
        'justis huni',
        'demsey mckean',
        'liam paro',
        'australian boxers',
        'world boxing',
        'canelo alvarez',
        'tyson fury',
        'oleksandr usyk',
        'anthony joshua',
        'wbc',
        'wba',
        'wbo',
        'ibf',
        'heavyweight boxing',
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
    console.error('Error fetching Fox Sports Australia Boxing feed:', error);
    return {
      source_name: 'Fox Sports Australia Boxing',
      source_link: 'https://www.foxsports.com.au',
      source_origin: 'Australia',
      source_tags: ['boxing', 'australian boxing', 'fox sports'],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function convertJsonToFeed(jsonData) {
  // Handle various JSON feed structures
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
  if (item.image || item.image_url || item.thumbnail) {
    return item.image || item.image_url || item.thumbnail;
  }
  return '';
}

const main = async () => {
  console.log('Fetching Fox Sports Australia Boxing news...');
  const response = await fetchFoxSportsBoxing();

  if (response.articles.length === 0) {
    console.log(
      '\n⚠️ No articles fetched. The feed may be unavailable or blocked.',
    );
    console.log('Suggestions:');
    console.log('1. Try accessing the URL directly in your browser:');
    console.log('   https://www.foxsports.com.au/content-feeds/boxing/');
    console.log('2. Add proper headers (already included in code):');
    console.log('   - User-Agent: Mozilla/5.0');
    console.log('   - Accept: application/json, application/rss+xml');
    console.log('3. Try alternative Fox Sports Australia feeds:');
    console.log('   - Main feed: https://www.foxsports.com.au/content-feeds/');
    console.log(
      '   - Boxing section: https://www.foxsports.com.au/boxing/feed',
    );
    console.log(
      '   - Combat sports: https://www.foxsports.com.au/combat-sports/feed',
    );
    console.log(
      '4. Consider alternative boxing RSS sources for Australian content:',
    );
    console.log(
      '   - ESPN Australia Boxing: https://www.espn.com.au/espn/rss/boxing/news',
    );
    console.log(
      '   - Fox Sports (US) Boxing: https://www.foxsports.com/boxing/feed',
    );
    console.log('   - Sky Sports Boxing: https://www.skysports.com/rss/12056');
    console.log('   - Boxing News 24: https://www.boxingnews24.com/feed');
    console.log('   - Bad Left Hook: https://www.badlefthook.com/rss');
    console.log(
      '   - Australian Boxing Central: https://australianboxingcentral.com/feed',
    );
    console.log('5. Check if the feed requires an Australian IP address');
    console.log(
      '6. The content-feeds endpoint may require specific referer headers',
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

module.exports = { fetchFoxSportsBoxing };
