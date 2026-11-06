const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
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

const fetchTechCrunchNews = async () => {
  const rssUrl = 'http://feeds.feedburner.com/TechCrunch';
  const websiteName = 'techcrunch';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1041,
      source_name: 'TechCrunch',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: [
        'startups',
        'technology',
        'venture_capital',
        'silicon_valley',
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
        image_url: extractTechCrunchImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching TechCrunch RSS feed:', error);
    return {
      source_name: 'TechCrunch',
      source_link: rssUrl,
      source_origin: 'United States',
      source_tags: [
        'startups',
        'technology',
        'venture_capital',
        'silicon_valley',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractTechCrunchImage(item) {
  // First try media:content
  if (item['media:content']?.[0]?.$?.url) {
    return item['media:content'][0].$.url;
  }

  // Then try media:thumbnail
  if (item['media:thumbnail']?.[0]?.$?.url) {
    return item['media:thumbnail'][0].$.url;
  }

  // Then look for enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  // Finally parse content:encoded for image
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  return '';
}

const main = async () => {
  const response = await fetchTechCrunchNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchTechCrunchNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'techcrunch.com', 'Technology');
