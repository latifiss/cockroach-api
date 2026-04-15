const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  graphicgh_business: {
    id: 1163,
    name: 'Graphic',
    tags: ['business', 'ghana', 'economy', 'finance', 'markets', 'local'],
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

const parseGraphicBusinessDate = (dateString) => {
  // Example: "May - 24 - 2025 , 21:03"
  const months = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  };

  const parts = dateString.split(' ');
  if (parts.length >= 7) {
    const month = months[parts[0]];
    const day = parts[2].replace(',', '').padStart(2, '0');
    const year = parts[4];
    const time = parts[6].replace(',', '');

    if (month && day && year && time) {
      return new Date(`${year}-${month}-${day}T${time}:00`).toISOString();
    }
  }
  return new Date().toISOString();
};

const fetchGraphicBusinessArticles = async () => {
  const categoryUrl = 'https://www.graphic.com.gh/business/business-news.html';
  const websiteName = 'graphic-gh-business';
  const initialCategories = ['business', 'ghana', 'economy', 'finance'];
  const baseUrl = 'https://www.graphic.com.gh';

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $('div.article-list div.article').each((i, element) => {
      const article = $(element);
      const titleElement = article.find('h2 a');
      const title = titleElement.text().trim();
      const relativeLink = titleElement.attr('href');

      // Extract image URL
      const imageElement = article.find('.article-intro-image img');
      const imageUrlAttr =
        imageElement.attr('src') || imageElement.attr('data-src');
      let imageUrl = '';
      if (imageUrlAttr) {
        imageUrl = imageUrlAttr.startsWith('http')
          ? imageUrlAttr
          : `${baseUrl}${imageUrlAttr}`;
      }

      // Extract author and date
      const author =
        article.find('span.createdby span[itemprop="name"]').text().trim() ||
        'GraphicOnline';
      const dateString =
        article.find('time').text().trim() ||
        article.find('span.published').text().trim();

      if (title && relativeLink) {
        articles.push({
          article_id: generateArticleId(
            title,
            relativeLink,
            websiteName,
            parseGraphicBusinessDate(dateString)
          ),
          title,
          link: relativeLink.startsWith('http')
            ? relativeLink
            : `${baseUrl}${relativeLink}`,
          creator: [author],
          image_url: imageUrl,
          description: article
            .find('.article-introtext p')
            .first()
            .text()
            .trim(),
          published_at: parseGraphicBusinessDate(dateString),
          categories: [...initialCategories],
          has_image: !!imageUrl,
          is_featured: article.find('.featured-article-badge').length > 0,
        });
      }
    });

    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        // Extract full description from article body
        let description = '';
        const articleBody = article$('.item-page');
        if (articleBody.length) {
          description = articleBody
            .find('p')
            .map((i, el) => {
              const paragraphText = article$(el).text().trim();
              if (paragraphText.toLowerCase().includes('related stories')) {
                return null;
              }
              return paragraphText;
            })
            .get()
            .filter(Boolean)
            .join(' ');
        }

        // Extract full image if not already available
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

        // Extract additional category from URL if available
        let articleCategory = initialCategories[0] || 'general';
        const categoryMatch = article.link.match(/\/business-news\/([^\/]+)/);
        if (categoryMatch && categoryMatch[1]) {
          articleCategory = categoryMatch[1].replace(/-/g, ' ');
        }

        detailedArticles.push({
          ...article,
          description: cleanDescription(description || article.description),
          image_url: imageUrl,
          has_image: !!imageUrl,
          categories: [...new Set([...initialCategories, articleCategory])],
        });

        await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limiting
      } catch (error) {
        console.error(
          `Error fetching detailed article ${article.link}: ${error.message}`
        );
        detailedArticles.push(article);
      }
    }

    return {
      ...SOURCE_CONFIG.graphicgh_business,
      source_link: categoryUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.graphicgh_business,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const businessResult = await fetchGraphicBusinessArticles();
      console.log(JSON.stringify(businessResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGraphicBusinessArticles,
  cleanDescription,
  parseGraphicBusinessDate,
  generateArticleId,
};
