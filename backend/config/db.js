const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Attempt local connection
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000 // fail fast if not running
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    process.env.USE_MOCK_DB = 'false';
  } catch (error) {
    console.warn(`\n⚠️ MongoDB connection failed: ${error.message}`);
    console.warn('⚠️ Switching backend to LOCAL persistent file-based JSON Database mode...\n');
    process.env.USE_MOCK_DB = 'true';
  }
};

module.exports = connectDB;
