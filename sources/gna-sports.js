const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  gna_sports: {
    id: 1166,
    name: 'Ghana News Agency',
    tags: ['sports', 'ghana', 'local', 'football', 'athletics'],
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

const fetchGNASportsArticles = async () => {
  const categoryUrl = 'https://gna.org.gh/sports/';
  const websiteName = 'gna-sports';
  const initialCategories = SOURCE_CONFIG.gna_sports.tags;
  const baseUrl = 'https://gna.org.gh';

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Articles are within 'div.col-sm-6.col-xxl-4.post-col'
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
              imageUrl = `${baseUrl}${imageUrl}`; // Ensure absolute URL
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
          publishedAt = new Date().toISOString(); // Fallback if parsing fails
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
        // Extract tags from class names like "tag-greater-accra"
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
                : initialCategories,
            tags: tagsFromClass.length > 0 ? tagsFromClass : initialCategories, // Use tags from class or initial
            has_image: !!imageUrl,
          });
        }
      });

    // For GNA, the full content is available on the main page snippet.
    // No need for detailed article fetching, so detailedArticles is just articles.
    const detailedArticles = articles;

    return {
      ...SOURCE_CONFIG.gna_sports,
      source_link: categoryUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.gna_sports,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const sportsResult = await fetchGNASportsArticles();
      console.log(JSON.stringify(sportsResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGNASportsArticles,
  cleanDescription,
  generateArticleId,
};
