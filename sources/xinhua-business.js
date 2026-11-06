const Parser = require('rss-parser');
const crypto = require('crypto');
const axios = require('axios');

const SOURCE_CONFIG = {
  xinhua: {
    id: 1038,
    name: 'Xinhua World News',
    domain_url: 'xinhuanet.com',
    source_category: 'Business & Finance',
    tags: ['world', 'news', 'china', 'international'],
    origin: 'China',
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
      ['pubDate', 'pubDate', { keepArray: false }],
      ['description', 'description', { keepArray: false }],
    ],
  },
  timeout: 100000,
  requestOptions: {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Accept: 'application/rss+xml, text/xml; q=0.1',
      'Accept-Encoding': 'gzip, deflate',
    },
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const cleanDescription = (description) => {
  if (!description) return '';
  // Remove CDATA tags if present
  let cleaned = description.replace(/<!\[CDATA\[|\]\]>/g, '');
  // Remove HTML tags and extra whitespace
  return cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getImageUrl = (item) => {
  // Xinhua often puts images in the description
  const descImageMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
  const descImage = descImageMatch ? descImageMatch[1] : '';

  return item.enclosure?.url || item.media?.$?.url || descImage;
};

const cleanCategories = (categories) => {
  return (categories || [])
    .map((c) => {
      if (typeof c === 'string') return c.trim();
      if (c && typeof c === 'object' && c._) return c._.trim();
      return '';
    })
    .filter((c) => c);
};

const parseXinhuaDate = (dateString) => {
  if (!dateString) return new Date().toISOString();
  // Xinhua dates are typically in RFC 2822 format
  return new Date(dateString).toISOString();
};

const fetchXinhuaBusinessNews = async () => {
  const rssUrl = 'http://www.xinhuanet.com/english/rss/worldrss.xml';
  const websiteName = 'xinhua';

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
        },
        timeout: 100000,
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
          : [item.creator || 'Xinhua'],
        image_url: getImageUrl(item),
        description: cleanDescription(item.description),
        published_at: parseXinhuaDate(item.isoDate || item.pubDate),
        categories: cleanCategories(item.categories),
        guid: item.guid || '',
      }));

    return {
      source_id: SOURCE_CONFIG.xinhua.id,
      source_name: SOURCE_CONFIG.xinhua.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.xinhua.origin,
      source_tags: SOURCE_CONFIG.xinhua.tags,
      source_credibility: SOURCE_CONFIG.xinhua.credibility,
      image: true,
      articles,
      fetched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching Xinhua World RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.xinhua,
      source_link: rssUrl,
      articles: [],
      error: error.message,
      fetched_at: new Date().toISOString(),
    };
  }
};

const main = async () => {
  try {
    const response = await fetchXinhuaWorldNews();
    console.log(
      `Fetched ${response.articles.length} articles from Xinhua World News`
    );

    if (response.articles.length > 0) {
      console.log('\nSample article:');
      console.log({
        title: response.articles[0].title,
        link: response.articles[0].link,
        image_url: response.articles[0].image_url,
        published_at: response.articles[0].published_at,
        description: response.articles[0].description.substring(0, 100) + '...',
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
  fetchXinhuaBusinessNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
  SOURCE_CONFIG,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
