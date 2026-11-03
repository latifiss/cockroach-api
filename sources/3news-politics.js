const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  '3news-politics': {
    id: 1162,
    name: '3News',
    domain_url: '3news.com',
    source_category: 'Politics',
    tags: ['news', 'ghana', 'politics', 'local'],
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
    .replace(/googletag\.cmd\.push\(function\(\) \{.*?\}\);?/g, '')
    .replace(
      /\(adsbygoogle \= window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);/g,
      ''
    )
    .trim();
};

const parse3NewsArticleDate = ($element) => {
  const datetime = $element.find('time').attr('datetime');
  if (datetime) {
    return new Date(datetime).toISOString();
  }
  return new Date().toISOString();
};

const fetch3NewsPolitics = async () => {
  const baseUrl = 'https://3news.com';
  const newsUrl = 'https://3news.com/news/politics/';
  const websiteName = '3news-politics';

  try {
    const response = await axios.get(newsUrl, { timeout: 15000 });
    const $ = cheerio.load(response.data);

    const articles = [];
    const listItems = $('div[id^="uid_c"] .p-wrap.p-grid');

    if (listItems.length === 0) {
      console.warn(
        '3News Politics headlines element not found. Check selectors.'
      );
      return {
        ...SOURCE_CONFIG['3news-politics'],
        source_link: newsUrl,
        articles: [],
        error: 'News headlines element not found.',
      };
    }

    console.log(
      `Found ${listItems.length} potential politics articles from 3News.com.`
    );

    listItems.each((i, element) => {
      const item = $(element);
      const title = item.find('h4.entry-title a.p-url').text().trim();
      const link = item.find('h4.entry-title a.p-url').attr('href');

      // Extract image URL - prioritize actual image files
      let imageUrl = '';
      const imgElement = item.find('.p-featured a.p-flink img.featured-img');

      if (imgElement.length) {
        // Try src first, then data-breeze, skip data URIs
        const src = imgElement.attr('src') || '';
        const breeze = imgElement.attr('data-breeze') || '';

        imageUrl = !src.startsWith('data:')
          ? src
          : !breeze.startsWith('data:')
          ? breeze
          : '';
      }

      const publishedAt = parse3NewsArticleDate(item);
      const categories = item
        .find('.p-categories .p-category')
        .map((j, el) => $(el).text().trim())
        .get();

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link,
          creator: ['3News.com'],
          image_url: imageUrl,
          description: '',
          published_at: publishedAt,
          categories,
          has_image: !!imageUrl,
          time_text: '',
        });
      }
    });

    const detailedArticles = [];
    const maxRetries = 3;
    const retryDelayMs = 2000;

    for (const article of articles) {
      let retries = 0;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          const articleResponse = await axios.get(article.link, {
            timeout: 10000,
          });
          const article$ = cheerio.load(articleResponse.data);

          // Get description from multiple possible locations
          let description =
            article$('.entry-content').text() ||
            article$('.article-content').text() ||
            article$('.post-content').text() ||
            article$('p').first().text() ||
            '';

          description = cleanDescription(description);

          // Get higher quality image from article page if available
          let fullImageUrl = article.image_url;
          if (!fullImageUrl || fullImageUrl.includes('placeholder')) {
            const articleImage =
              article$('img.wp-post-image[src*="uploads"]').first() ||
              article$('.entry-content img[src*="uploads"]').first();

            if (articleImage.length) {
              const imgSrc = articleImage.attr('src') || '';
              const imgDataSrc = articleImage.attr('data-src') || '';

              fullImageUrl = !imgSrc.startsWith('data:')
                ? imgSrc
                : !imgDataSrc.startsWith('data:')
                ? imgDataSrc
                : article.image_url;
            }
          }

          detailedArticles.push({
            ...article,
            description,
            image_url: fullImageUrl,
            has_image: !!fullImageUrl,
          });
          success = true;
        } catch (innerError) {
          retries++;
          console.error(
            `Error fetching article ${article.link}: ${innerError.message}. Retry ${retries}/${maxRetries}`
          );
          if (retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          } else {
            console.error(`Max retries reached for ${article.link}. Skipping.`);
            detailedArticles.push(article);
          }
        }
      }
      if (success) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return {
      ...SOURCE_CONFIG['3news-politics'],
      source_link: newsUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching 3News Politics: ${error.message}`);
    return {
      ...SOURCE_CONFIG['3news-politics'],
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

// Example usage
if (require.main === module) {
  (async () => {
    try {
      const result = await fetch3NewsPolitics();
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetch3NewsPolitics,
  cleanDescription,
  generateArticleId,
  parse3NewsArticleDate,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
