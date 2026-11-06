const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  gna_entertainment: {
    id: 1166,
    name: 'Ghana News Agency - Entertainment',
    domain_url: 'gna.org.gh',
    source_category: 'Entertainment',
    tags: ['entertainment', 'ghana', 'music', 'local', 'celebrities'],
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

const fetchGNAEntertainmentArticles = async () => {
  const categoryUrl = 'https://gna.org.gh/entertainment/';
  const websiteName = 'gna-entertainment';
  const initialCategories = SOURCE_CONFIG.gna_entertainment.tags;
  const baseUrl = 'https://gna.org.gh';

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $('div.row.gutter-parent-14.post-wrap')
      .find('div[class*="post-"][class*="type-post"]')
      .each((i, element) => {
        const article = $(element);

        const titleElement = article.find('h2.entry-title a');
        const title = titleElement.text().trim();
        const link = titleElement.attr('href');

        let imageUrl = '';
        const backgroundImageStyle = article
          .find('figure.post-featured-image a.post-img')
          .css('background-image');
        if (backgroundImageStyle) {
          const match = backgroundImageStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (match && match[1]) {
            imageUrl = match[1];
            if (!imageUrl.startsWith('http')) {
              imageUrl = `${baseUrl}${imageUrl}`;
            }
          }
        }

        const publishedAtText = article
          .find('.entry-meta .date a')
          .text()
          .trim();
        let publishedAt = '';
        try {
          publishedAt = new Date(publishedAtText).toISOString();
        } catch (e) {
          publishedAt = new Date().toISOString();
        }

        const author = article.find('.entry-meta .by-author a').text().trim();
        const descriptionSnippet = article
          .find('.entry-content p')
          .text()
          .trim();

        const categoriesFromPage = [];
        article
          .find('.entry-meta.category-meta .cat-links a')
          .each((j, catEl) => {
            categoriesFromPage.push($(catEl).text().trim().toLowerCase());
          });

        const tagsFromClass = [];
        const classList = article.attr('class');
        if (classList) {
          const tagMatches = classList.match(/tag-([^ ]+)/g);
          if (tagMatches) {
            tagMatches.forEach((tag) => {
              tagsFromClass.push(
                tag.replace('tag-', '').replace(/-/g, ' ').trim()
              );
            });
          }
        }

        if (title && link) {
          articles.push({
            article_id: generateArticleId(
              title,
              link,
              websiteName,
              publishedAt
            ),
            title,
            link,
            creator: author ? [author] : ['GNA'],
            image_url: imageUrl,
            description: cleanDescription(descriptionSnippet),
            published_at: publishedAt,
            categories:
              categoriesFromPage.length > 0
                ? categoriesFromPage
                : ['entertainment'],
            tags: tagsFromClass.length > 0 ? tagsFromClass : initialCategories,
            has_image: !!imageUrl,
          });
        }
      });

    const detailedArticles = articles;

    return {
      ...SOURCE_CONFIG.gna_entertainment,
      source_link: categoryUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.gna_entertainment,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const entertainmentResult = await fetchGNAEntertainmentArticles();
      console.log(JSON.stringify(entertainmentResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGNAEntertainmentArticles,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
