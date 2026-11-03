const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  bft_business: {
    id: 1176,
    name: 'The Business & Financial Times',
    domain_url: 'thebftonline.com',
    source_category: 'Business & Finance',
    tags: [
      'news',
      'ghana',
      'business',
      'companies',
      'entrepreneurship',
      'startups',
      'commerce',
      'local',
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
  const urlDateMatch = dateString.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  if (urlDateMatch) {
    const [_, year, month, day] = urlDateMatch;
    return new Date(`${year}-${month}-${day}`).toISOString();
  }
  return new Date(dateString).toISOString();
};

const extractImageUrl = (imgElement) => {
  if (!imgElement) return '';
  const src = imgElement.attr('src');
  if (src && !src.startsWith('data:')) return src;
  const dataImgUrl = imgElement.attr('data-img-url');
  return dataImgUrl || '';
};

const fetchBFTBusinessNews = async () => {
  const baseUrl = 'https://thebftonline.com';
  const businessUrl = 'https://thebftonline.com/category/business/';
  const websiteName = 'bft-business';

  try {
    const response = await axios.get(businessUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $(
      '.td-big-grid-wrapper .td_module_mx5, .td-big-grid-wrapper .td_module_mx13'
    ).each((i, element) => {
      const item = $(element);
      const titleElement = item.find('.entry-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');
      const imgElement = item.find('img.entry-thumb');
      const imageUrl = extractImageUrl(imgElement);
      const description = title;
      const date = parseArticleDate(link);

      articles.push({
        article_id: generateArticleId(title, link, websiteName, date),
        title: title,
        link: link.startsWith('http') ? link : `${baseUrl}${link}`,
        creator: ['The Business & Financial Times'],
        image_url: imageUrl,
        description: cleanDescription(description),
        published_at: date,
        categories: ['Business'],
        tags: [],
        has_image: !!imageUrl,
        source_section: 'Business News',
        business_subcategory: 'General Business',
        is_corporate:
          title.toLowerCase().includes('company') ||
          title.toLowerCase().includes('corporate') ||
          title.toLowerCase().includes('enterprise'),
      });
    });

    $('.td_module_19').each((i, element) => {
      const item = $(element);
      const titleElement = item.find('.entry-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');
      const imgElement = item.find('img.entry-thumb');
      const imageUrl = extractImageUrl(imgElement);
      const description = item.find('.td-excerpt').text().trim() || title;
      const date = parseArticleDate(link);

      let creator = 'The Business & Financial Times';
      const creatorMatch = description.match(/^By\s([A-Z][a-zA-Z\s]+)/);
      if (creatorMatch) {
        creator = creatorMatch[1].trim();
      }

      const categoryElement = item.find('.td-post-category');
      const categories = categoryElement.length
        ? [categoryElement.text().trim()]
        : ['Business'];

      let businessSubcategory = 'General Business';
      const contentString = `${title} ${description} ${categories.join(
        ' '
      )}`.toLowerCase();

      if (
        contentString.includes('startup') ||
        contentString.includes('entrepreneur')
      ) {
        businessSubcategory = 'Startups';
      } else if (
        contentString.includes('company') ||
        contentString.includes('corporation')
      ) {
        businessSubcategory = 'Corporate';
      } else if (
        contentString.includes('trade') ||
        contentString.includes('commerce')
      ) {
        businessSubcategory = 'Commerce';
      } else if (
        contentString.includes('industry') ||
        contentString.includes('manufacturing')
      ) {
        businessSubcategory = 'Industry';
      } else if (
        contentString.includes('sme') ||
        contentString.includes('small business')
      ) {
        businessSubcategory = 'SMEs';
      } else if (
        contentString.includes('technology') ||
        contentString.includes('tech')
      ) {
        businessSubcategory = 'Technology';
      } else if (
        contentString.includes('agriculture') ||
        contentString.includes('agribusiness')
      ) {
        businessSubcategory = 'Agribusiness';
      }

      articles.push({
        article_id: generateArticleId(title, link, websiteName, date),
        title: title,
        link: link.startsWith('http') ? link : `${baseUrl}${link}`,
        creator: [creator],
        image_url: imageUrl,
        description: cleanDescription(description),
        published_at: date,
        categories: categories,
        tags: [],
        has_image: !!imageUrl,
        source_section: 'Business News',
        business_subcategory: businessSubcategory,
        is_corporate:
          contentString.includes('company') ||
          contentString.includes('corporate') ||
          contentString.includes('enterprise'),
      });
    });

    return {
      source_id: SOURCE_CONFIG.bft_business.id,
      source_name: SOURCE_CONFIG.bft_business.name,
      source_link: businessUrl,
      source_origin: SOURCE_CONFIG.bft_business.origin,
      source_tags: SOURCE_CONFIG.bft_business.tags,
      source_credibility: SOURCE_CONFIG.bft_business.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(
      `Error fetching The Business & Financial Times Business news: ${error.message}`,
      {
        url: businessUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.bft_business,
      source_link: businessUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchBFTBusinessNews();
    console.log(
      `Successfully scraped ${response.articles.length} Business news articles\n`
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
        business_subcategory: article.business_subcategory,
        is_corporate: article.is_corporate,
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
  fetchBFTBusinessNews,
  cleanDescription,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
