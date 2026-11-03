const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  yen_entertainment: {
    id: 1174,
    name: 'Yen',
    domain_url: 'yen.com.gh',
    source_category: 'Entertainment',
    tags: ['news', 'ghana', 'entertainment', 'celebrities', 'music', 'movies'],
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

const fetchYenEntertainmentNews = async () => {
  const baseUrl = 'https://yen.com.gh';
  const newsUrl = 'https://yen.com.gh/entertainment/';
  const websiteName = 'yen-entertainment';

  try {
    const response = await axios.get(newsUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Process featured articles
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

        const categoryElement = item.find('.article-card-info__category');
        const category = categoryElement.text().trim() || 'Entertainment';

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
          categories: [category],
          has_image: !!imageUrl,
        });
      }
    );

    // Process popular/most viewed articles
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

        const categoryElement = item.find('.article-card-info__category');
        const category = categoryElement.text().trim() || 'Entertainment';

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
          categories: [category],
          has_image: !!imageUrl,
        });
      }
    );

    // Process category sections (Style, TV Shows, Movies, etc.)
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
        const category = categoryElement.text().trim() || 'Entertainment';

        const description = title; // These cards don't have descriptions

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
      source_id: SOURCE_CONFIG.yen_entertainment.id,
      source_name: SOURCE_CONFIG.yen_entertainment.name,
      source_link: newsUrl,
      source_origin: SOURCE_CONFIG.yen_entertainment.origin,
      source_tags: SOURCE_CONFIG.yen_entertainment.tags,
      source_credibility: SOURCE_CONFIG.yen_entertainment.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(
      `Error fetching Yen.com.gh entertainment news: ${error.message}`,
      {
        url: newsUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.yen_entertainment,
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchYenEntertainmentNews();
    console.log(
      `Successfully scraped ${response.articles.length} entertainment articles\n`
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
  fetchYenEntertainmentNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
