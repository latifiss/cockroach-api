const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ghanaian_times_africa: {
    id: 1167,
    name: 'Ghanaian Times',
    tags: ['sports', 'ghana', 'local', 'football', 'athletics'],
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

const fetchGhanaianTimesSport = async () => {
  const categoryUrl = 'https://ghanaiantimes.com.gh/category/local-sports/';
  const websiteName = 'ghanaian_times_africa';
  const initialTags = SOURCE_CONFIG.ghanaian_times_africa.tags;

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    // Updated selector for article elements if needed, but .masonry .post-element seems correct.
    // Based on the provided HTML, articles are wrapped in a div with classes 'container-wrapper post-element'.
    // The parent is '#masonry-grid'.
    $('#masonry-grid .post-element').each((i, el) => {
      const element = $(el);

      // Title and Link
      const title = element.find('h2.thumb-title a').text().trim(); // More specific selector
      const link = element.find('h2.thumb-title a').attr('href');

      // Published Date
      const dateText = element.find('.post-meta .date').text().trim();
      let publishedAt = '';
      try {
        // Ensure date parsing is robust. 'April 25, 2025' should parse correctly.
        publishedAt = new Date(dateText).toISOString();
      } catch (e) {
        console.warn(
          `Could not parse date "${dateText}". Using current date. Error: ${e.message}`
        );
        publishedAt = new Date().toISOString();
      }

      // Image URL from style attribute
      const styleAttr = element.find('.slide').attr('style') || '';
      const imageMatch = styleAttr.match(/url\(([^)]+)\)/);
      const imageUrl = imageMatch ? imageMatch[1].replace(/['"]/g, '') : '';

      // --- FIX FOR DESCRIPTION ---
      // Based on the provided HTML, there is no '.excerpt p' element.
      // If an excerpt is not present on the category page, you have a few options:
      // 1. Leave it empty (as done below).
      // 2. Try to extract from 'screen-reader-text' if it contains a snippet (unlikely for a full description).
      // 3. Make an additional request to the article's link to scrape the full body/description.
      //    This significantly increases scraping time and complexity.
      const descriptionSnippet = ''; // No direct excerpt found in the provided HTML.
      // If you wanted to use the screen reader text as a snippet, it's just the title again:
      // const descriptionSnippet = element.find('.screen-reader-text').text().trim();

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link,
          creator: ['Ghanaian Times'],
          image_url: imageUrl,
          description: cleanDescription(descriptionSnippet), // Will be empty unless you get it from article page
          published_at: publishedAt,
          categories: ['politics'], // Hardcoded as per SOURCE_CONFIG
          tags: initialTags,
          has_image: !!imageUrl,
        });
      }
    });

    return {
      ...SOURCE_CONFIG.ghanaian_times_africa,
      source_link: categoryUrl,
      image: articles.some((a) => a.has_image), // Indicates if ANY article has an image
      articles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.ghanaian_times_africa,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const result = await fetchGhanaianTimesSport();
      console.log(JSON.stringify(result, '', 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGhanaianTimesSport,
  cleanDescription,
  generateArticleId,
};
