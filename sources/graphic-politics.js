const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  graphicgh_politics: {
    id: 1163,
    name: 'Graphic',
    tags: [
      'politics',
      'ghana',
      'government',
      'elections',
      'parliament',
      'local',
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

const fetchGraphicPoliticsArticles = async () => {
  const categoryUrl = 'https://www.graphic.com.gh/news/politics.html';
  const websiteName = 'graphic-gh-politics';
  const initialCategories = ['politics', 'ghana', 'government', 'elections'];
  const baseUrl = 'https://www.graphic.com.gh';

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Extract articles from the table
    $('table.category tbody tr').each((i, element) => {
      const row = $(element);
      const titleElement = row.find('td.list-title a');
      const title = titleElement.text().trim();
      const relativeLink = titleElement.attr('href');
      const dateString = row.find('td.list-date').text().trim();

      if (title && relativeLink) {
        articles.push({
          article_id: generateArticleId(
            title,
            relativeLink,
            websiteName,
            parseGraphicDate(dateString)
          ),
          title,
          link: relativeLink.startsWith('http')
            ? relativeLink
            : `${baseUrl}${relativeLink}`,
          creator: ['Graphic Online'],
          image_url: '', // Will be populated in detailed fetch
          description: '', // Will be populated in detailed fetch
          published_at: parseGraphicDate(dateString),
          categories: [...initialCategories],
          has_image: false, // Will be updated in detailed fetch
        });
      }
    });

    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        // Extract description from article body
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

        // Extract image
        let imageUrl = '';
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

        // Extract category from URL
        let articleCategory = initialCategories[0] || 'general';
        const categoryMatch = article.link.match(/\/politics\/([^\/]+)/);
        if (categoryMatch && categoryMatch[1]) {
          articleCategory = categoryMatch[1].replace(/-/g, ' ');
        }

        detailedArticles.push({
          ...article,
          description: cleanDescription(description),
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
      ...SOURCE_CONFIG.graphicgh_politics,
      source_link: categoryUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.graphicgh_politics,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const politicsResult = await fetchGraphicPoliticsArticles();
      console.log(JSON.stringify(politicsResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGraphicPoliticsArticles,
  cleanDescription,
  parseGraphicDate,
  generateArticleId,
};
