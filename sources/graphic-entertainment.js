const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  graphicgh_entertainment: {
    id: 1163,
    name: 'Graphic',
    domain_url: 'graphic.com.gh',
    source_category: 'Entertainment',
    tags: ['entertainment', 'ghana', 'showbiz', 'music', 'movies', 'local'],
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

const parseGraphicDate = (dateString) => {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = `20${parts[0]}`;
    const month = parts[1];
    const day = parts[2];
    if (year.length === 4 && month.length === 2 && day.length === 2) {
      return new Date(`${year}-${month}-${day}`).toISOString();
    }
  }
  return new Date().toISOString();
};

const fetchGraphicEntertainmentArticles = async () => {
  const categoryUrl = 'https://www.graphic.com.gh/entertainment.html';
  const websiteName = 'graphic-gh-entertainment';
  const initialCategories = [
    'entertainment',
    'ghana',
    'showbiz',
    'music',
    'movies',
  ];
  const baseUrl = 'https://www.graphic.com.gh';

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $('div.row.row-cols-1.row-cols-md-2.row-cols-lg-3.g-4 div.col').each(
      (i, element) => {
        const articleCard = $(element);
        const titleElement = articleCard.find('h3.card-title a');
        const title = titleElement.text().trim();
        const relativeLink = titleElement.attr('href');
        const imageUrlAttr =
          articleCard.find('.card-img-top').attr('src') ||
          articleCard.find('.card-img-top').attr('data-src');

        let imageUrl = '';
        if (imageUrlAttr) {
          imageUrl = imageUrlAttr.startsWith('http')
            ? imageUrlAttr
            : `${baseUrl}${imageUrlAttr}`;
        }

        if (title && relativeLink) {
          articles.push({
            article_id: generateArticleId(
              title,
              relativeLink,
              websiteName,
              null
            ),
            title,
            link: relativeLink.startsWith('http')
              ? relativeLink
              : `${baseUrl}${relativeLink}`,
            creator: ['Graphic Online'],
            image_url: imageUrl,
            description: '',
            published_at: new Date().toISOString(),
            categories: [...initialCategories],
            has_image: !!imageUrl,
          });
        }
      }
    );

    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        let description = '';
        const articleBody = article$('.item-page');
        if (articleBody.length) {
          description = articleBody
            .find('p')
            .map((i, el) => {
              const paragraphText = $(el).text().trim();
              if (paragraphText.toLowerCase().includes('related stories')) {
                return null;
              }
              return paragraphText;
            })
            .get()
            .filter(Boolean)
            .join(' ');
        }

        let imageUrl = article.image_url;
        if (!imageUrl) {
          const featuredImage = article$('.article-full-image img').first();
          if (featuredImage.length) {
            imageUrl =
              featuredImage.attr('src') || featuredImage.attr('data-src') || '';
          } else {
            const articleImage = article$('.item-page img').first();
            if (articleImage.length) {
              imageUrl =
                articleImage.attr('src') || articleImage.attr('data-src') || '';
            }
          }

          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${baseUrl}${imageUrl}`;
          }
        }

        let articleCategory = initialCategories[0] || 'general';
        const categoryMatch = article.link.match(/\/entertainment\/([^\/]+)/);
        if (categoryMatch && categoryMatch[1]) {
          articleCategory = categoryMatch[1].replace(/-/g, ' ');
        }

        detailedArticles.push({
          ...article,
          description: cleanDescription(description),
          image_url: imageUrl,
          has_image: !!imageUrl,
          categories: [...new Set([...initialCategories, articleCategory])],
          article_id: generateArticleId(
            article.title,
            article.link,
            websiteName,
            article.published_at
          ),
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `Error fetching detailed article ${article.link}: ${error.message}`
        );
        detailedArticles.push(article);
      }
    }

    return {
      ...SOURCE_CONFIG.graphicgh_entertainment,
      source_link: categoryUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.graphicgh_entertainment,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const entertainmentResult = await fetchGraphicEntertainmentArticles();
      console.log(JSON.stringify(entertainmentResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGraphicEntertainmentArticles,
  cleanDescription,
  parseGraphicDate,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
