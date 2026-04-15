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

const fetchEngadgetNews = async () => {
  const rssUrl = 'https://www.engadget.com/rss.xml';
  const websiteName = 'engadget';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1046,
      source_name: 'Engadget',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: [
        'technology',
        'gadgets',
        'consumer_electronics',
        'reviews',
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
        image_url: extractEngadgetImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Engadget RSS feed:', error);
    return {
      source_name: 'Engadget',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: ['technology', 'gadgets', 'consumer_electronics', 'reviews'],
      image: true,
      articles: [],
    };
  }
};

function extractEngadgetImage(item) {
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
  const response = await fetchEngadgetNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchEngadgetNews };
