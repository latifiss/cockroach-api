const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ghanaweb: {
    id: 1159,
    name: 'GhanaWeb',
    domain_url: 'ghanaweb.com',
    source_category: 'Business & Finance',
    tags: ['news', 'ghana', 'business', 'local', 'finance', 'markets'],
    origin: 'Ghana',
    credibility: 5,
  },
};

// Helper functions
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

const parseArticleDate = ($) => {
  // Try to get date from hidden element first
  const hiddenDate = $('#date').text().trim();
  if (hiddenDate) return new Date(hiddenDate).toISOString();

  // Fallback to the visible date text
  const dateText = $('.floatLeft').first().text().trim();
  const dateMatch = dateText.match(/(\d{1,2} \w+ \d{4})/);
  if (dateMatch) {
    return new Date(dateMatch[0]).toISOString();
  }

  return new Date().toISOString();
};

const fetchGhanaWebBusinessNews = async () => {
  const baseUrl = 'https://www.ghanaweb.com';
  const businessUrl = 'https://www.ghanaweb.com/GhanaHomePage/business/';
  const websiteName = 'ghanaweb-business';

  try {
    // Fetch the business page
    const response = await axios.get(businessUrl);
    const $ = cheerio.load(response.data);

    // Extract ALL business news headlines
    const headlinesList = $('ul#load_headlines.business');
    if (headlinesList.length === 0) {
      throw new Error('Business news headlines element not found');
    }

    // Get ALL list items
    const listItems = headlinesList.find('li');
    console.log(`Found ${listItems.length} business news articles`);

    const articles = listItems
      .map((i, element) => {
        const item = $(element);
        const linkElement = item.find('a').first();
        const title =
          linkElement.attr('title') || linkElement.find('p').text().trim();
        const relativeLink = linkElement.attr('href');
        const link = relativeLink.startsWith('http')
          ? relativeLink
          : `${baseUrl}${relativeLink}`;
        const timeText = item.find('.time').text().trim();

        return {
          article_id: generateArticleId(title, link, websiteName, null),
          title: title,
          link: link,
          creator: ['GhanaWeb Business'],
          image_url: '', // Will be populated when we scrape individual articles
          description: '', // Will be populated when we scrape individual articles
          published_at: '', // Will be populated from article page
          categories: ['business'],
          has_image: false,
          time_text: timeText, // Keeping original time text for reference
        };
      })
      .get();

    // Now scrape details for ALL articles (with rate limiting)
    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        // Extract description from article content
        const description = article$('.article-content-area').text() || '';

        // Extract image from article page
        let imageUrl = '';
        const leadImage = article$('.article-image img').first();
        if (leadImage.length) {
          imageUrl = leadImage.attr('src') || '';
          // Ensure full URL if it's relative
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${baseUrl}${imageUrl}`;
          }
        }

        // Extract proper publication date
        const publishedAt = parseArticleDate(article$);

        // Update article with details
        detailedArticles.push({
          ...article,
          description: cleanDescription(description),
          image_url: imageUrl,
          published_at: publishedAt,
          has_image: !!imageUrl,
        });

        // Small delay between requests to be polite
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (innerError) {
        console.error(
          `Error fetching article details for ${article.link}: ${innerError.message}`
        );
        // Push article without details if there's an error
        detailedArticles.push(article);
      }
    }

    return {
      source_id: SOURCE_CONFIG.ghanaweb.id,
      source_name: SOURCE_CONFIG.ghanaweb.name,
      source_link: businessUrl,
      source_origin: SOURCE_CONFIG.ghanaweb.origin,
      source_tags: SOURCE_CONFIG.ghanaweb.tags,
      source_credibility: SOURCE_CONFIG.ghanaweb.credibility,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching GhanaWeb business news: ${error.message}`, {
      url: businessUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.ghanaweb,
      source_link: businessUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchGhanaWebBusinessNews();
    console.log(
      `Successfully scraped ${response.articles.length} business news articles\n`
    );

    // Display all articles in the requested JSON format
    console.log('[');
    response.articles.forEach((article, index) => {
      const articleJson = {
        article_id: article.article_id,
        title: article.title,
        link: article.link,
        creator: article.creator,
        image_url: article.image_url,
        description: article.description,
        published_at: article.published_at,
        categories: article.categories,
        has_image: article.has_image,
      };

      console.log(
        JSON.stringify(articleJson, null, 2) +
          (index < response.articles.length - 1 ? ',' : '')
      );
    });
    console.log(']');
  } catch (error) {
    console.error('Main execution failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  fetchGhanaWebBusinessNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
