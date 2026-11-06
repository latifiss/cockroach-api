const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  the_publisher_online_sports: {
    id: 1170,
    name: 'The Publisher',
    domain_url: 'thepublisheronline.com',
    source_category: 'Sports',
    tags: ['ghana', 'sports', 'news', 'football'],
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

    // Try different selectors for image
    const imageElement = $(
      '.single-featured img, .featured img, .post-content img'
    ).first();
    const imageUrl =
      imageElement.attr('src') ||
      imageElement.attr('data-src') ||
      imageElement.attr('data-bs-src') ||
      '';

    // Extract description from post content
    let description = $('.post-content.clearfix, .post-content, .entry-content')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);

    // If no description found in content, try the post-summary
    if (!description) {
      description = $('.post-summary')
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
    }

    return { imageUrl, description };
  } catch (error) {
    console.error(
      `Error fetching article details from ${articleLink}: ${error.message}`
    );
    return { imageUrl: '', description: '' };
  }
};

const fetchThePublisherOnlineSports = async () => {
  const categoryUrl = 'https://www.thepublisheronline.com/category/sports/';
  const websiteName = 'the_publisher_online_sports';
  const initialTags = SOURCE_CONFIG.the_publisher_online_sports.tags;

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

    // Handle both grid and modern grid listings
    $('.listing-item, .listing-mg-item').each((i, el) => {
      const element = $(el);

      // Extract title and link
      const titleElement = element.find('.title a, h2 a').first();
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');

      // Extract published date
      const publishedAt =
        element.find('.post-published.updated, time').attr('datetime') ||
        element.find('.time time').attr('datetime');

      // Extract author/creator
      let creator = element.find('.post-author, .author').text().trim();
      if (!creator) {
        const authorLink = element.find('.post-author-a').attr('href');
        if (authorLink && authorLink.includes('/author/')) {
          creator = authorLink.split('/author/')[1].replace(/[-\/]/g, ' ');
        }
      }

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
                categories: ['Sports'],
                tags: [...initialTags],
                has_image: !!detailImageUrl,
              });
            }
          )
        );
      }
    });

    await Promise.all(articlePromises);

    return {
      ...SOURCE_CONFIG.the_publisher_online_sports,
      source_link: categoryUrl,
      image: articles.some((a) => a.has_image),
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.the_publisher_online_sports,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const result = await fetchThePublisherOnlineSports();
      console.log(JSON.stringify(result, '', 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchThePublisherOnlineSports,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
