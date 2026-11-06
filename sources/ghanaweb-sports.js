const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ghanaweb: {
    id: 1159,
    name: 'GhanaWeb',
    domain_url: 'ghanaweb.com',
    source_category: 'Sports',
    tags: ['news', 'ghana', 'sports', 'football', 'local', 'black stars'],
    origin: 'Ghana',
    credibility: 5,
  },
};

// Helper functions (same as before)
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
  const hiddenDate = $('#date').text().trim();
  if (hiddenDate) return new Date(hiddenDate).toISOString();

  const dateText = $('.floatLeft').first().text().trim();
  const dateMatch = dateText.match(/(\d{1,2} \w+ \d{4})/);
  if (dateMatch) {
    return new Date(dateMatch[0]).toISOString();
  }

  return new Date().toISOString();
};

const fetchGhanaWebSportsNews = async () => {
  const baseUrl = 'https://www.ghanaweb.com';
  const sportsUrl = 'https://www.ghanaweb.com/GhanaHomePage/SportsArchive/';
  const websiteName = 'ghanaweb-sports';

  try {
    const response = await axios.get(sportsUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);

    const headlinesList = $('ul#load_headlines.sports');
    if (headlinesList.length === 0) {
      throw new Error('Sports news headlines element not found');
    }

    const listItems = headlinesList.find('li');
    console.log(`Found ${listItems.length} sports news articles`);

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
          creator: ['GhanaWeb Sports'],
          image_url: '',
          description: '',
          published_at: '',
          categories: ['sports'],
          has_image: false,
          time_text: timeText,
        };
      })
      .get();

    const detailedArticles = articles;

    return {
      source_id: SOURCE_CONFIG.ghanaweb.id,
      source_name: SOURCE_CONFIG.ghanaweb.name,
      source_link: sportsUrl,
      source_origin: SOURCE_CONFIG.ghanaweb.origin,
      source_tags: SOURCE_CONFIG.ghanaweb.tags,
      source_credibility: SOURCE_CONFIG.ghanaweb.credibility,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching GhanaWeb sports news: ${error.message}`, {
      url: sportsUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.ghanaweb,
      source_link: sportsUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchGhanaWebSportsNews();
    console.log(
      `Successfully scraped ${response.articles.length} sports news articles\n`
    );

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
  fetchGhanaWebSportsNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
