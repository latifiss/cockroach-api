const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ameyawdebrah: {
    id: 1155,
    name: 'Ameyaw Debrah',
    tags: [
      'entertainment',
      'ghana',
      'local',
      'celebrities',
      'music',
      'movies',
      'fashion',
      'lifestyle',
      'events',
    ],
    origin: 'Ghana',
    credibility: 5,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: false }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosure', { keepArray: false }],
      ['content:encoded', 'contentEncoded', { keepArray: false }],
    ],
  },
  timeout: 100000,
});

// Helper functions (same as before)
const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const cleanDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

// Enhanced image extraction function
const getImageUrl = (item) => {
  // First try standard RSS image locations
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  if (item.media?.$?.url) {
    return item.media.$.url;
  }

  // Then try to extract from content:encoded HTML
  if (item.contentEncoded) {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const match = imgRegex.exec(item.contentEncoded);
    if (match && match[1]) {
      return match[1].split('?')[0]; // Remove any query parameters
    }
  }

  return '';
};

const fetchAmeyawDebrahNews = async () => {
  const rssUrl = 'https://ameyawdebrah.com/feed/';
  const websiteName = 'ameyawdebrah';

  try {
    const feed = await parser.parseURL(rssUrl);

    const articles = feed.items
      .filter((item) => item.title && item.link)
      .map((item) => {
        const imageUrl = getImageUrl(item);

        return {
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
            : [item.creator || 'Ameyaw Debrah'],
          image_url: imageUrl,
          description: cleanDescription(
            item.content || item.contentSnippet || item.description
          ),
          published_at: item.isoDate || item.pubDate,
          categories: cleanCategories(item.categories),
          has_image: !!imageUrl, // Explicit flag for image presence
        };
      });

    return {
      source_id: SOURCE_CONFIG.ameyawdebrah.id,
      source_name: SOURCE_CONFIG.ameyawdebrah.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.ameyawdebrah.origin,
      source_tags: SOURCE_CONFIG.ameyawdebrah.tags,
      source_credibility: SOURCE_CONFIG.ameyawdebrah.credibility,
      image: articles.some((article) => article.has_image), // True if any article has image
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Ameyaw Debrah RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.ameyawdebrah,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

// Rest of the code remains the same...
const main = async () => {
  try {
    const response = await fetchAmeyawDebrahNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(
      `Fetched ${response.articles.length} articles from Ameyaw Debrah`
    );

    if (response.articles.length > 0) {
      console.log('\nSample article:');
      console.log({
        title: response.articles[0].title,
        link: response.articles[0].link,
        image_url: response.articles[0].image_url,
        creator: response.articles[0].creator,
        categories: response.articles[0].categories,
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
  fetchAmeyawDebrahNews,
  cleanDescription,
  getImageUrl,
  cleanCategories,
};
