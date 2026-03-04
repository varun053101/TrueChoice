const express = require("express");
const router = express.Router();

const { jwtAuthMiddleware } = require("../middleware/authMiddleware");
const { requireSuperadmin } = require("../middleware/roles");

const {
  getAllUsers,
  getCurrentAdmin,
  makeAdmin,
  transferSuperadmin,
} = require("../controllers/superadminController");

// Get all users for admin selection
router.get("/users", jwtAuthMiddleware, requireSuperadmin, getAllUsers);

// See Who is the current Admin
router.get("/admin", jwtAuthMiddleware, requireSuperadmin, getCurrentAdmin);

// Change Admin roles
router.post(
  "/users/:userId/make-admin",
  jwtAuthMiddleware,
  requireSuperadmin,
  makeAdmin,
);

// Transfer ownership

router.post(
  "/users/:userId/make-superadmin",
  jwtAuthMiddleware,
  requireSuperadmin,
  transferSuperadmin,
);

module.exports = router;
