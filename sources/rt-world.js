const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:content', 'mediaContent', { keepArray: true }],
      ['dc:creator', 'creator', { keepArray: true }],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosures', { keepArray: true }],
      ['content:encoded', 'contentEncoded', { keepArray: false }],
    ],
  },
});

const extractRTImage = (item) => {
  if (item.contentEncoded) {
    const figureMatch = item.contentEncoded.match(
      /<figure>.*?<img src="([^"]+)".*?<\/figure>/s
    );
    if (figureMatch && figureMatch[1]) {
      return figureMatch[1];
    }
  }

  return (
    item.mediaContent?.[0]?.$?.url ||
    item.mediaThumbnail?.[0]?.$?.url ||
    item.enclosures?.[0]?.url ||
    (item.description && item.description.match(/src="([^"]+)"/)?.[1]) ||
    ''
  );
};

const extractDescriptionFromContent = (contentEncoded = '') => {
  try {
    const cleanContent = contentEncoded.replace(/<!\[CDATA\[|\]\]>/g, '');

    const pTags = cleanContent.match(/<p[^>]*>(.*?)<\/p>/gs) || [];
    const meaningfulPTags = pTags
      .map((p) => {
        const text = p
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        return text;
      })
      .filter((p) => p.length > 0);

    return meaningfulPTags.slice(0, 2).join(' ');
  } catch (error) {
    console.error('Error extracting description from content:', error);
    return '';
  }
};

const cleanText = (text = '') => {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
};

const fetchRTNews = async () => {
  const rssUrl = 'https://www.rt.com/rss/news/';
  const websiteName = 'rtnews';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1018,
      source_name: 'RT News',
      source_link: rssUrl,
      source_origin: 'Russia',
      source_tags: ['news', 'world', 'politics', 'current affairs'],
      source_credibility: 3,
      image: true,
      articles: feed.items.map((item) => {
        const description = item.contentEncoded
          ? extractDescriptionFromContent(item.contentEncoded)
          : cleanText(item.description || '');

        return {
          article_id: generateArticleId(
            item.title,
            item.link,
            websiteName,
            item.pubDate
          ),
          title: item.title,
          link: item.link.split('?')[0],
          keywords: item.categories || [],
          creator: item.creator || [],
          image_url: extractRTImage(item),
          description: description,
          published_at: item.isoDate || item.pubDate,
        };
      }),
    };
  } catch (error) {
    console.error('Error fetching RT News RSS feed:', error);
    return {
      source_name: 'RT News',
      source_link: rssUrl,
      source_origin: 'Russia',
      source_tags: ['news', 'world', 'politics', 'current affairs'],
      image: true,
      articles: [],
    };
  }
};

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const main = async () => {
  const response = await fetchRTNews();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchRTNews };
