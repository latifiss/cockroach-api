const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// Define the source configuration for 3News.com Showbiz
const SOURCE_CONFIG = {
  '3news-showbiz': {
    id: 1162,
    name: '3News Showbiz',
    domain_url: '3news.com',
    source_category: 'Entertainment',
    tags: [
      'news',
      'ghana',
      'showbiz',
      'entertainment',
      'celebrities',
      'music',
      'movies',
      'arts',
    ],
    origin: 'Ghana',
    credibility: 5, // Placeholder, adjust as necessary
  },
};

/**
 * Generates a unique article ID using MD5 hash of relevant article details.
 * @param {string} title - The title of the article.
 * @param {string} link - The URL of the article.
 * @param {string} websiteName - The name of the website.
 * @param {string|null} pubDate - The publication date of the article (ISO string).
 * @returns {string} The MD5 hash as a unique article ID.
 */
const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${
    pubDate || new Date().toISOString()
  }`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

/**
 * Cleans HTML tags and extra spaces from a given description string.
 * @param {string} description - The raw description string.
 * @returns {string} The cleaned description.
 */
const cleanDescription = (description) => {
  if (!description) return '';
  return description
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .replace(/googletag\.cmd\.push\(function\(\) \{.*?\}\);?/g, '') // Remove specific ad scripts
    .replace(
      /\(adsbygoogle \= window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);/g,
      ''
    ) // Remove specific ad scripts
    .trim();
};

/**
 * Parses the publication date from a 3News.com article page or list item.
 * @param {object} $element - Cheerio instance of the element containing the time tag.
 * @returns {string} The publication date in ISO 8601 format, or current date if not found.
 */
const parse3NewsArticleDate = ($element) => {
  const datetime = $element.find('time').attr('datetime'); // Use find on the provided element
  if (datetime) {
    return new Date(datetime).toISOString();
  }
  // Fallback to current date if no specific date is found
  return new Date().toISOString();
};

/**
 * Fetches showbiz news articles from 3news.com/showbiz/.
 * This is a specialized function for the showbiz section.
 * @returns {Promise<object>} An object containing source information and a list of articles.
 */
const fetch3NewsShowbiz = async () => {
  const configKey = '3news-showbiz';
  const sourceConfig = SOURCE_CONFIG[configKey];

  const newsUrl = 'https://3news.com/showbiz/'; // Specific URL for showbiz section
  const websiteName = '3news-showbiz';

  try {
    const response = await axios.get(newsUrl, { timeout: 15000 });
    const $ = cheerio.load(response.data);

    const articles = [];
    // The main container selector for articles seems consistent across sections
    // Based on the provided HTML, articles are still within div[id^="uid_c"] .p-wrap.p-grid
    const listItems = $('div[id^="uid_c"] .p-wrap.p-grid');

    if (listItems.length === 0) {
      console.warn(
        `3News Showbiz headlines element not found. Check selectors.`
      );
      return {
        ...sourceConfig,
        source_link: newsUrl,
        articles: [],
        error: 'News headlines element not found.',
      };
    }

    console.log(
      `Found ${listItems.length} potential showbiz articles from 3News.com.`
    );

    listItems.each((i, element) => {
      const item = $(element);
      const title = item.find('h4.entry-title a.p-url').text().trim();
      const link = item.find('h4.entry-title a.p-url').attr('href');

      let imageUrl = '';
      const imgElement = item.find('.p-featured a.p-flink img.featured-img');

      if (imgElement.length) {
        const src = imgElement.attr('src') || '';
        const breeze = imgElement.attr('data-breeze') || '';
        const dataSrc = imgElement.attr('data-src') || '';

        // Prioritize actual image URLs, skipping data URIs
        imageUrl = !src.startsWith('data:')
          ? src
          : !breeze.startsWith('data:')
          ? breeze
          : !dataSrc.startsWith('data:')
          ? dataSrc
          : '';
      }

      const publishedAt = parse3NewsArticleDate(item);
      const categories = item
        .find('.p-categories .p-category')
        .map((j, el) => $(el).text().trim())
        .get();

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link,
          creator: ['3News.com'], // Assuming 3News.com is the creator
          image_url: imageUrl,
          description: '', // To be filled from detail page
          published_at: publishedAt,
          categories,
          has_image: !!imageUrl,
          time_text: '', // Not available on list view
        });
      }
    });

    const detailedArticles = [];
    const maxRetries = 3;
    const retryDelayMs = 2000;

    for (const article of articles) {
      let retries = 0;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          const articleResponse = await axios.get(article.link, {
            timeout: 10000,
          });
          const article$ = cheerio.load(articleResponse.data);

          let description =
            article$('.entry-content').text() ||
            article$('.article-content').text() ||
            article$('.post-content').text() ||
            article$('p').first().text() ||
            '';

          description = cleanDescription(description);

          // Get higher quality image from article page if available
          let fullImageUrl = article.image_url;
          if (!fullImageUrl || fullImageUrl.includes('placeholder')) {
            const articleImage =
              article$('img.wp-post-image[src*="uploads"]').first() ||
              article$('.entry-content img[src*="uploads"]').first() ||
              article$('meta[property="og:image"]').attr('content');

            if (articleImage && articleImage.length) {
              const imgSrc = articleImage.attr('src') || '';
              const imgDataSrc = articleImage.attr('data-src') || '';

              fullImageUrl = !imgSrc.startsWith('data:')
                ? imgSrc
                : !imgDataSrc.startsWith('data:')
                ? imgDataSrc
                : article.image_url;
            } else if (
              typeof articleImage === 'string' &&
              articleImage.startsWith('http')
            ) {
              fullImageUrl = articleImage;
            }
          }

          detailedArticles.push({
            ...article,
            description,
            image_url: fullImageUrl,
            has_image: !!fullImageUrl,
          });
          success = true;
        } catch (innerError) {
          retries++;
          console.error(
            `Error fetching article ${article.link}: ${innerError.message}. Retry ${retries}/${maxRetries}`
          );
          if (retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          } else {
            console.error(`Max retries reached for ${article.link}. Skipping.`);
            detailedArticles.push(article);
          }
        }
      }
      if (success) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return {
      ...sourceConfig,
      source_link: newsUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching 3News Showbiz: ${error.message}`);
    return {
      ...sourceConfig,
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      console.log('\nFetching 3News Showbiz articles...');
      const showbizResult = await fetch3NewsShowbiz();
      console.log(
        `Successfully scraped ${showbizResult.articles.length} news articles from ${showbizResult.name}.\n`
      );
      console.log(JSON.stringify(showbizResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetch3NewsShowbiz,
  cleanDescription,
  generateArticleId,
  parse3NewsArticleDate,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
