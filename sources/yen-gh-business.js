const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  yen_ghana_business: {
    id: 1174,
    name: 'Yen',
    domain_url: 'yen.com.gh',
    source_category: 'Business & Finance',
    tags: [
      'news',
      'ghana',
      'business',
      'economy',
      'finance',
      'markets',
      'banking',
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
  return new Date(dateString).toISOString();
};

const fetchYenGhanaBusinessNews = async () => {
  const baseUrl = 'https://yen.com.gh';
  const businessUrl = 'https://yen.com.gh/business-economy/';
  const websiteName = 'yen-ghana-business';

  try {
    const response = await axios.get(businessUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Process featured business articles
    $('.l-taxonomy-page-hero__list .c-article-card-no-border').each(
      (i, element) => {
        const item = $(element);
        const titleElement = item.find('.c-article-card-no-border__headline');
        const title = titleElement.text().trim();
        const link = titleElement.attr('href');

        const imageElement = item.find('.thumbnail-picture__img');
        const imageUrl =
          imageElement.attr('src') ||
          imageElement.attr('data-src') ||
          (imageElement.attr('srcset')
            ? imageElement.attr('srcset').split(' ')[0]
            : '');

        const description = item.find('.td-excerpt').text().trim() || title;

        const authorElement = item.find('.article-card-info__author');
        const author =
          authorElement.text().trim().replace('by', '').trim() || 'Yen.com.gh';

        const dateElement = item.find('.article-card-info__time');
        const date = dateElement.attr('datetime') || dateElement.text().trim();

        articles.push({
          article_id: generateArticleId(title, link, websiteName, date),
          title: title,
          link: link.startsWith('http') ? link : `${baseUrl}${link}`,
          creator: [author],
          image_url: imageUrl,
          description: cleanDescription(description),
          published_at: parseArticleDate(date),
          categories: ['Business & Economy'],
          has_image: !!imageUrl,
        });
      }
    );

    // Process main business articles
    $('.l-card-collection-section .c-article-card').each((i, element) => {
      const item = $(element);
      const titleElement = item.find('.c-article-card__headline');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');

      const imageElement = item.find('.thumbnail-picture__img');
      const imageUrl =
        imageElement.attr('src') ||
        imageElement.attr('data-src') ||
        (imageElement.attr('srcset')
          ? imageElement.attr('srcset').split(' ')[0]
          : '');

      const description =
        item.find('.c-article-card__description').text().trim() || title;

      const authorElement = item.find('.article-card-info__author');
      const author =
        authorElement.text().trim().replace('by', '').trim() || 'Yen.com.gh';

      const dateElement = item.find('.article-card-info__time');
      const date = dateElement.attr('datetime') || dateElement.text().trim();

      articles.push({
        article_id: generateArticleId(title, link, websiteName, date),
        title: title,
        link: link.startsWith('http') ? link : `${baseUrl}${link}`,
        creator: [author],
        image_url: imageUrl,
        description: cleanDescription(description),
        published_at: parseArticleDate(date),
        categories: ['Business & Economy'],
        has_image: !!imageUrl,
      });
    });

    // Process trending business articles
    $('.top-articles-popular__article, .top-articles-highlighted').each(
      (i, element) => {
        const item = $(element);
        const titleElement = item.find('a[class*="headline"]');
        const title = titleElement.text().trim();
        const link = titleElement.attr('href');

        const imageElement = item.find('.thumbnail-picture__img');
        const imageUrl =
          imageElement.attr('src') ||
          imageElement.attr('data-src') ||
          (imageElement.attr('srcset')
            ? imageElement.attr('srcset').split(' ')[0]
            : '');

        const description =
          item
            .find('[class*="description"], [class*="excerpt"]')
            .text()
            .trim() || title;

        const authorElement = item.find('.article-card-info__author');
        const author =
          authorElement.text().trim().replace('by', '').trim() || 'Yen.com.gh';

        const dateElement = item.find('.article-card-info__time');
        const date = dateElement.attr('datetime') || dateElement.text().trim();

        articles.push({
          article_id: generateArticleId(title, link, websiteName, date),
          title: title,
          link: link.startsWith('http') ? link : `${baseUrl}${link}`,
          creator: [author],
          image_url: imageUrl,
          description: cleanDescription(description),
          published_at: parseArticleDate(date),
          categories: ['Business & Economy'],
          has_image: !!imageUrl,
        });
      }
    );

    // Process additional business news sections (Banking, Markets, etc.)
    $('.l-card-collection-section .c-article-card-no-border').each(
      (i, element) => {
        const item = $(element);
        const titleElement = item.find('.c-article-card-no-border__headline');
        const title = titleElement.text().trim();
        const link = titleElement.attr('href');

        const imageElement = item.find('.thumbnail-picture__img');
        const imageUrl =
          imageElement.attr('src') ||
          imageElement.attr('data-src') ||
          (imageElement.attr('srcset')
            ? imageElement.attr('srcset').split(' ')[0]
            : '');

        const categoryElement = item
          .closest('.l-card-collection-section')
          .find('.c-section-headline__text');
        const category = categoryElement.text().trim() || 'Business & Economy';

        const description = title; // These cards often don't have separate descriptions

        const authorElement = item.find('.article-card-info__author');
        const author =
          authorElement.text().trim().replace('by', '').trim() || 'Yen.com.gh';

        const dateElement = item.find('.article-card-info__time');
        const date = dateElement.attr('datetime') || dateElement.text().trim();

        articles.push({
          article_id: generateArticleId(title, link, websiteName, date),
          title: title,
          link: link.startsWith('http') ? link : `${baseUrl}${link}`,
          creator: [author],
          image_url: imageUrl,
          description: cleanDescription(description),
          published_at: parseArticleDate(date),
          categories: [category],
          has_image: !!imageUrl,
        });
      }
    );

    return {
      source_id: SOURCE_CONFIG.yen_ghana_business.id,
      source_name: SOURCE_CONFIG.yen_ghana_business.name,
      source_link: businessUrl,
      source_origin: SOURCE_CONFIG.yen_ghana_business.origin,
      source_tags: SOURCE_CONFIG.yen_ghana_business.tags,
      source_credibility: SOURCE_CONFIG.yen_ghana_business.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(`Error fetching Yen.com.gh Business news: ${error.message}`, {
      url: businessUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.yen_ghana_business,
      source_link: businessUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchYenGhanaBusinessNews();
    console.log(
      `Successfully scraped ${response.articles.length} Business & Economy news articles\n`
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
  fetchYenGhanaBusinessNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
