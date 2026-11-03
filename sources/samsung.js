const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchSamsungGlobalNews = async () => {
  const rssUrl = 'https://news.samsung.com/global/feed';
  const websiteName = 'samsung-global';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1055,
      source_name: 'Samsung Global Newsroom',
      source_link: rssUrl,
      source_origin: 'South Korea',
      source_tags: ['samsung', 'mobile', 'technology', 'innovation', 'tech'],
      source_credibility: 5,
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
        creator: item.creator || ['Samsung'],
        image_url: extractSamsungImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Samsung Global Newsroom RSS feed:', error);
    return {
      source_name: 'Samsung Global Newsroom',
      source_link: rssUrl,
      source_origin: 'South Korea',
      source_tags: ['samsung', 'mobile', 'technology', 'innovation', 'tech'],
      image: true,
      articles: [],
    };
  }
};

function extractSamsungImage(item) {
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
  return '';
}

const main = async () => {
  const response = await fetchSamsungGlobalNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchSamsungGlobalNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'samsung.com', 'Technology');
