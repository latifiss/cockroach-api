const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const SOURCE_CONFIG = {
  citinewsroom: {
    id: 1160,
    name: 'Citi Newsroom',
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

const parseCitiNewsroomArticleDate = ($) => {
  const timeElement = $('time.jeg_meta_date').attr('datetime');
  if (timeElement) {
    return new Date(timeElement).toISOString();
  }
  const metaDate = $('meta[property="article:published_time"]').attr('content');
  if (metaDate) {
    return new Date(metaDate).toISOString();
  }
  const dateText = $('.jeg_meta_date').text().trim();
  const dateMatch = dateText.match(/(\w+\s\d{1,2},\s\d{4})/);
  if (dateMatch) {
    return new Date(dateMatch[0]).toISOString();
  }
  const dateMatch2 = dateText.match(/(\d{1,2}\s\w+\s\d{4})/);
  if (dateMatch2) {
    return new Date(dateMatch2[0]).toISOString();
  }
  return new Date().toISOString();
};

const fetchCitiNewsroomGeneralNews = async () => {
  const baseUrl = 'https://citinewsroom.com';
  const newsUrl = 'https://citinewsroom.com/news/';
  const websiteName = 'citi-newsroom';

  try {
    const response = await axios.get(newsUrl);
    const $ = cheerio.load(response.data);

    const headlinesList = $('h3.jeg_post_title a');
    if (headlinesList.length === 0) {
      throw new Error('Citi Newsroom headlines element not found');
    }

    console.log(
      `Found ${headlinesList.length} news articles from Citi Newsroom`
    );

    const articles = headlinesList
      .map((i, element) => {
        const linkElement = $(element);
        const title = linkElement.text().trim();
        const relativeLink = linkElement.attr('href');
        const link = relativeLink.startsWith('http')
          ? relativeLink
          : `${baseUrl}${relativeLink}`;

        const categoryMatch = link.match(/\/\d{4}\/\d{2}\/([^\/]+)\//);
        const category = categoryMatch
          ? categoryMatch[1].replace(/-/g, ' ')
          : 'general';

        return {
          article_id: generateArticleId(title, link, websiteName, null),
          title: title,
          link: link,
          creator: ['Citi Newsroom'],
          image_url: '',
          description: '',
          published_at: '',
          categories: [category],
          has_image: false,
          time_text: '',
        };
      })
      .get();

    const detailedArticles = [];
    for (const article of articles) {
      try {
        const articleResponse = await axios.get(article.link);
        const article$ = cheerio.load(articleResponse.data);

        const description = article$('.content-inner').first().text() || '';

        let imageUrl = '';
        const featuredImageLink = article$(
          'div.jeg_featured.featured_image a'
        ).first();
        if (featuredImageLink.length) {
          imageUrl = featuredImageLink.attr('href') || '';
        }

        if (!imageUrl) {
          const featuredImage = article$(
            'div.jeg_featured.featured_image img'
          ).first();
          if (featuredImage.length) {
            imageUrl = featuredImage.attr('src') || '';
          }
        }

        if (!imageUrl) {
          const contentImage = article$('.content-inner img').first();
          if (contentImage.length) {
            imageUrl = contentImage.attr('src') || '';
          }
        }

        const publishedAt = parseCitiNewsroomArticleDate(article$);

        detailedArticles.push({
          ...article,
          description: cleanDescription(description),
          image_url: imageUrl,
          published_at: publishedAt,
          has_image: !!imageUrl,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (innerError) {
        console.error(
          `Error fetching Citi Newsroom article details for ${article.link}: ${innerError.message}`
        );
        detailedArticles.push(article);
      }
    }

    return {
      source_id: SOURCE_CONFIG.citinewsroom.id,
      source_name: SOURCE_CONFIG.citinewsroom.name,
      source_link: newsUrl,
      source_origin: SOURCE_CONFIG.citinewsroom.origin,
      source_tags: SOURCE_CONFIG.citinewsroom.tags,
      source_credibility: SOURCE_CONFIG.citinewsroom.credibility,
      image: detailedArticles.some((article) => article.has_image),
      articles: detailedArticles,
    };
  } catch (error) {
    console.error(
      `Error fetching Citi Newsroom general news: ${error.message}`,
      {
        url: newsUrl,
        stack: error.stack,
      }
    );
    return {
      ...SOURCE_CONFIG.citinewsroom,
      source_link: newsUrl,
      articles: [],
      error: error.message,
    };
  }
};

const main = async () => {
  try {
    const citiNewsroomResponse = await fetchCitiNewsroomGeneralNews();
    console.log(
      `Successfully scraped ${citiNewsroomResponse.articles.length} news articles from Citi Newsroom\n`
    );
    console.log(
      `Citi Newsroom articles:\n${JSON.stringify(
        citiNewsroomResponse,
        null,
        2
      )}`
    );
  } catch (error) {
    console.error('Main execution failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  fetchCitiNewsroomGeneralNews,
  cleanDescription,
};
