const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  daily_guide_business: {
    id: 1175,
    name: 'Daily Guide Network',
    domain_url: 'dailyguidenetwork.com',
    source_category: 'Business & Finance',
    tags: [
      'news',
      'ghana',
      'business',
      'finance',
      'economy',
      'banking',
      'markets',
    ],
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

const parseArticleDate = (dateString) => {
  if (!dateString) return new Date().toISOString();

  // Extract date from text if it's in format like "June 5, 2025"
  const extractedDate = dateString.match(/([A-Za-z]+ \d{1,2}, \d{4})/);
  if (extractedDate) {
    return new Date(extractedDate[0]).toISOString();
  }

  return new Date(dateString).toISOString();
};

const extractImageUrl = (styleAttribute) => {
  if (!styleAttribute) return '';
  const match = styleAttribute.match(/url\((.*?)\)/);
  return match ? match[1].replace(/['"]/g, '') : '';
};

const fetchDailyGuideBusinessNews = async () => {
  const baseUrl = 'https://dailyguidenetwork.com';
  const businessUrl = 'https://dailyguidenetwork.com/category/business-news/';
  const websiteName = 'daily-guide-business';

  try {
    const response = await axios.get(businessUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Process all articles in the default layout
    $('.row.default-layout article.post-wrap').each((i, element) => {
      const item = $(element);

      // Extract title and link
      const titleElement = item.find('.title.h3 a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');

      // Extract image URL from the style attribute
      const imageContainer = item.find('.image-container');
      const imageStyle = imageContainer.attr('style');
      const imageUrl = extractImageUrl(imageStyle);

      // Extract description (first paragraph before "Read More")
      const description =
        item.find('.post-entry p').first().text().trim() || title;

      // Extract date - first try the link text, then the date element
      const dateElement = item.find('.date a');
      let date = dateElement.text().trim();
      if (!date) {
        date = item.find('.date').text().trim();
      }

      // Extract categories
      const categories = [];
      item.find('.post-categories a').each((i, catElement) => {
        categories.push($(catElement).text().trim());
      });

      // Extract tags from the article's class list
      const articleClasses = item.attr('class') || '';
      const tags = [];
      if (articleClasses.includes('tag-')) {
        articleClasses.split(' ').forEach((className) => {
          if (className.startsWith('tag-')) {
            tags.push(className.replace('tag-', '').replace(/-/g, ' '));
          }
        });
      }

      articles.push({
        article_id: generateArticleId(title, link, websiteName, date),
        title: title,
        link: link.startsWith('http') ? link : `${baseUrl}${link}`,
        creator: ['Daily Guide Network'], // Default, can be overridden if author is found
        image_url: imageUrl,
        description: cleanDescription(description),
        published_at: parseArticleDate(date),
        categories: categories.length ? categories : ['Business'],
        tags: tags,
        has_image: !!imageUrl,
        source_section: 'Business News',
      });
    });

    return {
      source_id: SOURCE_CONFIG.daily_guide_business.id,
      source_name: SOURCE_CONFIG.daily_guide_business.name,
      source_link: businessUrl,
      source_origin: SOURCE_CONFIG.daily_guide_business.origin,
      source_tags: SOURCE_CONFIG.daily_guide_business.tags,
      source_credibility: SOURCE_CONFIG.daily_guide_business.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(
      `Error fetching Daily Guide Network Business news: ${error.message}`,
      {
        url: businessUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.daily_guide_business,
      source_link: businessUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchDailyGuideBusinessNews();
    console.log(
      `Successfully scraped ${response.articles.length} Business news articles\n`
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
        tags: article.tags,
        has_image: article.has_image,
        source_section: article.source_section,
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
  fetchDailyGuideBusinessNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
