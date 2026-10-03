const mongoose = require('mongoose');
const { mongoUri } = require('./index');

mongoose.set('strictQuery', true);

async function connectDB() {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 60000,
  });
  // Run index sync in background so startup and initial API calls are never blocked
  mongoose.connection.syncIndexes?.().catch((err) => {
    console.warn('[db] Background index sync:', err.message);
  });
}

module.exports = connectDB;
