const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['dc:creator', 'dc:creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchTheNextWebNews = async () => {
  const rssUrl = 'https://thenextweb.com/feed/';
  const websiteName = 'thenextweb';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1042,
      source_name: 'The Next Web',
      source_link: rssUrl,
      source_origin: 'Netherlands',
      source_tags: ['technology', 'business', 'startups', 'gadgets', 'tech'],
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
          item.enclosure?.url ||
          item.contentEncoded?.match(/<img[^>]+src="([^">]+)"/)?.[1] ||
          '',
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching The Next Web RSS feed:', error);
    return {
      source_name: 'The Next Web',
      source_link: rssUrl,
      source_origin: 'Netherlands',
      source_tags: ['technology', 'business', 'startups', 'gadgets'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchTheNextWebNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchTheNextWebNews };
