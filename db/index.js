require('dotenv').config();
const mongoose = require('mongoose');

let isDBConnected = false;
const connectionCallbacks = [];

const connectDB = async () => {
  try {
    console.log('🔌 Attempting MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'api',
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
    });

    isDBConnected = true;
    console.log('✅ MongoDB connected successfully!');

    // Execute all queued callbacks
    connectionCallbacks.forEach((cb) => cb());
    connectionCallbacks.length = 0;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('disconnected', () => {
  isDBConnected = false;
  console.log('💔 Disconnected from MongoDB');
});

// Add this new function to queue callbacks
const onConnected = (callback) => {
  if (isDBConnected) {
    callback();
  } else {
    connectionCallbacks.push(callback);
  }
};

module.exports = { connectDB, onConnected, mongoose };
