const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchBBCScienceEnvironmentNews = async () => {
  const rssUrl =
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml';
  const websiteName = 'bbcscience';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1014,
      source_name: 'BBC Science & Environment',
      source_link: rssUrl,
      source_origin: 'United Kingdom',
      source_tags: [
        'science',
        'environment',
        'technology',
        'climate',
        'nature',
      ],
      source_credibility: 4,
      image: true,
      articles: feed.items.map((item) => ({
        article_id: generateArticleId(
          item.title,
          item.link,
          websiteName,
          item.pubDate
        ),
        title: item.title,
        link: item.link,
        keywords: item.categories || [],
        creator: [],
        image_url: item['media:thumbnail']?.[0]?.$.url || '',
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    console.error('Error fetching BBC Science & Environment RSS feed:', error);
    return {
      source_name: 'BBC Science & Environment',
      source_link: rssUrl,
      source_origin: 'United Kingdom',
      source_tags: [
        'science',
        'environment',
        'technology',
        'climate',
        'nature',
      ],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchBBCScienceEnvironmentNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchBBCScienceEnvironmentNews };
