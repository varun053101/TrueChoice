const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 5, // limit each IP to 5 requests per window
  message: { error: "Too many login attempts, please try again later." }
});

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: { error: "Too many registration attempts, please try again later." }
});

module.exports = { loginLimiter, registerLimiter };