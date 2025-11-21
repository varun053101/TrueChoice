const mongoose = require('mongoose');
require('dotenv').config();

// Define the MongoDB connection URL
const mongoURL = process.env.MONGODB_URL_LOCAL;   // Automatically creats a new database if not already present
// const mongoURL = process.env.MONGODB_URL;
mongoose.connect(mongoURL);             // Represent that the url that we are working is new with latest mongodb version


// Get default connection
// mongoose maintains a default connection object representing the MongoDB connection
const db = mongoose.connection;     // this object is what we will use to handle events and interact with the database

// Define event Listeners
db.on('connected', () => {
    console.log('Connected to MongoDB Server');
});

db.on('error', (err) => {
    console.log('MongoDB Connection error: '+ err);
});

db.on('disconnected', () => {
    console.log('MongoDB Disconnected');
});

// Export the database connection

module.exports = db;            // exporting so that express can use it to interact with the database