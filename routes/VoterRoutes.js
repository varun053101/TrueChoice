const express = require("express");
const router = express.Router();
const { jwtAuthMiddleware, generateToken } = require("../auth/jwt");
const { requireVoter } = require("../middlewares/roles");

const User = require("../models/User");
const EligibleVoter = require("../models/EligibleVoter");
const Election = require("../models/Election");
const Candidate = require("../models/Candidate");
const Vote = require("../models/Vote");
const mongoose = require("mongoose");

// To Register
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, srn, password } = req.body;

    const normSrn = srn?.trim().toUpperCase();
    const normEmail = email?.trim().toLowerCase();

    const userExist = await User.findOne({ srn: normSrn });

    if (userExist) {
      return res.status(409).json({
        error: "User Already Exists",
      });
    }

    // SRN REGEX VALIDATION
    const srnRegex = /^R\d{2}[A-Za-z]{2}\d{3}$/;

    if (!srnRegex.test(normSrn)) {
      return res.status(400).json({
        error: "Invalid SRN format. Example: R12AB345",
      });
    }

    const data = {
      fullName,
      email: normEmail,
      srn: normSrn,
      password,
      role: "voter",
      isVerified: false,
    };

    const newUser = new User(data);
    const response = await newUser.save();
    console.log("User registered");

    const payload = { id: response.id, role: response.role };
    const token = generateToken ? generateToken(payload) : null;

    return res.status(200).json({ user: response, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// For logging in
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = generateToken({ id: user._id, role: user.role });
    res.json({
      token,
      user: { id: user._id, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// For Reviewing profile
router.get("/profile", jwtAuthMiddleware, async (req, res) => {
  try {
    const userData = req.user;

    const user = await User.findById(userData.id);
    res.status(200).json({
      name: user.fullName,
      email: user.email,
      SRN: user.srn,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// For resetting password
router.put("/profile/resetpassword", jwtAuthMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // find the id
    const userId = req.user.id;

    // find the user with the id
    const user = await User.findById(userId);

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log("password updated");
    res.status(200).json({ message: "Password Updated" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get Ongoing elections
router.get("/elections/active", jwtAuthMiddleware, async (req, res) => {
  try {
    // Only show elections that are ongoing
    const elections = await Election.find({ status: "ongoing" });

    return res.status(200).json({ elections });
  } catch (err) {
    console.log("Active elections error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get election details
router.get(
  "/elections/:electionId/ballot",
  jwtAuthMiddleware,
  async (req, res) => {
    try {
      const electionId = req.params.electionId;

      // Find the election
      const election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ error: "Election not found" });
      }

      //check if election is ongoing
      if (election.status !== "ongoing") {
        return res
          .status(400)
          .json({ error: "Election is not open for voting" });
      }

      // get candidates and their basic details
      const candidates = await Candidate.find({
        electionId,
        approved: true,
      }).select("displayName _id");

      return res.status(200).json({
        election: {
          title: election.title,
          positionName: election.positionName,
          status: election.status,
        },
        candidates: candidates.name,
      });
    } catch (err) {
      console.log("Ballot error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Casting votes
router.post(
  "/elections/:electionId/vote",
  jwtAuthMiddleware,
  requireVoter,
  async (req, res) => {
    try {
      const electionId = req.params.electionId;
      const { candidateId } = req.body;
      const voterId = req.user.id;

      // chech if candidate is valid
      if (!candidateId) {
        return res.status(400).json({ error: "candidateId is required" });
      }

      // chech if election is valid
      const election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ error: "Election not found" });
      }

      if (election.status !== "ongoing") {
        return res
          .status(400)
          .json({ error: "Voting is not open for this election" });
      }

      // rule for only single vote
      const existingVote = await Vote.findOne({ electionId, voterId });

      if (existingVote) {
        return res
          .status(400)
          .json({ error: "You have already voted in this election" });
      }

      // check if candidate belong to the election
      const candidate = await Candidate.findOne({
        _id: candidateId,
        electionId,
        approved: true,
      });

      if (!candidate) {
        return res.status(400).json({ error: "Invalid candidate" });
      }

      // cast vote
      const vote = new Vote({
        electionId,
        positionName: election.positionName,
        candidateId,
        voterId,
      });

      const savedVote = await vote.save();

      return res.status(200).json({
        message: "Vote cast successfully",
        vote: savedVote,
      });
    } catch (err) {
      console.log("Vote error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// GET election results
router.get('/elections/:electionId/results', jwtAuthMiddleware, requireVoter, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    // Load election
    const election = await Election.findById(electionId)
      .select("title positionName status publicResults");
      
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }

    // Only show results when closed or public
    if (election.status !== "closed" && election.publicResults !== true) {
      return res.status(403).json({ error: "Results not available yet" });
    }

    // Total votes in this election
    const totalVotes = await Vote.countDocuments({ electionId });

    // Aggregate votes per candidate
    const resultsAgg = await Vote.aggregate([
      { $match: { electionId: new mongoose.Types.ObjectId(electionId) } },
      { $group: { _id: "$candidateId", votes: { $sum: 1 } } },
      { $sort: { votes: -1 } },
      {
        $lookup: {
          from: "candidates",
          localField: "_id",
          foreignField: "_id",
          as: "candidate"
        }
      },
      { $unwind: "$candidate" },
      {
        $project: {
          _id: 0,
          candidateId: "$_id",
          displayName: "$candidate.displayName",
          votes: 1
        }
      }
    ]);

    // Add percentages
    const results = resultsAgg.map(r => ({
      candidateId: r.candidateId,
      displayName: r.displayName,
      votes: r.votes,
      percentage: totalVotes ? Number(((r.votes / totalVotes) * 100).toFixed(2)) : 0
    }));

    // Determine winners (handles ties)
    const maxVotes = results.length ? results[0].votes : 0;
    const winners = results.filter(r => r.votes === maxVotes);

    return res.status(200).json({
      election: {
        id: election._id,
        title: election.title,
        positionName: election.positionName
      },
      totalVotes,
      results,
      winners
    });

  } catch (err) {
    console.log("Results error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// export router so it can be used by the app
module.exports = router;
