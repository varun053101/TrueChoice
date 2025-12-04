const rateLimit = require('express-rate-limit');
require('dotenv').config();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: process.env.LOGINLIMITER_MAX, // limit each IP to required number of requests per window
  message: { error: "Too many login attempts, please try again later." }
});

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.REGISTERLIMITER_MAX, // limit each IP to required number of requests per window
  message: { error: "Too many registration attempts, please try again later." }
});

module.exports = { loginLimiter, registerLimiter };