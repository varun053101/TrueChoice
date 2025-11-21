const SystemRoles = require('../models/SystemRoles'); // optional if you want to cross-check
const requireVoter = function requireVoter(req, res, next) {
  // req.user is set by jwtAuthMiddleware
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  // user.role must be 'voter'
  if (req.user.role !== 'voter') {
    return res.status(403).json({ error: 'Voter only' });
  }

  next();
};

function requireAdmin(req, res, next) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Admin or Superadmin can access admin routes
    if (user.role === "admin" || user.role === "superadmin") {
      return next();
    }

    return res.status(403).json({ error: "Admin access required" });

  } catch (err) {
    console.error("requireAdmin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function requireSuperadmin(req, res, next) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role === "superadmin") {
      return next();
    }

    return res.status(403).json({ error: "Superadmin access required" });

  } catch (err) {
    console.error("requireSuperadmin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  requireVoter,
  requireAdmin,
  requireSuperadmin
};