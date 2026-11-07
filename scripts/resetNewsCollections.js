require('dotenv').config();

const mongoose = require('mongoose');
const Latest = require('../models/latest.model');
const News = require('../models/news.model');

async function resetNewsCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'api',
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected');

    const collectionsToReset = [
      { name: 'latests', model: Latest },
      { name: 'news', model: News },
    ];

    for (const collection of collectionsToReset) {
      const exists = await mongoose.connection.db
        .listCollections({ name: collection.name })
        .hasNext();

      if (exists) {
        await mongoose.connection.db.dropCollection(collection.name);
        console.log(`🗑️ Dropped ${collection.name}`);
      } else {
        console.log(`ℹ️ ${collection.name} does not exist yet`);
      }

      await collection.model.createCollection();
      await collection.model.syncIndexes();

      console.log(`✅ Recreated ${collection.name} and its indexes`);
    }

    console.log('\n🎉 News collections reset completed');
  } catch (error) {
    console.error('❌ News collections reset failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

resetNewsCollections();
