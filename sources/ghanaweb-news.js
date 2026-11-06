const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ghanaweb: {
    id: 1159,
    name: 'GhanaWeb',
    domain_url: 'ghanaweb.com',
    source_category: 'Local',
    tags: ['news', 'ghana', 'politics', 'local', 'regional'],
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

const fetchGhanaWebGeneralNews = async () => {
  const baseUrl = 'https://www.ghanaweb.com';
  const newsUrl = 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/';
  const websiteName = 'ghanaweb-news';

  try {
    const response = await axios.get(newsUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);

    const headlinesList = $('ul#load_headlines');
    if (headlinesList.length === 0) {
      throw new Error('News headlines element not found');
    }

    const listItems = headlinesList.find('li');
    console.log(`Found ${listItems.length} news articles`);

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

        // Extract category from URL path
        const categoryMatch = relativeLink.match(/\/GhanaHomePage\/([^\/]+)/);
        const category = categoryMatch
          ? categoryMatch[1].replace(/-/g, ' ')
          : 'general';

        return {
          article_id: generateArticleId(title, link, websiteName, null),
          title: title,
          link: link,
          creator: ['GhanaWeb News'],
          image_url: '',
          description: '',
          published_at: '',
          categories: [category],
          has_image: false,
          time_text: timeText,
        };
      })
      .get();

    const detailedArticles = articles;

    return {
      source_id: SOURCE_CONFIG.ghanaweb.id,
      source_name: SOURCE_CONFIG.ghanaweb.name,
      source_link: newsUrl,
      source_origin: SOURCE_CONFIG.ghanaweb.origin,
      source_tags: SOURCE_CONFIG.ghanaweb.tags,
      source_credibility: SOURCE_CONFIG.ghanaweb.credibility,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching GhanaWeb general news: ${error.message}`, {
      url: newsUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.ghanaweb,
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchGhanaWebGeneralNews();
    console.log(
      `Successfully scraped ${response.articles.length} news articles\n`
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
  fetchGhanaWebGeneralNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
