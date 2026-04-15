const Parser = require('rss-parser');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  dailymail: {
    id: 1022,
    name: 'Daily Mail',
    tags: ['uk', 'news', 'international'],
    origin: 'United Kingdom',
    credibility: 3,
  },
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: false }],
      ['media:thumbnail', 'thumbnail', { keepArray: false }],
      ['enclosure', 'enclosure', { keepArray: false }],
    ],
  },
  timeout: 100000,
});

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

const getImageUrl = (item) => {
  return (
    item.media?.$?.url || item.enclosure?.url || item.thumbnail?.$?.url || ''
  );
};

const fetchDailyMailNews = async () => {
  const rssUrl = 'https://www.dailymail.co.uk/home/index.rss';
  const websiteName = 'dailymail';

  try {
    const feed = await parser.parseURL(rssUrl);

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
        image_url: getImageUrl(item),
        description: cleanDescription(
          item.content || item.contentSnippet || item.description
        ),
        published_at: item.isoDate || item.pubDate,
      }));

    return {
      source_id: SOURCE_CONFIG.dailymail.id,
      source_name: SOURCE_CONFIG.dailymail.name,
      source_link: rssUrl,
      source_origin: SOURCE_CONFIG.dailymail.origin,
      source_tags: SOURCE_CONFIG.dailymail.tags,
      source_credibility: SOURCE_CONFIG.dailymail.credibility,
      image: true,
      articles,
    };
  } catch (error) {
    console.error(`Error fetching Daily Mail RSS feed: ${error.message}`, {
      url: rssUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.dailymail,
      source_link: rssUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchDailyMailNews();
    console.log(JSON.stringify(response, null, 2));
    console.log(`Fetched ${response.articles.length} articles from Daily Mail`);

    if (response.articles.length > 0) {
      console.log('\nSample article:');
      console.log({
        title: response.articles[0].title,
        link: response.articles[0].link,
        image_url: response.articles[0].image_url,
        description: response.articles[0].description,
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
  fetchDailyMailNews,
  cleanDescription,
  getImageUrl,
};
