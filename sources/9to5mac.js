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

const fetch9to5MacNews = async () => {
  const rssUrl = 'https://9to5mac.com/feed/';
  const websiteName = '9to5mac';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1051,
      source_name: '9to5Mac',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: [
        'apple',
        'ios',
        'mac',
        'iphone',
        'ipad',
        'technology',
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
        creator: item.creator || [],
        image_url: extract9to5MacImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching 9to5Mac RSS feed:', error);
    return {
      source_name: '9to5Mac',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: [
        'apple',
        'ios',
        'mac',
        'iphone',
        'ipad',
        'technology',
        'tech',
      ],
      image: true,
      articles: [],
    };
  }
};

function extract9to5MacImage(item) {
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
  const response = await fetch9to5MacNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetch9to5MacNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, '9to5mac.com', 'Technology');
