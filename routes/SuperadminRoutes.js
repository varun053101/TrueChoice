const express = require("express");
const router = express.Router();

const { jwtAuthMiddleware } = require("../auth/jwt");
const { requireSuperadmin } = require("../middlewares/Roles");

const User = require("../models/User");

// See Who is the current Admin
router.get("/admin", jwtAuthMiddleware, requireSuperadmin, async (req, res) => {
  try {
    const admin = await User.findOne({ role: "admin" })
      .select("_id fullName email srn role createdAt");

    return res.status(200).json({ admin });
  } catch (err) {
    console.error("Get admin details error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
