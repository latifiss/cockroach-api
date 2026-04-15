const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:description', 'mediaDescription', { keepArray: false }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosures', { keepArray: true }],
      ['content:encoded', 'contentEncoded', { keepArray: false }],
    ],
  },
});

const extractIndependentImage = (item) => {
  if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
    if (imgMatch && imgMatch[1]) return imgMatch[1];
  }
  return item.mediaContent?.[0]?.$?.url || item.enclosures?.[0]?.url || '';
};

const extractDescriptionFromContent = (contentEncoded = '') => {
  try {
    const cleanContent = contentEncoded.replace(/<!\[CDATA\[|\]\]>/g, '');
    const pTags = cleanContent.match(/<p[^>]*>(.*?)<\/p>/gs) || [];
    const meaningfulPTags = pTags
      .map((p) =>
        p
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter((p) => p.length > 0);
    return meaningfulPTags.slice(0, 2).join(' ');
  } catch (error) {
    return '';
  }
};

const cleanText = (text = '') => {
  return text
    .toString()
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractDescription = (item) => {
  if (item.description) {
    const cleaned = cleanText(item.description);
    if (cleaned) return cleaned;
  }
  if (item.contentEncoded) {
    const fromContent = extractDescriptionFromContent(item.contentEncoded);
    if (fromContent) return fromContent;
  }
  if (item.mediaDescription) {
    const cleaned = cleanText(item.mediaDescription);
    if (cleaned) return cleaned;
  }
  return '';
};

const fetchIndependentFootballNews = async () => {
  const rssUrl = 'https://www.independent.co.uk/sport/football/rss';
  const websiteName = 'independent';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1019,
      source_name: 'The Independent',
      source_link: rssUrl,
      source_origin: 'UK',
      source_tags: ['sport', 'football', 'premier league', 'champions league'],
      source_credibility: 3,
      image: true,
      articles: feed.items.map((item) => ({
        article_id: crypto
          .createHash('md5')
          .update(`${websiteName}-${item.title}-${item.link}-${item.pubDate}`)
          .digest('hex'),
        title: cleanText(item.title),
        link: item.link.split('?')[0],
        keywords: item.categories || [],
        creator: item.creator || [],
        image_url: extractIndependentImage(item),
        description: extractDescription(item),
        published_at: item.isoDate || item.pubDate,
      })),
    };
  } catch (error) {
    return {
      source_name: 'The Independent',
      source_link: rssUrl,
      source_origin: 'UK',
      source_tags: ['sport', 'football', 'premier league', 'champions league'],
      image: true,
      articles: [],
    };
  }
};

if (require.main === module) {
  fetchIndependentFootballNews().then(console.log);
}

module.exports = { fetchIndependentFootballNews };
