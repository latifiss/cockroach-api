const cron = require('node-cron');
const mongoose = require('mongoose');
const Latest = require('../models/latest.model.js');
const newsSources = require('../sourcesIndex.js');
const {
  generateSlug,
  generateMetaDescription,
  generateMetaTitle,
} = require('../utils/helpers.js');

const latestNewsCronJob = cron.schedule(
  '*/5 * * * *', // Every 5 minutes
  async () => {
    console.log('\n🕒 [CRON] Starting Latest News Cron Job...');
    const startTime = Date.now();

    try {
      console.log('📡 Fetching latest news from all sources...');
      const allNews = await Promise.all(newsSources.map((fetch) => fetch()));

      let allArticles = [];
      allNews.forEach((source) => {
        console.log(
          `✅ Retrieved ${source.articles?.length || 0} from ${
            source.source_name || 'Unknown Source'
          }`
        );

        if (source.articles && source.articles.length > 0) {
          const articlesWithSource = source.articles.map((article) => ({
            ...article,
            source_id: source.source_id || '',
            source_name: source.source_name || '',
            source_link: source.source_link || '',
            source_origin: source.source_origin || '',
            source_tags: source.source_tags || [],
            has_image: source.image || false,
            creator: source.creator || '',
            meta_title: article.meta_title || generateMetaTitle(article.title),
            meta_description:
              article.meta_description || generateMetaDescription(article),
          }));
          allArticles = [...allArticles, ...articlesWithSource];
        }
      });

      allArticles.sort(
        (a, b) => new Date(b.published_at) - new Date(a.published_at)
      );

      console.log(`📝 Processing ${allArticles.length} articles...`);

      // Process in batches for better performance
      const batchSize = 100;
      let successfulInserts = 0;

      for (let i = 0; i < allArticles.length; i += batchSize) {
        const batch = allArticles.slice(i, i + batchSize);
        const operations = batch.map((article) => {
          const latestData = {
            article_id:
              article.article_id || new mongoose.Types.ObjectId().toString(),
            title: article.title || '',
            summary: article.summary || '',
            link: article.link || '',
            image_url: article.image_url || '',
            source_name: article.source_name || '',
            source_id: article.source_id || '',
            source_link: article.source_link || '',
            source_origin: article.source_origin || '',
            source_tags: article.source_tags || [],
            published_at: article.published_at || new Date().toISOString(),
            isBreaking: false,
            label: '',
            // Required fields with defaults
            meta_title: article.meta_title || generateMetaTitle(article.title),
            meta_description:
              article.meta_description || generateMetaDescription,
            // Add any other required fields from your model
          };

          return {
            updateOne: {
              filter: {
                $or: [
                  { article_id: latestData.article_id },
                  { slug: latestData.slug },
                ],
              },
              update: { $set: latestData },
              upsert: true,
            },
          };
        });

        try {
          const result = await Latest.bulkWrite(operations);
          successfulInserts += result.upsertedCount + result.modifiedCount;
        } catch (batchError) {
          console.error('⚠️ Batch error:', batchError.message);
        }
      }

      console.log(
        `📥 Successfully processed ${successfulInserts}/${allArticles.length} articles`
      );

      // Cleanup old articles
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      console.log('🧹 Cleaning up articles older than 2 days...');
      const deleteResult = await Latest.deleteMany({
        published_at: { $lt: twoDaysAgo },
      });
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} old articles`);
    } catch (err) {
      console.error('❌ [CRON] Error in latest news cron job:', err);
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ [CRON] Cycle complete in ${duration}s`);
      console.log('🏁 --- End of Latest News Cron Job ---\n');
    }
  },
  {
    scheduled: false,
    timezone: 'UTC',
  }
);

module.exports = latestNewsCronJob;
