const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  daily_guide_political: {
    id: 1175,
    name: 'Daily Guide Network',
    tags: [
      'news',
      'ghana',
      'politics',
      'government',
      'elections',
      'parliament',
      'policy',
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

  // Extract date from text if it's in format like "June 5, 2025"
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

const fetchDailyGuidePoliticalNews = async () => {
  const baseUrl = 'https://dailyguidenetwork.com';
  const politicalUrl = 'https://dailyguidenetwork.com/category/political-news/';
  const websiteName = 'daily-guide-political';

  try {
    const response = await axios.get(politicalUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Process all articles in the default layout
    $('.row.default-layout article.post-wrap').each((i, element) => {
      const item = $(element);

      // Extract title and link
      const titleElement = item.find('.title.h3 a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');

      // Extract image URL from the style attribute
      const imageContainer = item.find('.image-container');
      const imageStyle = imageContainer.attr('style');
      const imageUrl = extractImageUrl(imageStyle);

      // Extract description (first paragraph before "Read More")
      const description =
        item.find('.post-entry p').first().text().trim() || title;

      // Extract date - first try the link text, then the date element
      const dateElement = item.find('.date a');
      let date = dateElement.text().trim();
      if (!date) {
        date = item.find('.date').text().trim();
      }

      // Extract categories
      const categories = [];
      item.find('.post-categories a').each((i, catElement) => {
        categories.push($(catElement).text().trim());
      });

      // Extract tags from the article's class list
      const articleClasses = item.attr('class') || '';
      const tags = [];
      if (articleClasses.includes('tag-')) {
        articleClasses.split(' ').forEach((className) => {
          if (className.startsWith('tag-')) {
            tags.push(className.replace('tag-', '').replace(/-/g, ' '));
          }
        });
      }

      // Try to extract author from description (common pattern in political news)
      let author = 'Daily Guide Network';
      const descText = item.find('.post-entry p').first().text().trim();
      const authorMatch = descText.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
      if (
        authorMatch &&
        !descText.includes('said') &&
        !descText.includes('stated')
      ) {
        author = authorMatch[0];
      }

      articles.push({
        article_id: generateArticleId(title, link, websiteName, date),
        title: title,
        link: link.startsWith('http') ? link : `${baseUrl}${link}`,
        creator: [author],
        image_url: imageUrl,
        description: cleanDescription(description),
        published_at: parseArticleDate(date),
        categories: categories.length ? categories : ['Politics'],
        tags: tags,
        has_image: !!imageUrl,
        source_section: 'Political News',
        // Additional political-specific fields
        political_party: title.includes('NPP')
          ? 'New Patriotic Party'
          : title.includes('NDC')
          ? 'National Democratic Congress'
          : null,
        is_election_related:
          title.includes('election') ||
          title.includes('vote') ||
          tags.some((tag) => tag.includes('election') || tag.includes('vote')),
      });
    });

    return {
      source_id: SOURCE_CONFIG.daily_guide_political.id,
      source_name: SOURCE_CONFIG.daily_guide_political.name,
      source_link: politicalUrl,
      source_origin: SOURCE_CONFIG.daily_guide_political.origin,
      source_tags: SOURCE_CONFIG.daily_guide_political.tags,
      source_credibility: SOURCE_CONFIG.daily_guide_political.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(
      `Error fetching Daily Guide Network Political news: ${error.message}`,
      {
        url: politicalUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.daily_guide_political,
      source_link: politicalUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchDailyGuidePoliticalNews();
    console.log(
      `Successfully scraped ${response.articles.length} Political news articles\n`
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
        political_party: article.political_party,
        is_election_related: article.is_election_related,
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
  fetchDailyGuidePoliticalNews,
  cleanDescription,
};
