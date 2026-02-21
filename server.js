require('dotenv').config();
const express = require('express')
const { runElectionTimeUpdater } = require('./jobs/electionScheduler');
const connectDB = require("./config/db");
const cors = require('cors');

const app = express()
// Create Database Connection
connectDB();

const PORT = process.env.PORT || 3000;
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
  credentials: true
}));
app.use(express.json());     // stored in req.body
app.use(express.urlencoded({ extended: true }));

const userRoutes = require('./routes/VoterRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const SuperadminRoutes = require('./routes/SuperadminRoutes');


app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/superadmin', SuperadminRoutes);

const errorHandler = require("./middlewares/errorHandler");
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)

  // run job
  runElectionTimeUpdater();
  // run every 10 seconds
  setInterval(runElectionTimeUpdater, 10 * 1000);
})