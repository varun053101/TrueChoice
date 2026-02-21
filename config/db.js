const mongoose = require('mongoose');
require('dotenv').config();

// Define the MongoDB connection URL
const mongoURL = process.env.MONGODB_URL;   // Automatically creats a new database if not already present

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURL);

    console.log("Connected to Database Server");
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};

// connection events (optional but good)
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});


// Export the database connection
module.exports = connectDB;            // exporting so that express can use it to interact with the database