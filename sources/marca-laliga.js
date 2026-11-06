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

const fetchMarcaLigaNews = async () => {
  const rssUrl = 'https://e00-marca.uecdn.es/rss/futbol/primera-division.xml';
  const websiteName = 'marcaliga';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1079,
      source_name: 'Marca La Liga',
      source_link: 'https://www.marca.com/futbol/primera-division.html',
      source_origin: 'Spain',
      source_tags: [
        'la liga',
        'primera division',
        'real madrid',
        'barcelona',
        'atletico madrid',
      ],
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
        creator: item.creator || [],
        image_url: extractMarcaLigaImage(item),
        description: item.description || item.contentSnippet || '',
        content: item.contentEncoded || '',
        published_at: item.isoDate || item.pubDate,
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Error fetching Marca La Liga RSS feed:', error);
    return {
      source_name: 'Marca La Liga',
      source_link: 'https://www.marca.com/futbol/primera-division.html',
      source_origin: 'Spain',
      source_tags: [
        'la liga',
        'primera division',
        'real madrid',
        'barcelona',
        'atletico madrid',
      ],
      image: true,
      articles: [],
    };
  }
};

function extractMarcaLigaImage(item) {
  // First check media:content (common in Marca's RSS)
  if (item.mediaContent?.[0]?.$.url) {
    return item.mediaContent[0].$.url;
  }
  // Then check enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  // Then check content:encoded
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  // Finally check description
  if (item.description) {
    const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch?.[1]) {
      return imgMatch[1];
    }
  }
  return '';
}

const main = async () => {
  const response = await fetchMarcaLigaNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchMarcaLigaNews };

require('../utils/sourceConfig').attachSourceCategory(module.exports, 'Sports');
