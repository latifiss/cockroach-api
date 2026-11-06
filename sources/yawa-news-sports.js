const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  yawanews_sports: {
    id: 1164,
    name: 'Yawa News',
    domain_url: 'yawanews.com',
    source_category: 'Sports',
    tags: ['sports', 'ghana', 'football', 'africa', 'athletics', 'local'],
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

const parseYawaDate = (dateString) => {
  const months = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12',
  };

  const parts = dateString.split(' ');
  if (parts.length === 3) {
    const month = months[parts[0]];
    const day = parts[1].replace(',', '').padStart(2, '0');
    const year = parts[2];
    return new Date(`${year}-${month}-${day}`).toISOString();
  }
  return new Date().toISOString();
};

const fetchYawaSportsArticles = async () => {
  const categoryUrl = 'https://yawanews.com/category/sports/';
  const websiteName = 'yawanews-sports';
  const initialCategories = ['sports', 'ghana', 'football'];
  const baseUrl = 'https://yawanews.com';

  try {
    const response = await axios.get(categoryUrl);
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article.jeg_post').each((i, element) => {
      const article = $(element);
      const titleElement = article.find('h3.jeg_post_title a');
      const title = titleElement.text().trim();
      const relativeLink = titleElement.attr('href');

      const imageElement = article.find('.jeg_thumb img');
      // For the initial list, we still allow data-src as it's often used in list views for lazy loading
      const imageUrlAttr =
        imageElement.attr('src') || imageElement.attr('data-src');
      let imageUrl = '';
      if (imageUrlAttr) {
        imageUrl = imageUrlAttr.startsWith('http')
          ? imageUrlAttr
          : `${baseUrl}${imageUrlAttr}`;
      }

      const category =
        article.find('.jeg_post_category a').text().trim() || 'Sports';
      const description = article.find('.jeg_post_excerpt p').text().trim();

      if (title && relativeLink) {
        articles.push({
          article_id: generateArticleId(title, relativeLink, websiteName, null),
          title,
          link: relativeLink.startsWith('http')
            ? relativeLink
            : `${baseUrl}${relativeLink}`,
          creator: ['YawaNews'],
          image_url: imageUrl,
          description: cleanDescription(description),
          published_at: new Date().toISOString(),
          categories: [...initialCategories, category.toLowerCase()],
          has_image: !!imageUrl,
        });
      }
    });

    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        const dateString = article$('.jeg_meta_date a').text().trim();

        let fullImage = '';

        // Priority 1: Main featured image's 'src' attribute
        const featuredImgElement = article$(
          '.jeg_featured .thumbnail-container img'
        );
        if (featuredImgElement.length) {
          const srcAttr = featuredImgElement.attr('src');
          if (srcAttr && !srcAttr.includes('jeg-empty.png')) {
            // Explicitly exclude the placeholder
            fullImage = srcAttr;
          }
        }

        // Priority 2: Main featured image's 'data-src' attribute, only if 'src' failed
        if (!fullImage && featuredImgElement.length) {
          const dataSrcAttr = featuredImgElement.attr('data-src');
          if (dataSrcAttr && !dataSrcAttr.includes('jeg-empty.png')) {
            // Explicitly exclude the placeholder
            fullImage = dataSrcAttr;
          }
        }

        // Priority 3: First image in the main content body ('.entry-content')
        if (!fullImage) {
          const contentImgElement = article$('.entry-content img').first();
          if (contentImgElement.length) {
            const contentSrc = contentImgElement.attr('src');
            const contentDataSrc = contentImgElement.attr('data-src');
            if (contentSrc && !contentSrc.includes('jeg-empty.png')) {
              fullImage = contentSrc;
            } else if (
              contentDataSrc &&
              !contentDataSrc.includes('jeg-empty.png')
            ) {
              fullImage = contentDataSrc;
            }
          }
        }

        // Ensure it's an absolute URL, otherwise keep it empty if no valid image was found
        if (fullImage && !fullImage.startsWith('http')) {
          fullImage = `${baseUrl}${fullImage}`;
        } else if (!fullImage) {
          // If after all attempts, fullImage is still empty or is the placeholder,
          // ensure it remains an empty string as per your requirement.
          fullImage = '';
        }

        let fullDescription = '';
        article$('.content-inner p').each((i, el) => {
          const text = article$(el).text().trim();
          if (
            !text.toLowerCase().includes('related posts') &&
            !text.toLowerCase().includes('advertisement')
          ) {
            fullDescription += text + ' ';
          }
        });

        const tags = [];
        article$('.jeg_post_tags a').each((i, el) => {
          tags.push(article$(el).text().trim());
        });

        detailedArticles.push({
          ...article,
          description: cleanDescription(fullDescription || article.description),
          image_url: fullImage, // This will now be '' if no actual image was found
          published_at: dateString
            ? parseYawaDate(dateString)
            : article.published_at,
          has_image: !!fullImage, // has_image will be false if fullImage is ''
          tags,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `Error fetching detailed article ${article.link}: ${error.message}`
        );
        // If an error occurs, push the original article without a detailed image
        detailedArticles.push({
          ...article,
          image_url: '', // Explicitly set to empty string on error as well
          has_image: false,
        });
      }
    }

    return {
      ...SOURCE_CONFIG.yawanews_sports,
      source_link: categoryUrl,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(`Error fetching from ${categoryUrl}: ${error.message}`);
    return {
      ...SOURCE_CONFIG.yawanews_sports,
      source_link: categoryUrl,
      articles: [],
      error: error.message,
    };
  }
};

if (require.main === module) {
  (async () => {
    try {
      const sportsResult = await fetchYawaSportsArticles();
      console.log(JSON.stringify(sportsResult, null, 2));
    } catch (error) {
      console.error('Main execution failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchYawaSportsArticles,
  cleanDescription,
  parseYawaDate,
  generateArticleId,
};

require('../utils/sourceConfig').attachSourceConfigName(module.exports, SOURCE_CONFIG);
