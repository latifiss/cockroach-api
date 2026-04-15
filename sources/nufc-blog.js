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

const fetchNUFCBlogNews = async () => {
  const rssUrl = 'http://www.nufcblog.co.uk/feed/';
  const websiteName = 'nufcblog';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1065,
      source_name: 'NUFC Blog',
      source_link: rssUrl,
      source_origin: 'United Kingdom',
      source_tags: [
        'newcastle united',
        'football',
        'soccer',
        'premier league',
        'nufc',
      ],
      source_credibility: 3,
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
        image_url: extractNUFCBlogImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching NUFC Blog RSS feed:', error);
    return {
      source_name: 'NUFC Blog',
      source_link: rssUrl,
      source_origin: 'United Kingdom',
      source_tags: [
        'newcastle united',
        'football',
        'soccer',
        'premier league',
        'nufc',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractNUFCBlogImage(item) {
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
  const response = await fetchNUFCBlogNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchNUFCBlogNews };
