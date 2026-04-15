const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  graphicgh: {
    id: 1163,
    name: 'Graphic',
    tags: ['news', 'ghana', 'politics', 'local', 'current events'],
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
    return new Date(`${year}-${month}-${day}`).toISOString();
  }
  return new Date().toISOString();
};

const fetchGraphicNews = async () => {
  const baseUrl = 'https://www.graphic.com.gh';
  const newsUrl = 'https://www.graphic.com.gh/news.html';
  const websiteName = 'graphic-gh';

  try {
    const response = await axios.get(newsUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $('table.category tbody tr').each((i, element) => {
      const row = $(element);
      const titleElement = row.find('td.list-title a');
      const title = titleElement.text().trim();
      const relativeLink = titleElement.attr('href');
      const dateString = row.find('td.list-date').text().trim();

      if (title && relativeLink) {
        articles.push({
          article_id: generateArticleId(title, relativeLink, websiteName, null),
          title,
          link: relativeLink.startsWith('http')
            ? relativeLink
            : `${baseUrl}${relativeLink}`,
          creator: ['Graphic Online'],
          image_url: '',
          description: '',
          published_at: parseGraphicDate(dateString),
          categories: [],
          has_image: false,
          time_text: row.find('.read-time').text().trim() || '',
        });
      }
    });

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
            .map((i, el) => $(el).text().trim())
            .get()
            .join(' ');
        }

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

        const categoryMatch = article.link.match(/\/news\/([^\/]+)/);
        const category = categoryMatch
          ? categoryMatch[1].replace(/-/g, ' ')
          : 'general';

        detailedArticles.push({
          ...article,
          description: cleanDescription(description),
          image_url: imageUrl,
          has_image: !!imageUrl,
          categories: [category],
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
          `Error fetching article ${article.link}: ${error.message}`
        );
        detailedArticles.push(article);
      }
    }

    return {
      ...SOURCE_CONFIG.graphicgh,
      source_link: newsUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching Graphic Online news: ${error.message}`);
    return {
      ...SOURCE_CONFIG.graphicgh,
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const result = await fetchGraphicNews();
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGraphicNews,
  cleanDescription,
};
