const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  gna_social: {
    id: 1166,
    name: 'Ghana News Agency - Social',
    domain_url: 'gna.org.gh',
    source_category: 'Africa',
    tags: ['social', 'ghana', 'community', 'society', 'local'],
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

const fetchGNASocialArticles = async () => {
  const categoryUrl = 'https://gna.org.gh/social/';
  const websiteName = 'gna-social';
  const initialTags = SOURCE_CONFIG.gna_social.tags;
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
        const bgStyle = article
          .find('figure.post-featured-image a.post-img')
          .css('background-image');
        if (bgStyle) {
          const match = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
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
        } catch {
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
              categoriesFromPage.length > 0 ? categoriesFromPage : ['social'],
            tags: tagsFromClass.length > 0 ? tagsFromClass : initialTags,
            has_image: !!imageUrl,
          });
        }
      });

    return {
      ...SOURCE_CONFIG.gna_social,
      source_link: categoryUrl,
      image: articles.some((article) => article.has_image),
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.gna_social,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const socialResult = await fetchGNASocialArticles();
      console.log(JSON.stringify(socialResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGNASocialArticles,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
