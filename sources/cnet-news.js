const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['dc:creator', 'dc:creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchCNETNews = async () => {
  const rssUrl = 'https://www.cnet.com/rss/news/';
  const websiteName = 'cnet-news';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1039,
      source_name: 'CNET',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['technology', 'news', 'usa', 'tech'],
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
          item.enclosure?.url ||
          item['media:content']?.[0]?.$?.url ||
          item.content?.match(/<img[^>]+src="([^">]+)"/)?.[1] ||
          '',
        description: item.description || item.contentSnippet || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching CNET News RSS feed:', error);
    return {
      source_name: 'CNET News',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['technology', 'news', 'usa'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchCNETNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchCNETNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'cnet.com', 'Technology');
