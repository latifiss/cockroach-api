const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  businessghana_sports: {
    id: 1172,
    name: 'Business Ghana',
    domain_url: 'businessghana.com',
    source_category: 'Business & Finance',
    tags: ['news', 'ghana', 'tech', 'technology'],
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

const parseArticleDate = (timeText) => {
  if (!timeText) return new Date().toISOString();
  const relativeMatch = timeText.match(/(\d+)([hmd])/);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];
    const now = new Date();
    if (unit === 'h') now.setHours(now.getHours() - value);
    else if (unit === 'm') now.setMinutes(now.getMinutes() - value);
    else if (unit === 'd') now.setDate(now.getDate() - value);
    return now.toISOString();
  }
  return new Date().toISOString();
};

const fetchBusinessGhanaTechNews = async () => {
  const baseUrl = 'https://www.businessghana.com';
  const newsUrl = 'https://www.businessghana.com/site/news/technology';
  const websiteName = 'businessghana-tech';

  try {
    const response = await axios.get(newsUrl);
    const $ = cheerio.load(response.data);

    const articles = [];
    $('.premium-item.news-premium-item-holder').each((i, element) => {
      const item = $(element);
      const linkElement = item.find('.home-link2 a').first();
      const title = linkElement.text().trim();
      const relativeLink = linkElement.attr('href');
      const link = relativeLink
        ? relativeLink.startsWith('http')
          ? relativeLink
          : `${baseUrl}${relativeLink}`
        : '';

      const timeText = item
        .find('.tags')
        .text()
        .trim()
        .replace('ago', '')
        .trim();

      let imageUrl = '';
      const imageElement = item.find('.featured-image img').first();
      if (imageElement.length) {
        const src = imageElement.attr('src');
        if (src) {
          imageUrl = src.startsWith('http') ? src : `${baseUrl}${src}`;
        }
      }

      if (link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, null),
          title: title,
          link: link,
          creator: ['BusinessGhana Sports'],
          image_url: imageUrl,
          description: '',
          published_at: parseArticleDate(timeText),
          categories: ['sports'],
          has_image: !!imageUrl,
          time_text: timeText,
        });
      }
    });

    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        let description = '';
        const contentElement = article$('.article-content');
        if (contentElement.length) {
          description = contentElement.text().trim();
        }

        detailedArticles.push({
          ...article,
          description: cleanDescription(description),
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (innerError) {
        console.error(
          `Error fetching article details for ${article.link}: ${innerError.message}`
        );
        detailedArticles.push(article);
      }
    }

    return {
      source_id: SOURCE_CONFIG.businessghana_sports.id,
      source_name: SOURCE_CONFIG.businessghana_sports.name,
      source_link: newsUrl,
      source_origin: SOURCE_CONFIG.businessghana_sports.origin,
      source_tags: SOURCE_CONFIG.businessghana_sports.tags,
      source_credibility: SOURCE_CONFIG.businessghana_sports.credibility,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(
      `Error fetching BusinessGhana sports news: ${error.message}`,
      {
        url: newsUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.businessghana_sports,
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchBusinessGhanaTechNews();
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
  fetchBusinessGhanaTechNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
