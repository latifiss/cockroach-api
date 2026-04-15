const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
      ['dc:creator', 'dc:creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchMashableNews = async () => {
  const rssUrl = 'http://feeds.mashable.com/Mashable';
  const websiteName = 'mashable';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1040,
      source_name: 'Mashable',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: [
        'technology',
        'digital_culture',
        'entertainment',
        'news',
        'tech',
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
        creator: item['dc:creator'] || [],
        image_url:
          item['media:content']?.[0]?.$?.url ||
          item['media:thumbnail']?.[0]?.$?.url ||
          item.enclosure?.url ||
          item.content?.match(/<img[^>]+src="([^">]+)"/)?.[1] ||
          '',
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Mashable RSS feed:', error);
    return {
      source_name: 'Mashable',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['technology', 'digital_culture', 'entertainment', 'news'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchMashableNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchMashableNews };
