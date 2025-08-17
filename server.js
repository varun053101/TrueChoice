const express = require('express')
const app = express()
const db = require('./db');     // import from exports and also to establish connection befre the establishment of https connection
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const bodyParser = require('body-parser');
app.use(express.json());     // stored int req.body


// Import the router files
const userRoutes = require('./routes/userRoutes');
const candidateRoutes = require('./routes/candidateRoutes');

// Use the routers
app.use('/user', userRoutes);
app.use('/candidate', candidateRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})