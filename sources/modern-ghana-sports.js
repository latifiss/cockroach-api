const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  modernghana_sports: {
    id: 1168,
    name: 'ModernGhana Sports',
    domain_url: 'modernghana.com',
    source_category: 'Sports',
    tags: ['ghana', 'sports', 'football', 'basketball', 'tennis'],
    origin: 'Ghana',
    credibility: 5,
  },
};

// Configure axios instance with headers
const axiosInstance = axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    Referer: 'https://www.google.com/',
  },
  timeout: 10000,
});

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

const fetchModernGhanaSports = async (useProxy = false) => {
  const categoryUrl = 'https://www.modernghana.com/ghanahome/sports/';
  const websiteName = 'modernghana_sports';
  const initialTags = SOURCE_CONFIG.modernghana_sports.tags;

  try {
    const config = {
      url: categoryUrl,
    };

    if (useProxy) {
      // Add your proxy configuration here
      config.proxy = {
        host: 'your-proxy-host',
        port: 8080,
        auth: {
          username: 'username',
          password: 'password',
        },
      };
    }

    const response = await axiosInstance.get(categoryUrl, config);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Process carousel/slider articles (featured stories)
    $('.carousel-inner .item').each((i, el) => {
      const element = $(el);
      const title = element.find('.carousel-caption h3').text().trim();
      const link = element.find('a').attr('href');
      const imageUrl = element.find('img').attr('src');
      const publishedAt = new Date().toISOString();

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link: link.startsWith('http')
            ? link
            : `https://www.modernghana.com${link}`,
          creator: ['ModernGhana'],
          image_url: imageUrl,
          description: '',
          published_at: publishedAt,
          categories: ['sports'],
          tags: [...initialTags, 'featured'],
          has_image: !!imageUrl,
        });
      }
    });

    // Process regular news boxes
    $('.news-box').each((i, el) => {
      const element = $(el);
      const title = element.find('.cnda h3 a').text().trim();
      const link = element.find('.cnda h3 a').attr('href');
      const imageUrl =
        element.find('.f img').attr('src') ||
        element.find('.f img').attr('data-src');
      const timeText = element.find('.thrs').text().trim();
      const description = element
        .find('.remove-space')
        .contents()
        .first()
        .text()
        .trim();

      let publishedAt;
      if (timeText.includes('hours ago')) {
        const hours = parseInt(timeText);
        const date = new Date();
        date.setHours(date.getHours() - hours);
        publishedAt = date.toISOString();
      } else {
        try {
          publishedAt = new Date(timeText).toISOString();
        } catch {
          publishedAt = new Date().toISOString();
        }
      }

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link: link.startsWith('http')
            ? link
            : `https://www.modernghana.com${link}`,
          creator: ['ModernGhana'],
          image_url: imageUrl,
          description: cleanDescription(description),
          published_at: publishedAt,
          categories: ['sports'],
          tags: initialTags,
          has_image: !!imageUrl,
        });
      }
    });

    return {
      ...SOURCE_CONFIG.modernghana_sports,
      source_link: categoryUrl,
      image: articles.some((a) => a.has_image),
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);

    // Try with proxy if first attempt fails
    if (!useProxy) {
      console.log('Trying with proxy...');
      return await fetchModernGhanaSports(true);
    }

    return {
      ...SOURCE_CONFIG.modernghana_sports,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const result = await fetchModernGhanaSports();
      console.log(JSON.stringify(result, '', 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchModernGhanaSports,
  cleanDescription,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
