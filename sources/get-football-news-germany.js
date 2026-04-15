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

const fetchGermanFootballNews = async () => {
  const rssUrl = 'https://www.getfootballnewsgermany.com/feed/';
  const websiteName = 'germanfootballnews';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1088,
      source_name: 'Get German Football News',
      source_link: 'https://www.getfootballnewsgermany.com',
      source_origin: 'Germany',
      source_tags: [
        'bundesliga',
        'german football',
        'bayern munich',
        'dortmund',
        'sports',
        'germany',
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
        image_url: extractGermanFootballImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching German Football News RSS feed:', error);
    return {
      source_name: 'Get German Football News',
      source_link: 'https://www.getfootballnewsgermany.com',
      source_origin: 'Germany',
      source_tags: [
        'bundesliga',
        'german football',
        'bayern munich',
        'dortmund',
        'sports',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractGermanFootballImage(item) {
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
  const response = await fetchGermanFootballNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchGermanFootballNews };
