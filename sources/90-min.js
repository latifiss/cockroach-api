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

const fetch90MinNews = async () => {
  const rssUrl = 'https://www.90min.com/posts.rss';
  const websiteName = '90min';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1081,
      source_name: '90min',
      source_link: 'https://www.90min.com',
      source_origin: 'International',
      source_tags: [
        'football',
        'soccer',
        'premier league',
        'champions league',
        'transfers',
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
        creator: item.creator || [],
        image_url: extract90MinImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching 90min RSS feed:', error);
    return {
      source_name: '90min',
      source_link: 'https://www.90min.com',
      source_origin: 'International',
      source_tags: [
        'football',
        'soccer',
        'premier league',
        'champions league',
        'transfers',
      ],
      image: true,
      articles: [],
    };
  }
};

function extract90MinImage(item) {
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
  const response = await fetch90MinNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetch90MinNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, '90min.com', 'Sports');
