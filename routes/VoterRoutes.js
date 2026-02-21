const express = require("express");
const router = express.Router();
const { jwtAuthMiddleware } = require("../middleware/authMiddleware");
const { requireVoter } = require("../middleware/roles");

const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");

const {
  validateRegistration,
  validateLogin,
} = require("../middleware/validators");

const {
  registerUser,
  loginUser,
  getProfile,
  resetPassword,
} = require("../controllers/authController");

const {
  getActiveElections,
  getElectionBallot,
  getAllElections,
  castVote,
  getResults,
  getCandidatesByElection,
} = require("../controllers/electionController");

// To Register
router.post("/register", registerLimiter, validateRegistration, registerUser);

// For logging in
router.post("/login", loginLimiter, validateLogin, loginUser);

// For Reviewing profile
router.get("/profile", jwtAuthMiddleware, getProfile);

// For resetting password
router.put("/profile/resetpassword", jwtAuthMiddleware, resetPassword);

// Get Ongoing and scheduled elections
router.get("/elections/active", jwtAuthMiddleware, getActiveElections);

// Get election details
router.get(
  "/elections/:electionId/ballot",
  jwtAuthMiddleware,
  getElectionBallot,
);

// Get candidates by specific elections
router.get(
  "/elections/:electionId/candidates",
  jwtAuthMiddleware,
  requireVoter,
  getCandidatesByElection,
);

// Get All public elections
router.get("/elections/all", jwtAuthMiddleware, getAllElections);

// Casting votes
router.post(
  "/elections/:electionId/vote",
  jwtAuthMiddleware,
  requireVoter,
  castVote,
);

// GET election results
router.get(
  "/elections/:electionId/results",
  jwtAuthMiddleware,
  requireVoter,
  getResults,
);

// export router so it can be used by the app
module.exports = router;
