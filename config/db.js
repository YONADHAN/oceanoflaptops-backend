const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI, {
    });
    console.log('MongoDB Database is connected...');
  } catch (error) {
    console.error('DB connection error:', error.message);
    process.exit(1); 
  }
};

module.exports = connectDB;

