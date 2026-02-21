const jwt = require("jsonwebtoken");
const User = require("../models/user");

const jwtAuthMiddleware = async (req, res, next) => {
  // Check the request headers has authorization or not
  const authorization = req.headers.authorization;
  if (!authorization) return res.status(401).json({ error: "Token not found" });

  // Extract the jwt token fron the request header
  const token = req.headers.authorization.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Verify the JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // load fresh user from DB using decoded.id
    const user = await User.findById(decoded.id).select(
      "_id fullName email srn role",
    );

    if (!user) {
      return res.status(401).json({ error: "User not found" });
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
    console.log(err);
    res.status(401).json({ error: "Invalid Token" });
  }
};

// Function to Generate Token

const generateToken = (userData) => {
  // Generate a new JWT using user data
  const payload = { id: userData._id || userData.id };
  return jwt.sign(payload, process.env.JWT_SECRET); // Added Expire time
};

module.exports = { jwtAuthMiddleware, generateToken };
