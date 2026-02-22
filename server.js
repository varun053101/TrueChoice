require("dotenv").config();
const express = require("express");
const { runElectionTimeUpdater } = require("./jobs/electionScheduler");
const connectDB = require("./config/db");
const cors = require("cors");

const app = express();

// Use Logger
const logger = require("./middleware/logger");
app.use(logger);

// Create Database Connection
connectDB();

const PORT = process.env.PORT || 3000;
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : [],
    credentials: true,
  }),
);
app.use(express.json()); // stored in req.body
app.use(express.urlencoded({ extended: true }));

const userRoutes = require("./routes/voterRoutes");
const adminRoutes = require("./routes/adminRoutes");
const superadminRoutes = require("./routes/superadminRoutes");

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/superadmin", superadminRoutes);

// Global Error Handler
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);

  // run job
  runElectionTimeUpdater();
  // run every 10 seconds
  setInterval(runElectionTimeUpdater, 10 * 1000);
});
