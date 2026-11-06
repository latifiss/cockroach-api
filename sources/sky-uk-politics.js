const Parser = require('rss-parser');
const crypto = require('crypto');

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:content', 'mediaContent', { keepArray: true }],
      ['enclosure', 'enclosure', { keepArray: true }],
    ],
  },
});

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${pubDate}`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const fetchSkyNewsPolitics = async () => {
  const rssUrl = 'https://feeds.skynews.com/feeds/rss/politics.xml';
  const websiteName = 'skypolitics';

  try {
    const feed = await parser.parseURL(rssUrl);
    return {
      source_id: 1015,
      source_name: 'Sky News',
      source_link: rssUrl,
      source_origin: 'United Kingdom',
      source_tags: ['politics', 'government', 'elections', 'policy'],
      source_credibility: 4,
      image: true,
      articles: feed.items.map((item) => {
        const imageUrl =
          item.mediaThumbnail?.[0]?.$.url ||
          item.mediaContent?.[0]?.$.url ||
          item.enclosure?.[0]?.url ||
          '';
        return {
          article_id: generateArticleId(
            item.title,
            item.link,
            websiteName,
            item.pubDate
          ),
          title: item.title,
          link: item.link,
          keywords: [],
          creator: [],
          image_url: imageUrl,
          description:
            item.content || item.description || item.contentSnippet || '',
          published_at: item.isoDate || item.pubDate,
        };
      }),
    };
  } catch (error) {
    console.error('Error fetching Sky News Politics RSS feed:', error);
    return {
      source_name: 'Sky News Politics',
      source_link: rssUrl,
      source_origin: 'United Kingdom',
      source_tags: ['politics', 'government', 'elections', 'policy'],
      image: true,
      articles: [],
    };
  }
};

const main = async () => {
  const response = await fetchSkyNewsPolitics();
  console.log(JSON.stringify(response, null, 2));
};

if (require.main === module) {
  main();
}

module.exports = { fetchSkyNewsPolitics };

require('../utils/sourceConfig').attachSourceDomainUrl(module.exports, 'skynews.com', 'Politics');
