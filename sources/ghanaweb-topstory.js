const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ghanaweb: {
    id: 1159,
    name: 'GhanaWeb',
    tags: ['news', 'ghana', 'politics', 'local'],
    origin: 'Ghana',
    credibility: 5,
  },
};

// Helper functions
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

const fetchGhanaWebLeadStory = async () => {
  const baseUrl = 'https://www.ghanaweb.com';
  const websiteName = 'ghanaweb';

  try {
    // Fetch the main page
    const response = await axios.get(baseUrl);
    const $ = cheerio.load(response.data);

    // Extract lead story information
    const leadStory = $('#lead-story');
    if (leadStory.length === 0) {
      throw new Error('Lead story element not found');
    }

    const title = leadStory.find('h2').text().trim();
    const relativeLink = leadStory.find('a').first().attr('href');
    const link = relativeLink.startsWith('http')
      ? relativeLink
      : `${baseUrl}${relativeLink}`;
    const imageUrl = leadStory.find('.lead_img').attr('src');
    const category = leadStory.find('.section.lead_news').text().trim();

    // Now navigate to the article page to get more details
    let description = '';
    let publishedAt = new Date().toISOString();
    let creator = ['GhanaWeb'];

    try {
      const articleResponse = await axios.get(link);
      const article$ = cheerio.load(articleResponse.data);

      // Extract description (adjust selector as needed)
      description = article$('div.article-body').text() || '';

      // Extract date (adjust selector as needed)
      const dateText = article$('time.date').text() || '';
      if (dateText) {
        publishedAt = new Date(dateText).toISOString();
      }

      // Extract author if available
      const author = article$('.author').text() || '';
      if (author) {
        creator = [author.trim()];
      }
    } catch (innerError) {
      console.error(`Error fetching article details: ${innerError.message}`);
      // Continue with default values if article page can't be loaded
    }

    const article = {
      article_id: generateArticleId(title, link, websiteName, publishedAt),
      title: title,
      link: link,
      creator: creator,
      image_url: imageUrl,
      description: cleanDescription(description),
      published_at: publishedAt,
      categories: [category].filter((c) => c),
      has_image: !!imageUrl,
    };

    return {
      source_id: SOURCE_CONFIG.ghanaweb.id,
      source_name: SOURCE_CONFIG.ghanaweb.name,
      source_link: baseUrl,
      source_origin: SOURCE_CONFIG.ghanaweb.origin,
      source_tags: SOURCE_CONFIG.ghanaweb.tags,
      source_credibility: SOURCE_CONFIG.ghanaweb.credibility,
      image: article.has_image,
      articles: [article],
    };
  } catch (error) {
    console.error(`Error fetching GhanaWeb lead story: ${error.message}`, {
      url: baseUrl,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.ghanaweb,
      source_link: baseUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const response = await fetchGhanaWebLeadStory();
    console.log(JSON.stringify(response, null, 2));
    console.log(`Fetched ${response.articles.length} lead story from GhanaWeb`);

    if (response.articles.length > 0) {
      console.log('\nLead story details:');
      console.log({
        title: response.articles[0].title,
        link: response.articles[0].link,
        image_url: response.articles[0].image_url,
        creator: response.articles[0].creator,
        categories: response.articles[0].categories,
        published_at: response.articles[0].published_at,
      });
    }
  } catch (error) {
    console.error('Main execution failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  fetchGhanaWebLeadStory,
  cleanDescription,
};
