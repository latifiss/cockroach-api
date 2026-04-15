const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  newsghana_auto: {
    id: 1173,
    name: 'News Ghana',
    tags: ['news', 'ghana', 'auto', 'cars', 'vehicles', 'motoring'],
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

const fetchNewsGhanaAutoNews = async () => {
  const baseUrl = 'https://www.newsghana.com.gh';
  const newsUrl = 'https://www.newsghana.com.gh/auto/';
  const websiteName = 'newsghana-auto';

  try {
    const response = await axios.get(newsUrl);
    const $ = cheerio.load(response.data);

    const articlesContainer = $('#tdi_74');
    if (articlesContainer.length === 0) {
      throw new Error('Auto news container not found');
    }

    const articles = articlesContainer
      .find('.tdb_module_loop')
      .map((i, element) => {
        const item = $(element);
        const titleElement = item.find('.entry-title a');
        const title = titleElement.attr('title') || titleElement.text().trim();
        const link = titleElement.attr('href');

        const imageElement = item.find('.td-module-thumb .td-image-wrap span');
        let imageUrl =
          imageElement.attr('data-img-url') ||
          (imageElement.attr('style')
            ? imageElement.attr('style').match(/url\(["']?(.*?)["']?\)/)[1]
            : '');

        const categoryElement = item.find('.td-post-category');
        const category = categoryElement.text().trim() || 'Auto';

        const description = item.find('.td-excerpt').text().trim();

        const authorElement = item.find('.td-post-author-name a');
        const author = authorElement.text().trim();
        const dateElement = item.find('.td-module-date');
        const date = dateElement.attr('datetime') || dateElement.text().trim();

        // Additional auto-specific fields
        const makeModelElement = item.find('.td-make-model'); // Example selector
        const priceElement = item.find('.td-price'); // Example selector

        return {
          article_id: generateArticleId(title, link, websiteName, date),
          title: title,
          link: link,
          creator: [author || 'News Ghana'],
          image_url: imageUrl,
          description: cleanDescription(description),
          published_at: parseArticleDate(date),
          categories: [category],
          has_image: !!imageUrl,
          // Auto-specific fields
          make_model: makeModelElement ? makeModelElement.text().trim() : null,
          price: priceElement ? priceElement.text().trim() : null,
        };
      })
      .get();

    return {
      source_id: SOURCE_CONFIG.newsghana_auto.id,
      source_name: SOURCE_CONFIG.newsghana_auto.name,
      source_link: newsUrl,
      source_origin: SOURCE_CONFIG.newsghana_auto.origin,
      source_tags: SOURCE_CONFIG.newsghana_auto.tags,
      source_credibility: SOURCE_CONFIG.newsghana_auto.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(`Error fetching NewsGhana auto news: ${error.message}`, {
      url: newsUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.newsghana_auto,
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchNewsGhanaAutoNews();
    console.log(
      `Successfully scraped ${response.articles.length} auto articles\n`
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
        make_model: article.make_model,
        price: article.price,
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
  fetchNewsGhanaAutoNews,
  cleanDescription,
};
