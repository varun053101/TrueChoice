const { successResponse, errorResponse } = require("../utils/response");

function requireVoter(req, res, next) {
  try {
    // req.user is set by jwtAuthMiddleware
    if (!req.user) return errorResponse(res, 401, "Unauthorized");

    // user.role must be 'voter'
    if (req.user.role === "voter") {
      return next();
    }

    return errorResponse(res, 403, "Voter access required");
  } catch (err) {
    return next(err);
  }
}

function requireAdmin(req, res, next) {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, 401, "Unauthorized");
    }

    // Admin or Superadmin can access admin routes
    if (user.role === "admin" || user.role === "superadmin") {
      return next();
    }

    return errorResponse(res, 403, "Admin access required");
  } catch (err) {
    return next(err);
  }
}

function requireSuperadmin(req, res, next) {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, 401, "Unauthorized");
    }

    if (user.role === "superadmin") {
      return next();
    }

    return errorResponse(res, 403, "Superadmin access required");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireVoter,
  requireAdmin,
  requireSuperadmin,
};
