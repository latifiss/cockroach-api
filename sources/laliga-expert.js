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

const fetchLaLigaExpertNews = async () => {
  const rssUrl = 'https://laligaexpert.com/feed/';
  const websiteName = 'laligaexpert';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1093,
      source_name: 'La Liga Expert',
      source_link: 'https://laligaexpert.com',
      source_origin: 'Spain',
      source_tags: [
        'la liga',
        'spanish football',
        'real madrid',
        'barcelona',
        'atletico madrid',
        'sports',
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
        image_url: extractLaLigaExpertImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching La Liga Expert RSS feed:', error);
    return {
      source_name: 'La Liga Expert',
      source_link: 'https://laligaexpert.com',
      source_origin: 'Spain',
      source_tags: [
        'la liga',
        'spanish football',
        'real madrid',
        'barcelona',
        'atletico madrid',
        'sports',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractLaLigaExpertImage(item) {
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
  const response = await fetchLaLigaExpertNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchLaLigaExpertNews };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'laligaexpert.com', 'Sports');
