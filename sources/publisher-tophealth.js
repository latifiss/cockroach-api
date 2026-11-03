const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// Configuration for the source website
const SOURCE_CONFIG = {
  the_publisher_online: {
    id: 1170,
    name: 'The Publisher',
    domain_url: 'thepublisheronline.com',
    source_category: 'Science & Health',
    tags: ['ghana', 'news', 'health'], // Base tags, specific categories will add more
    origin: 'Ghana',
    credibility: 5, // A hypothetical credibility score
  },
};

/**
 * Generates a unique MD5 hash for an article based on its details.
 * @param {string} title - The title of the article.
 * @param {string} link - The URL of the article.
 * @param {string} websiteName - The name of the website.
 * @param {string} [pubDate] - The publication date of the article.
 * @returns {string} The MD5 hash as a hexadecimal string.
 */
const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${
    pubDate || new Date().toISOString()
  }`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

/**
 * Cleans an HTML description by removing tags and extra whitespace.
 * @param {string} description - The HTML string to clean.
 * @returns {string} The cleaned plain text description.
 */
const cleanDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .trim();
};

/**
 * Fetches additional details for a given article link, such as image URL and full description.
 * @param {string} articleLink - The URL of the article to fetch details from.
 * @returns {Promise<object>} An object containing the imageUrl and description.
 */
const fetchArticleDetails = async (articleLink) => {
  try {
    const response = await axios.get(articleLink, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const $ = cheerio.load(response.data);

    // Try different selectors for the main image within the article
    const imageElement = $(
      '.single-featured img, .featured img, .post-content img'
    ).first();
    const imageUrl =
      imageElement.attr('src') ||
      imageElement.attr('data-src') ||
      imageElement.attr('data-bs-src') ||
      ''; // Fallback to empty string if no image found

    // Extract description from post content, or post-summary if content is empty
    let description = $('.post-content.clearfix, .post-content, .entry-content')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit description length

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

/**
 * Fetches articles from a specified category on The Publisher Online.
 * @param {string} categoryUrl - The URL of the category page (e.g., sports, health-tips).
 * @param {string} categoryName - The name of the category (e.g., 'Sports', 'Health Tips').
 * @param {Array<string>} additionalTags - Any additional tags specific to this category.
 * @returns {Promise<object>} An object containing source configuration and a list of articles.
 */
const fetchThePublisherOnlineCategory = async (
  categoryUrl,
  categoryName,
  additionalTags = []
) => {
  const websiteName = SOURCE_CONFIG.the_publisher_online.name;
  const initialTags = [
    ...SOURCE_CONFIG.the_publisher_online.tags,
    ...additionalTags,
  ];

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

    // Selectors for listing items, covering both grid and modern grid layouts
    $('.listing-item, .listing-mg-item').each((i, el) => {
      const element = $(el);

      // Extract title and link from various possible heading tags
      const titleElement = element.find('.title a, h2 a').first();
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');

      // Extract published date from datetime attribute of time or span tags
      const publishedAt =
        element.find('.post-published.updated, time').attr('datetime') ||
        element.find('.time time').attr('datetime');

      // Extract author/creator. Prioritize direct text, then parse from author link.
      let creator = element.find('.post-author, .author').text().trim();
      if (!creator) {
        const authorLink = element.find('.post-author-a').attr('href');
        if (authorLink && authorLink.includes('/author/')) {
          // Clean up author name from URL
          creator = authorLink.split('/author/')[1].replace(/[-\/]/g, ' ');
        }
      }

      if (title && link) {
        // Fetch detailed image and description for each article concurrently
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
                creator: creator ? [creator] : [websiteName], // Use website name if author is not found
                image_url: detailImageUrl,
                description: cleanDescription(description) || '',
                published_at: publishedAt || new Date().toISOString(),
                categories: [categoryName],
                tags: [...initialTags],
                has_image: !!detailImageUrl,
              });
            }
          )
        );
      }
    });

    await Promise.all(articlePromises); // Wait for all article details to be fetched

    return {
      ...SOURCE_CONFIG.the_publisher_online,
      source_link: categoryUrl,
      image: articles.some((a) => a.has_image), // Check if any article has an image
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.the_publisher_online,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

// --- Example Usage ---
if (require.main === module) {
  (async () => {
    // Example for Sports category
    try {
      console.log('Fetching Sports Articles...');
      const sportsResult = await fetchThePublisherOnlineCategory(
        'https://www.thepublisheronline.com/category/sports/',
        'Sports',
        ['sports', 'football']
      );
      console.log('--- Sports Articles ---');
      console.log(JSON.stringify(sportsResult, null, 2));
    } catch (error) {
      console.error('Failed to fetch Sports articles:', error);
      process.exit(1);
    }

    console.log('\n');

    // Example for Health Tips category
    try {
      console.log('Fetching Health Tips Articles...');
      const healthTipsResult = await fetchThePublisherOnlineCategory(
        'https://www.thepublisheronline.com/category/health-tips/',
        'Health Tips',
        ['health', 'tips']
      );
      console.log('--- Health Tips Articles ---');
      console.log(JSON.stringify(healthTipsResult, null, 2));
    } catch (error) {
      console.error('Failed to fetch Health Tips articles:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchThePublisherOnlineCategory,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
