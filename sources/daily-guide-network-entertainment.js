const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  daily_guide_entertainment: {
    id: 1175,
    name: 'Daily Guide Network',
    domain_url: 'dailyguidenetwork.com',
    source_category: 'Entertainment',
    tags: [
      'news',
      'ghana',
      'entertainment',
      'music',
      'movies',
      'celebrities',
      'events',
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

const parseArticleDate = (dateString) => {
  if (!dateString) return new Date().toISOString();
  const extractedDate = dateString.match(/([A-Za-z]+ \d{1,2}, \d{4})/);
  if (extractedDate) {
    return new Date(extractedDate[0]).toISOString();
  }
  return new Date(dateString).toISOString();
};

const extractImageUrl = (styleAttribute) => {
  if (!styleAttribute) return '';
  const match = styleAttribute.match(/url\((.*?)\)/);
  return match ? match[1].replace(/['"]/g, '') : '';
};

const fetchDailyGuideEntertainmentNews = async () => {
  const baseUrl = 'https://dailyguidenetwork.com';
  const entertainmentUrl =
    'https://dailyguidenetwork.com/category/entertainment-news/';
  const websiteName = 'daily-guide-entertainment';

  try {
    const response = await axios.get(entertainmentUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $('.row.default-layout article.post-wrap').each((i, element) => {
      const item = $(element);
      const titleElement = item.find('.title.h3 a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');
      const imageContainer = item.find('.image-container');
      const imageStyle = imageContainer.attr('style');
      const imageUrl = extractImageUrl(imageStyle);
      const description =
        item.find('.post-entry p').first().text().trim() || title;
      const dateElement = item.find('.date a');
      let date = dateElement.text().trim();
      if (!date) {
        date = item.find('.date').text().trim();
      }

      const categories = [];
      item.find('.post-categories a').each((i, catElement) => {
        categories.push($(catElement).text().trim());
      });

      const articleClasses = item.attr('class') || '';
      const tags = [];
      if (articleClasses.includes('tag-')) {
        articleClasses.split(' ').forEach((className) => {
          if (className.startsWith('tag-')) {
            tags.push(className.replace('tag-', '').replace(/-/g, ' '));
          }
        });
      }

      let creator = 'Daily Guide Network';
      const descText = item.find('.post-entry p').first().text().trim();
      const creatorMatch = descText.match(
        /^(?:By\s)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/
      );
      if (creatorMatch) {
        creator = creatorMatch[1];
      }

      articles.push({
        article_id: generateArticleId(title, link, websiteName, date),
        title: title,
        link: link.startsWith('http') ? link : `${baseUrl}${link}`,
        creator: [creator],
        image_url: imageUrl,
        description: cleanDescription(description),
        published_at: parseArticleDate(date),
        categories: categories.length ? categories : ['Entertainment'],
        tags: tags,
        has_image: !!imageUrl,
        source_section: 'Entertainment News',
        entertainment_type:
          title.includes('music') || tags.some((tag) => tag.includes('music'))
            ? 'Music'
            : title.includes('movie') ||
              tags.some((tag) => tag.includes('movie'))
            ? 'Movie'
            : title.includes('event') ||
              tags.some((tag) => tag.includes('event'))
            ? 'Event'
            : 'General',
      });
    });

    return {
      source_id: SOURCE_CONFIG.daily_guide_entertainment.id,
      source_name: SOURCE_CONFIG.daily_guide_entertainment.name,
      source_link: entertainmentUrl,
      source_origin: SOURCE_CONFIG.daily_guide_entertainment.origin,
      source_tags: SOURCE_CONFIG.daily_guide_entertainment.tags,
      source_credibility: SOURCE_CONFIG.daily_guide_entertainment.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(
      `Error fetching Daily Guide Network Entertainment news: ${error.message}`,
      {
        url: entertainmentUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.daily_guide_entertainment,
      source_link: entertainmentUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchDailyGuideEntertainmentNews();
    console.log(
      `Successfully scraped ${response.articles.length} Entertainment news articles\n`
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
        tags: article.tags,
        has_image: article.has_image,
        source_section: article.source_section,
        entertainment_type: article.entertainment_type,
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
  fetchDailyGuideEntertainmentNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
