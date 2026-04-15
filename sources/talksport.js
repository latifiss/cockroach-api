const Parser = require('rss-parser');
const crypto = require('crypto');
const https = require('https');

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
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
  },
  timeout: 10000,
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchTalkSportNews = async () => {
  const rssUrl = 'https://talksport.com/feed/';
  const websiteName = 'talksport';

  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();

    if (
      xmlText.includes('Verifying your device') ||
      xmlText.includes('Verification failed')
    ) {
      console.error(
        'RSS feed is behind verification wall - trying alternative approach',
      );
      const altResponse = await fetch(rssUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });

      const altText = await altResponse.text();
      if (altText.includes('Verifying')) {
        throw new Error(
          'Unable to bypass TalkSport verification - feed may require JavaScript',
        );
      }

      const feed = await parser.parseString(altText);
      return processFeed(feed, websiteName);
    }

    const feed = await parser.parseString(xmlText);
    return processFeed(feed, websiteName);
  } catch (error) {
    console.error('Error fetching TalkSport RSS feed:', error);
    return {
      source_name: 'TalkSport',
      source_link: 'https://talksport.com',
      source_origin: 'UK',
      source_tags: [
        'football',
        'sports news',
        'premier league',
        'uk sports',
        'football transfer news',
      ],
      image: true,
      articles: [],
      error: error.message,
    };
  }
};

function processFeed(feed, websiteName) {
  return {
    source_id: 1084,
    source_name: 'TalkSport',
    source_link: 'https://talksport.com',
    source_origin: 'UK',
    source_tags: [
      'football',
      'sports news',
      'premier league',
      'uk sports',
      'football transfer news',
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
      image_url: extractTalkSportImage(item),
      description: item.description || item.contentSnippet || '',
      content: item.contentEncoded || item.content || '',
      published_at: item.isoDate || item.pubDate,
      categories: item.categories || [],
    })),
  };
}

function extractTalkSportImage(item) {
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
  console.log('Fetching TalkSport news...');
  const response = await fetchTalkSportNews();

  if (response.articles.length === 0) {
    console.log('\n⚠️ No articles fetched. The RSS feed may be blocked.');
    console.log('Suggestions:');
    console.log('1. Try accessing https://talksport.com/feed/ in your browser');
    console.log('2. Check if the feed requires cookies or JavaScript');
    console.log('3. Consider using an RSS proxy service');
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

module.exports = { fetchTalkSportNews };
