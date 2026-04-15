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

const fetchGSMArenaNews = async () => {
  const rssUrl = 'https://www.gsmarena.com/rss-news-reviews.php3';
  const websiteName = 'gsmarena';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1050,
      source_name: 'GSMArena',
      source_link: rssUrl,
      source_origin: 'International',
      source_tags: ['mobile', 'technology', 'reviews', 'tech', 'handsets'],
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
        image_url: extractGSMArenaImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching GSMArena RSS feed:', error);
    return {
      source_name: 'GSMArena',
      source_link: rssUrl,
      source_origin: 'International',
      source_tags: ['mobile', 'technology', 'reviews', 'tech', 'handsets'],
      image: true,
      articles: [],
    };
  }
};

function extractGSMArenaImage(item) {
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
  const response = await fetchGSMArenaNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchGSMArenaNews };
