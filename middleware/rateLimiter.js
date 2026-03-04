const rateLimit = require("express-rate-limit");
require("dotenv").config();
const { successResponse, errorResponse } = require("../utils/response");

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.LOGINLIMITER_MAX) || 5, // limit each IP to required number of requests per window
  handler: (req, res) => {
    errorResponse(res, 429, "Too many login attempts, please try again later.");
  },
});

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: parseInt(process.env.REGISTERLIMITER_MAX) || 3, // limit each IP to required number of requests per window
  handler: (req, res) => {
    errorResponse(
      res,
      429,
      "Too many registration attempts, please try again later.",
    );
  },
});

module.exports = { loginLimiter, registerLimiter };
