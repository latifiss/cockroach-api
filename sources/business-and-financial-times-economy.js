const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  bft_economy: {
    id: 1176,
    name: 'The Business & Financial Times',
    tags: [
      'news',
      'ghana',
      'economy',
      'finance',
      'business',
      'markets',
      'local',
      'economic policy',
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
  // Extract date from URL pattern like /2025/06/10/
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

const fetchBFTEconomyNews = async () => {
  const baseUrl = 'https://thebftonline.com';
  const economyUrl = 'https://thebftonline.com/category/economy/';
  const websiteName = 'bft-economy';

  try {
    const response = await axios.get(economyUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Process big grid articles (first section)
    $(
      '.td-big-grid-wrapper .td_module_mx5, .td-big-grid-wrapper .td_module_mx13'
    ).each((i, element) => {
      const item = $(element);
      const titleElement = item.find('.entry-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');
      const imgElement = item.find('img.entry-thumb');
      const imageUrl = extractImageUrl(imgElement);

      // For these elements, description is not directly available, use title as fallback
      const description = title;

      // Extract date from URL
      const date = parseArticleDate(link);

      articles.push({
        article_id: generateArticleId(title, link, websiteName, date),
        title: title,
        link: link.startsWith('http') ? link : `${baseUrl}${link}`,
        creator: ['The Business & Financial Times'],
        image_url: imageUrl,
        description: cleanDescription(description),
        published_at: date,
        categories: ['Economy'],
        tags: [],
        has_image: !!imageUrl,
        source_section: 'Economy News',
        economic_subcategory: 'General Economy',
        is_financial:
          title.toLowerCase().includes('finance') ||
          title.toLowerCase().includes('bank') ||
          title.toLowerCase().includes('investment'),
      });
    });

    // Process main content articles (second section)
    $('.td_module_19').each((i, element) => {
      const item = $(element);
      const titleElement = item.find('.entry-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');
      const imgElement = item.find('img.entry-thumb');
      const imageUrl = extractImageUrl(imgElement);
      const description = item.find('.td-excerpt').text().trim() || title;

      // Extract date from URL
      const date = parseArticleDate(link);

      // Extract creator from description
      let creator = 'The Business & Financial Times';
      const creatorMatch = description.match(/^By\s([A-Z][a-zA-Z\s]+)/);
      if (creatorMatch) {
        creator = creatorMatch[1].trim();
      }

      // Extract category
      const categoryElement = item.find('.td-post-category');
      const categories = categoryElement.length
        ? [categoryElement.text().trim()]
        : ['Economy'];

      // Determine economic subcategory based on content
      let economicSubcategory = 'General Economy';
      const contentString = `${title} ${description} ${categories.join(
        ' '
      )}`.toLowerCase();

      if (
        contentString.includes('inflation') ||
        contentString.includes('cpi')
      ) {
        economicSubcategory = 'Inflation';
      } else if (
        contentString.includes('currency') ||
        contentString.includes('cedi')
      ) {
        economicSubcategory = 'Currency';
      } else if (
        contentString.includes('bank') ||
        contentString.includes('financial')
      ) {
        economicSubcategory = 'Banking & Finance';
      } else if (
        contentString.includes('trade') ||
        contentString.includes('export')
      ) {
        economicSubcategory = 'Trade';
      } else if (
        contentString.includes('policy') ||
        contentString.includes('government')
      ) {
        economicSubcategory = 'Economic Policy';
      } else if (
        contentString.includes('tax') ||
        contentString.includes('revenue')
      ) {
        economicSubcategory = 'Taxation';
      } else if (
        contentString.includes('market') ||
        contentString.includes('stock')
      ) {
        economicSubcategory = 'Markets';
      } else if (
        contentString.includes('employment') ||
        contentString.includes('job')
      ) {
        economicSubcategory = 'Employment';
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
        source_section: 'Economy News',
        economic_subcategory: economicSubcategory,
        is_financial:
          contentString.includes('finance') ||
          contentString.includes('bank') ||
          contentString.includes('investment'),
      });
    });

    return {
      source_id: SOURCE_CONFIG.bft_economy.id,
      source_name: SOURCE_CONFIG.bft_economy.name,
      source_link: economyUrl,
      source_origin: SOURCE_CONFIG.bft_economy.origin,
      source_tags: SOURCE_CONFIG.bft_economy.tags,
      source_credibility: SOURCE_CONFIG.bft_economy.credibility,
      image: articles.some((article) => article.has_image),
      articles: articles,
    };
  } catch (error) {
    console.error(
      `Error fetching The Business & Financial Times Economy news: ${error.message}`,
      {
        url: economyUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.bft_economy,
      source_link: economyUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchBFTEconomyNews();
    console.log(
      `Successfully scraped ${response.articles.length} Economy news articles\n`
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
        economic_subcategory: article.economic_subcategory,
        is_financial: article.is_financial,
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
  fetchBFTEconomyNews,
  cleanDescription,
};
