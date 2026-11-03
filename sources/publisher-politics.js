const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  the_publisher_online_politics: {
    id: 1170,
    name: 'The Publisher',
    domain_url: 'thepublisheronline.com',
    source_category: 'Politics',
    tags: ['ghana', 'politics', 'news'],
    origin: 'Ghana',
    credibility: 4,
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

const fetchArticleDetails = async (articleLink) => {
  try {
    const response = await axios.get(articleLink, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const $ = cheerio.load(response.data);

    const imageElement = $('.single-featured img');
    const imageUrl =
      imageElement.attr('src') || imageElement.attr('data-src') || '';

    const description = $('.post-content.clearfix')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);

    return { imageUrl, description };
  } catch (error) {
    console.error(
      `Error fetching article details from ${articleLink}: ${error.message}`
    );
    return { imageUrl: '', description: '' };
  }
};

const fetchThePublisherOnlinePolitics = async () => {
  const categoryUrl = 'https://www.thepublisheronline.com/category/politics/';
  const websiteName = 'the_publisher_online_politics';
  const initialTags = SOURCE_CONFIG.the_publisher_online_politics.tags;

  try {
    const response = await axios.get(categoryUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const $ = cheerio.load(response.data);

    const articles = [];
    const articlePromises = [];

    $('.listing-mix-4-5 .listing-item').each((i, el) => {
      const element = $(el);
      const title = element.find('.title a').text().trim();
      const link = element.find('.title a').attr('href');
      const publishedAt = element
        .find('.post-published.updated')
        .attr('datetime');
      const creator = element.find('.post-author').text().trim();

      if (title && link) {
        articlePromises.push(
          fetchArticleDetails(link).then(
            ({ imageUrl: detailImageUrl, description }) => {
              articles.push({
                article_id: generateArticleId(
                  title,
                  link,
                  websiteName,
                  publishedAt
                ),
                title,
                link,
                creator: creator ? [creator] : ['The Publisher'],
                image_url: detailImageUrl,
                description: description || '',
                published_at: publishedAt || new Date().toISOString(),
                categories: ['Politics'],
                tags: initialTags,
                has_image: !!detailImageUrl,
              });
            }
          )
        );
      }
    });

    await Promise.all(articlePromises);

    return {
      ...SOURCE_CONFIG.the_publisher_online_politics,
      source_link: categoryUrl,
      image: articles.some((a) => a.has_image),
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.the_publisher_online_politics,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const result = await fetchThePublisherOnlinePolitics();
      console.log(JSON.stringify(result, '', 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchThePublisherOnlinePolitics,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
