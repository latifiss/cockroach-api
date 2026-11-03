const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  myjoyonline: {
    id: 1161,
    name: 'MyJoyOnline',
    domain_url: 'myjoyonline.com',
    source_category: 'Business & Finance',
    tags: ['business', 'economy', 'ghana', 'finance', 'markets'],
    origin: 'Ghana',
    credibility: 5,
  },
};

const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${
    pubDate || new Date().toISOString()
  }`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const cleanDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseMyJoyOnlineArticleDate = ($) => {
  const metaDate = $('meta[property="article:published_time"]').attr('content');
  if (metaDate) return new Date(metaDate).toISOString();
  return new Date().toISOString();
};

const fetchMyJoyOnlineBusiness = async () => {
  const baseUrl = 'https://www.myjoyonline.com';
  const businessUrl = 'https://www.myjoyonline.com/business/';
  const websiteName = 'myjoyonline-business';

  try {
    const response = await axios.get(businessUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $('div.row.mt-3 ul.mr li.mostrecent_btf').each((i, element) => {
      const linkElement = $(element).find('a');
      const title = linkElement.text().trim();
      const relativeLink = linkElement.attr('href');

      if (title && relativeLink) {
        articles.push({
          article_id: generateArticleId(title, relativeLink, websiteName, null),
          title,
          link: relativeLink.startsWith('http')
            ? relativeLink
            : `${baseUrl}${relativeLink}`,
          creator: ['MyJoyOnline'],
          image_url: '',
          description: '',
          published_at: '',
          categories: ['business'],
          has_image: false,
          time_text: '',
        });
      }
    });

    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        const description = article$('#article-text').text() || '';
        const publishedAt = parseMyJoyOnlineArticleDate(article$);

        let imageUrl = '';
        const imageContainer = article$(
          'div.position-relative.share-this-item-show.img-holder'
        );
        if (imageContainer.length) {
          imageUrl = imageContainer.find('img').attr('src') || '';
        } else {
          const fallbackImage = article$('.article-thumb img').first();
          if (fallbackImage.length) {
            imageUrl = fallbackImage.attr('src') || '';
          }
        }

        detailedArticles.push({
          ...article,
          description: cleanDescription(description),
          image_url: imageUrl,
          published_at: publishedAt,
          has_image: !!imageUrl,
          article_id: generateArticleId(
            article.title,
            article.link,
            websiteName,
            publishedAt
          ),
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        detailedArticles.push(article);
      }
    }

    return {
      ...SOURCE_CONFIG.myjoyonline,
      source_link: businessUrl,
      image: detailedArticles.some((a) => a.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    return {
      ...SOURCE_CONFIG.myjoyonline,
      source_link: businessUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    const result = await fetchMyJoyOnlineBusiness();
    console.log(JSON.stringify(result, null, 2));
  })();
}

module.exports = {
  fetchMyJoyOnlineBusiness,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
