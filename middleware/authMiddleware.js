const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { errorResponse } = require("../utils/response");

const jwtAuthMiddleware = async (req, res, next) => {
  // Check the request headers has authorization or not
  const authorization = req.headers.authorization;
  if (!authorization) return errorResponse(res, 401, "Authentication required. Please log in.");

  // Extract the jwt token fron the request header
  const token = req.headers.authorization.split(" ")[1];

  if (!token) return errorResponse(res, 401, "Unauthorized Access");

  try {
    // Verify the JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return errorResponse(res, 401, "Invalid token");
    }

    // load fresh user from DB using decoded.id
    const user = await User.findById(decoded.id).select(
      "_id fullName email srn role",
    );

    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    // Attach current user info from DB, not from token
    req.user = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      srn: user.srn,
      role: user.role,
    };

    next();
  } catch (err) {
    return next(err);
  }
};

// Function to Generate Token
const generateToken = (userData) => {
  // Generate a new JWT using user data
  const payload = { id: userData._id || userData.id };
  return jwt.sign(payload, process.env.JWT_SECRET); // Added Expire time
};

module.exports = { jwtAuthMiddleware, generateToken };
