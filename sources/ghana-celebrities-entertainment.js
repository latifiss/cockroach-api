const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  ghanacelebrities_entertainment: {
    id: 1165,
    name: 'Ghana Celebrities',
    tags: [
      'entertainment',
      'ghana',
      'celebrity',
      'gossip',
      'lifestyle',
      'music',
      'local',
    ],
    origin: 'Ghana',
    credibility: 4.5,
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

const fetchGhanaCelebritiesArticles = async () => {
  const categoryUrl = 'https://ghanacelebrities.com/category/entertainment/';
  const websiteName = 'ghanacelebrities-entertainment';
  const initialCategories = SOURCE_CONFIG.ghanacelebrities_entertainment.tags;
  const baseUrl = 'https://ghanacelebrities.com';

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article.bb-post').each((i, element) => {
      const article = $(element);
      const titleElement = article.find('h2.entry-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');

      let imageUrl = '';
      const featuredMediaImg = article.find('.featured-media img');
      const postThumbnailImg = article.find('.post-thumbnail img');

      if (featuredMediaImg.length) {
        imageUrl =
          featuredMediaImg.attr('src') || featuredMediaImg.attr('data-src');
      } else if (postThumbnailImg.length) {
        imageUrl =
          postThumbnailImg.attr('src') || postThumbnailImg.attr('data-src');
      }

      if (!imageUrl && article.hasClass('featured-item')) {
        const styleAttr = article.attr('style');
        const match = styleAttr
          ? styleAttr.match(/background-image:url\('([^']+)'\)/)
          : null;
        if (match && match[1]) {
          imageUrl = match[1];
        }
      }

      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${baseUrl}${imageUrl}`;
      } else if (!imageUrl || imageUrl.includes('empty.png')) {
        imageUrl = '';
      }

      const publishedAt = article
        .find('time.entry-date.published')
        .attr('datetime');
      const author = article
        .find('.bb-author-vcard-mini .auth-name span')
        .last()
        .text()
        .trim();
      const descriptionSnippet = article
        .find('p.entry-summary.entry-sub-title')
        .text()
        .trim();

      const categoriesFromPage = [];
      article.find('.bb-cat-links a').each((j, catEl) => {
        categoriesFromPage.push($(catEl).text().trim().toLowerCase());
      });

      if (title && link) {
        articles.push({
          article_id: generateArticleId(title, link, websiteName, publishedAt),
          title,
          link,
          creator: author ? [author] : ['GhanaCelebrities'],
          image_url: imageUrl,
          description: cleanDescription(descriptionSnippet),
          published_at: publishedAt || new Date().toISOString(),
          categories:
            categoriesFromPage.length > 0
              ? categoriesFromPage
              : initialCategories,
          has_image: !!imageUrl,
        });
      }
    });

    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        let fullDescription = '';
        article$('.entry-content p').each((i, el) => {
          const text = article$(el).text().trim();
          if (
            !text.toLowerCase().includes('related posts') &&
            !text.toLowerCase().includes('advertisement') &&
            !text.toLowerCase().includes('source:')
          ) {
            fullDescription += text + ' ';
          }
        });

        const tags = [];
        article$('.post-tags a').each((i, el) => {
          tags.push(article$(el).text().trim());
        });

        detailedArticles.push({
          ...article,
          description: cleanDescription(fullDescription || article.description),
          tags: tags.length > 0 ? tags : article.categories,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `Error fetching detailed article ${article.link}: ${error.message}`
        );
        detailedArticles.push({
          ...article,
        });
      }
    }

    return {
      ...SOURCE_CONFIG.ghanacelebrities_entertainment,
      source_link: categoryUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.ghanacelebrities_entertainment,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const entertainmentResult = await fetchGhanaCelebritiesArticles();
      console.log(JSON.stringify(entertainmentResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchGhanaCelebritiesArticles,
  cleanDescription,
  generateArticleId,
};
