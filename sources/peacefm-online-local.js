const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const fs = require('fs');

const SOURCE_CONFIG = {
  peacefm_local: {
    id: 1177,
    name: 'Peace FM Online - Local News',
    tags: ['news', 'ghana', 'local'],
    origin: 'Ghana',
    credibility: 5,
  },
};

// Utility functions remain the same
const generateArticleId = (title, link, websiteName, pubDate) => {
  const uniqueString = `${websiteName}-${title}-${link}-${
    pubDate || new Date().toISOString()
  }`;
  return crypto.createHash('md5').update(uniqueString).digest('hex');
};

const cleanText = (text) => (text ? text.replace(/\s+/g, ' ').trim() : '');

const parseDateFromUrl = (url) => {
  const dateMatch = url.match(/(\d{4})(\d{2})(\d{2})/);
  if (dateMatch) {
    const [_, year, month, day] = dateMatch;
    return new Date(`${year}-${month}-${day}`).toISOString();
  }
  return new Date().toISOString();
};

const fetchPeaceFMLocalNews = async () => {
  const baseUrl = 'https://www.peacefmonline.com';
  const localUrl = 'https://www.peacefmonline.com/pages/local/';

  try {
    // 1. Fetch the page with proper headers
    const response = await axios.get(localUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });

    // 2. Save HTML for debugging if needed
    fs.writeFileSync('peacefm_debug.html', response.data);

    const $ = cheerio.load(response.data);
    const articles = [];

    // 3. First scraping method - direct approach
    $('div.item, article').each((i, element) => {
      try {
        const item = $(element);
        const title = cleanText(item.find('h2, h3, h4').first().text());
        const link = item.find('a').first().attr('href');

        if (!title || !link) return;

        const imgSrc =
          item.find('img').first().attr('src') ||
          item.find('img').first().attr('data-src') ||
          '';
        const imageUrl = imgSrc.startsWith('http')
          ? imgSrc
          : `${baseUrl}${imgSrc}`;

        articles.push({
          article_id: generateArticleId(title, link, 'peacefm'),
          title: title,
          link: link.startsWith('http') ? link : `${baseUrl}${link}`,
          creator: ['Peace FM'],
          image_url: imageUrl,
          description: title, // Default to title if no description
          published_at: parseDateFromUrl(link),
          categories: ['Local News'],
          tags: [],
          has_image: !!imageUrl,
          source_section: 'Local News',
          is_featured: i < 3, // First 3 as featured
        });
      } catch (error) {
        console.error(`Error processing article ${i}:`, error);
      }
    });

    // 4. Second scraping method - fallback to any news-looking elements
    if (articles.length === 0) {
      $('a').each((i, element) => {
        const item = $(element);
        const href = item.attr('href');
        const title = cleanText(item.text());

        if (href && href.includes('/pages/local/') && title.length > 20) {
          const imgElement = item.find('img').first();
          const imageUrl = imgElement
            ? imgElement.attr('src') || imgElement.attr('data-src') || ''
            : '';

          articles.push({
            article_id: generateArticleId(title, href, 'peacefm'),
            title: title,
            link: href.startsWith('http') ? href : `${baseUrl}${href}`,
            creator: ['Peace FM'],
            image_url: imageUrl.startsWith('http')
              ? imageUrl
              : `${baseUrl}${imageUrl}`,
            description: title,
            published_at: parseDateFromUrl(href),
            categories: ['Local News'],
            tags: [],
            has_image: !!imageUrl,
            source_section: 'Local News',
            is_featured: false,
          });
        }
      });
    }

    // 5. Remove duplicates
    const uniqueArticles = articles.reduce((acc, current) => {
      const exists = acc.some((article) => article.link === current.link);
      return exists ? acc : [...acc, current];
    }, []);

    return {
      ...SOURCE_CONFIG.peacefm_local,
      source_link: localUrl,
      articles: uniqueArticles,
      scraped_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to scrape Peace FM:', {
      error: error.message,
      stack: error.stack,
    });
    return {
      ...SOURCE_CONFIG.peacefm_local,
      source_link: localUrl,
      articles: [],
      error: error.message,
      scraped_at: new Date().toISOString(),
    };
  }
};

// Debugging function to test selectors
const testSelectors = (html) => {
  const $ = cheerio.load(html);
  console.log('\nTesting selectors...');

  // Check for common article containers
  const containers = $('div.item, article, div.post, div.article');
  console.log(`Found ${containers.length} potential article containers`);

  // Show first few containers if found
  containers.slice(0, 3).each((i, el) => {
    console.log(`\nContainer ${i + 1}:`);
    console.log('HTML:', $(el).html()?.substring(0, 200) + '...');
  });

  // Check for headlines
  const headlines = $('h1, h2, h3, h4');
  console.log(`\nFound ${headlines.length} headlines`);
  headlines.slice(0, 5).each((i, el) => {
    console.log(`Headline ${i + 1}:`, $(el).text().trim());
  });
};

const main = async () => {
  try {
    const result = await fetchPeaceFMLocalNews();

    if (result.articles.length === 0) {
      console.log('No articles found. Running selector tests...');
      const html = fs.readFileSync('peacefm_debug.html', 'utf-8');
      testSelectors(html);
    }

    console.log(`\nScraped ${result.articles.length} articles:`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Main execution failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  fetchPeaceFMLocalNews,
  testSelectors,
};
