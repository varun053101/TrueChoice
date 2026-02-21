const express = require("express");
const router = express.Router();

const { jwtAuthMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roles");
const multer = require("multer"); // for file uploads

const {
  createElection,
  updateElection,
  scheduleElection,
  startElection,
  closeElection,
  publishResults,
  createCandidate,
  deleteCandidate,
  uploadEligibleVoters,
  listElections,
  getElectionDetails,
  getAdminResults,
} = require("../controllers/adminController");

const {
  getCandidatesByElection,
} = require("../controllers/electionController");

// Create an election
router.post(
  "/elections/create",
  jwtAuthMiddleware,
  requireAdmin,
  createElection,
);

// Create candidates
router.post(
  "/elections/:electionId/candidates/create",
  jwtAuthMiddleware,
  requireAdmin,
  createCandidate,
);

// Upload Eligible Voters List for specific Position
// Store file in memory (buffer) not on disk
const upload = multer({ storage: multer.memoryStorage() });

// Upload a CSV file containing SRN for this election.
router.post(
  "/elections/:electionId/eligible/upload",
  jwtAuthMiddleware,
  requireAdmin,
  upload.single("file"),
  uploadEligibleVoters,
);

// Force start the election
router.post(
  "/elections/:electionId/start",
  jwtAuthMiddleware,
  requireAdmin,
  startElection,
);

// Force close the election
router.post(
  "/elections/:electionId/close",
  jwtAuthMiddleware,
  requireAdmin,
  closeElection,
);

// Move from draft to scheduled
router.patch(
  "/elections/:electionId/schedule",
  jwtAuthMiddleware,
  requireAdmin,
  scheduleElection,
);

// Update election details ONLY when status is 'draft'
router.patch(
  "/elections/:electionId",
  jwtAuthMiddleware,
  requireAdmin,
  updateElection,
);

// Get candidates by specific elections --------------------------------
router.get(
  "/elections/:electionId/candidates",
  jwtAuthMiddleware,
  requireAdmin,
  getCandidatesByElection,
);

// Delete Candidate before election started
router.delete(
  "/candidates/:candidateId",
  jwtAuthMiddleware,
  requireAdmin,
  deleteCandidate,
);

// List of elections
router.get("/elections", jwtAuthMiddleware, requireAdmin, listElections);

// Specific Election Details
router.get(
  "/elections/:electionId",
  jwtAuthMiddleware,
  requireAdmin,
  getElectionDetails,
);

// Enables public visibility of results for a closed election
router.patch(
  "/elections/:electionId/publish-results",
  jwtAuthMiddleware,
  requireAdmin,
  publishResults,
);

// GET /admin/elections/:electionId/results - View results (Admin only)
router.get(
  "/elections/:electionId/results",
  jwtAuthMiddleware,
  requireAdmin,
  getAdminResults,
);

module.exports = router;
