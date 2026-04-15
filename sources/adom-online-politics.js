const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  adomonline: {
    id: 1171,
    name: 'Adom Online',
    tags: [
      'politics',
      'ghana',
      'elections',
      'government',
      'parliament',
      'political-parties',
    ],
    origin: 'Ghana',
    credibility: 5,
  },
};

// Helper functions (same as news scraper)
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

const parseArticleDate = ($, element) => {
  const dateText =
    $(element).find('.td-module-date').attr('datetime') ||
    $(element).find('.td-post-date time').attr('datetime') ||
    $(element).find('time.entry-date').attr('datetime');
  if (dateText) return new Date(dateText).toISOString();

  return new Date().toISOString();
};

const extractImageUrl = ($, element, baseUrl) => {
  // Try regular image tag first
  const imgTag = $(element).find('img').first();
  if (imgTag.length && imgTag.attr('src')) {
    let src = imgTag.attr('src');
    if (src && !src.startsWith('http')) {
      src = `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
    }
    return src;
  }

  // Try background image
  const bgElement = $(element).find('[style*="background-image"]').first();
  if (bgElement.length) {
    const style = bgElement.attr('style');
    const match = style.match(/url\(['"]?(.*?)['"]?\)/i);
    if (match && match[1]) {
      let url = match[1];
      if (url && !url.startsWith('http')) {
        url = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      }
      return url;
    }
  }

  // Try entry-thumb class
  const thumbElement = $(element).find('.entry-thumb').first();
  if (thumbElement.length && thumbElement.css('background-image')) {
    const style = thumbElement.css('background-image');
    const match = style.match(/url\(['"]?(.*?)['"]?\)/i);
    if (match && match[1]) {
      let url = match[1];
      if (url && !url.startsWith('http')) {
        url = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      }
      return url;
    }
  }

  return '';
};

const fetchAdomonlinePolitics = async () => {
  const baseUrl = 'https://www.adomonline.com';
  const politicsUrl = 'https://www.adomonline.com/category/politics/';
  const websiteName = 'adomonline-politics';

  try {
    const response = await axios.get(politicsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);

    // Same selectors as news scraper
    let articles = $('.tdb_module_loop.td_module_wrap:not(.td_module_rec)');
    if (articles.length === 0) articles = $('.td-module-container');
    if (articles.length === 0) articles = $('.td_module_wrap');
    if (articles.length === 0) articles = $('.td-block-row .td-block-span6');

    console.log(`Found ${articles.length} politics articles`);

    const detailedArticles = [];

    articles.each((i, element) => {
      try {
        const article = $(element);
        const linkElement = article.find('.td-module-title a').first();
        const title = linkElement.attr('title') || linkElement.text().trim();
        const link = linkElement.attr('href');

        if (!title || !link) return;

        // Extract image URL using same method as news scraper
        let imageUrl = '';
        const imageContainer = article
          .find('.td-image-container, .td-module-thumb, .entry-thumb')
          .first();
        if (imageContainer.length) {
          imageUrl = extractImageUrl($, imageContainer, baseUrl);
        }

        // Handle categories - may include party names in politics section
        const categoryElements = article.find(
          '.td-post-category, .entry-category a'
        );
        const categories = categoryElements
          .map((i, el) => $(el).text().trim())
          .get();

        // Handle description
        let description = article.find('.td-excerpt').text() || '';
        if (!description) {
          description =
            article.find('.td-module-meta-info p, .td-excerpt p').text() || '';
        }

        const publishedAt = parseArticleDate($, element);

        detailedArticles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title: title,
          link: link,
          creator: ['Adomonline'],
          image_url: imageUrl,
          description: cleanDescription(description),
          published_at: publishedAt,
          categories: categories.length > 0 ? categories : ['Politics'],
          has_image: !!imageUrl,
        });
      } catch (error) {
        console.error(
          `Error processing politics article ${i}: ${error.message}`
        );
      }
    });

    return {
      source_id: SOURCE_CONFIG.adomonline.id,
      source_name: SOURCE_CONFIG.adomonline.name,
      source_link: politicsUrl,
      source_origin: SOURCE_CONFIG.adomonline.origin,
      source_tags: SOURCE_CONFIG.adomonline.tags,
      source_credibility: SOURCE_CONFIG.adomonline.credibility,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching Adomonline politics: ${error.message}`, {
      url: politicsUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.adomonline,
      source_link: politicsUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchAdomonlinePolitics();
    console.log(
      `Successfully scraped ${response.articles.length} politics articles\n`
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
  fetchAdomonlinePolitics,
  cleanDescription,
};
