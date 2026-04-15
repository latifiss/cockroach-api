const Parser = require('rss-parser');
const crypto = require('crypto');
const axios = require('axios');

const SOURCE_CONFIG = {
  scmp: {
    id: 1037,
    name: 'South China Morning Post',
    tags: ['general', 'china', 'asia', 'international', 'policy'],
    origin: 'Hong Kong',
    credibility: 4,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: false }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosure', { keepArray: false }],
      ['media:thumbnail', 'thumbnail', { keepArray: false }],
      ['content:encoded', 'contentEncoded', { keepArray: false }],
      ['scmp:location', 'location', { keepArray: false }],
    ],
  },
  timeout: 100000,
  requestOptions: {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Accept: 'application/rss+xml, text/xml; q=0.1',
      'Accept-Encoding': 'gzip, deflate',
      Referer: 'https://www.scmp.com/news/china/politics',
    },
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const cleanHTMLContent = (content) => {
  if (!content) return '';
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractFirstImageFromContent = (content) => {
  if (!content) return '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  return imgMatch ? imgMatch[1] : '';
};

const getImageUrl = (item) => {
  return (
    item.media?.$?.url ||
    item.enclosure?.url ||
    item.thumbnail?.$?.url ||
    (item['media:thumbnail']?.$ ? item['media:thumbnail'].$.url : '') ||
    extractFirstImageFromContent(item.contentEncoded)
  );
};

const cleanCategories = (categories) => {
  return (categories || [])
    .map((c) => {
      if (typeof c === 'string') return c.trim();
      if (c && typeof c === 'object' && c._) return c._.trim();
      if (c && typeof c === 'object' && c.$.label) return c.$.label.trim();
      return '';
    })
    .filter((c) => c);
};

const fetchSCMPPoliticsNews = async () => {
  const rssUrl = 'https://www.scmp.com/rss/91/feed';
  const websiteName = 'scmp';

  try {
    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (rssError) {
      console.log('RSS parser failed, trying axios...');
      const response = await axios.get(rssUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'application/rss+xml, text/xml; q=0.1',
          Referer: 'https://www.scmp.com/news/china/politics',
        },
        timeout: 20000,
      });
      feed = await parser.parseString(response.data);
    }

    const articles = feed.items
      .filter((item) => item.title && item.link)
      .map((item) => ({
        article_id: generateArticleId(
          item.title,
          item.link,
          websiteName,
          item.pubDate
        ),
        title: item.title.trim(),
        link: item.link,
        creator: Array.isArray(item.creator)
          ? item.creator
          : [item.creator || 'SCMP'],
        image_url: getImageUrl(item),
        description: cleanHTMLContent(
          item.description || item.contentSnippet || item.contentEncoded
        ),
        full_content: cleanHTMLContent(item.contentEncoded),
        published_at: item.isoDate || item.pubDate,
        categories: cleanCategories(item.categories),
        location: item.location?._ || item.location?.$?.label || '',
        guid: item.guid || '',
      }));

    return {
      source_id: SOURCE_CONFIG.scmp.id,
      source_name: SOURCE_CONFIG.scmp.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.scmp.origin,
      source_tags: SOURCE_CONFIG.scmp.tags,
      source_credibility: SOURCE_CONFIG.scmp.credibility,
      image: true,
      articles,
      fetched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching SCMP Politics RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.scmp,
      source_link: rssUrl,
      articles: [],
      error: error.message,
      fetched_at: new Date().toISOString(),
    };
  }
};

const main = async () => {
  try {
    const response = await fetchSCMPPoliticsNews();
    console.log(
      `Fetched ${response.articles.length} articles from SCMP Politics`
    );

    if (response.articles.length > 0) {
      console.log('\nSample article:');
      console.log({
        title: response.articles[0].title,
        link: response.articles[0].link,
        image_url: response.articles[0].image_url,
        creator: response.articles[0].creator,
        categories: response.articles[0].categories,
        published_at: response.articles[0].published_at,
        location: response.articles[0].location,
        description: response.articles[0].description.substring(0, 150) + '...',
      });
    }
  } catch (error) {
    console.error('Main execution failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  fetchSCMPPoliticsNews,
  cleanHTMLContent,
  getImageUrl,
  cleanCategories,
  SOURCE_CONFIG,
};
