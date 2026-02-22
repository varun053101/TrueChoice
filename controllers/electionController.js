const mongoose = require("mongoose");
const Election = require("../models/election");
const Candidate = require("../models/candidate");
const User = require("../models/user");
const Vote = require("../models/vote");
const EligibleVoter = require("../models/eligibleVoter");
const { successResponse, errorResponse } = require("../utils/response");

// Get a list of all ongoing elections
const getActiveElections = async (req, res, next) => {
  try {
    const now = new Date();

    const elections = await Election.find({
      status: { $in: ["scheduled", "ongoing"] },
      endTime: { $gt: now },
    }).sort({ startTime: 1 });

    const scheduled = [];
    const ongoing = [];

    elections.forEach((e) => {
      if (e.status === "scheduled") scheduled.push(e);
      if (e.status === "ongoing") ongoing.push(e);
    });

    return successResponse(res, 200, "Fetched Successfully", {
      scheduled,
      ongoing,
    });
  } catch (err) {
    return next(err);
  }
};

// Get election details
const getElectionBallot = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;

    // Find the election
    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    //check if election is ongoing
    if (election.status !== "ongoing") {
      return errorResponse(res, 409, "Election is not open for voting");
    }

    // get candidates and their basic details
    const candidates = await Candidate.find({
      electionId,
    }).select("displayName");

    const responseData = {
      election: {
        title: election.title,
        positionName: election.positionName,
        status: election.status,
      },
      candidates: candidates,
    };

    return successResponse(res, 200, "Fetched Successfully", responseData);
  } catch (err) {
    return next(err);
  }
};

// Get All public elections
const getAllElections = async (req, res, next) => {
  try {
    const elections = await Election.find({
      status: { $in: ["scheduled", "ongoing", "closed"] },
    }).sort({ createdAt: -1 });

    // Filter: show closed only if publicResults is true
    const publicElections = elections.filter(
      (e) => e.status === "closed" && e.publicResults === true,
    );

    const responseData = {
      total: publicElections.length,
      elections: publicElections,
    };

    return successResponse(res, 200, "Fetched Successfully", responseData);
  } catch (err) {
    return next(err);
  }
};

// Cast Vote
const castVote = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;
    const { candidateId } = req.body;
    const voterId = req.user.id;

    const voter = await User.findById(voterId);
    if (!voter) {
      return errorResponse(res, 404, "User Not Found");
    }

    // check if this SRN is eligible for this election
    const eligible = await EligibleVoter.findOne({
      electionId,
      srn: voter.srn,
    });

    if (!eligible) {
      return errorResponse(
        res,
        403,
        "You are not eligible to vote in this election",
      );
    }

    // chech if candidate is valid
    if (!candidateId) {
      return errorResponse(res, 400, "candidateId is required");
    }

    // chech if election is valid
    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    if (election.status !== "ongoing") {
      return errorResponse(
        res,
        409,
        "Voting is not open for this election or closed",
      );
    }

    // rule for only single vote
    const existingVote = await Vote.findOne({ electionId, voterId });

    if (existingVote) {
      return errorResponse(res, 409, "You have already voted in this election");
    }

    // check if candidate belong to the election
    const candidate = await Candidate.findOne({
      _id: candidateId,
      electionId,
    });

    if (!candidate) {
      return errorResponse(res, 400, "Invalid candidate");
    }

    // cast vote
    const vote = new Vote({
      electionId,
      positionName: election.positionName,
      candidateId,
      voterId,
    });

    const savedVote = await vote.save();
    return successResponse(res, 200, "Vote Casted Successfully", savedVote);
  } catch (err) {
    return next(err);
  }
};

// Get Election Results
const getResults = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;

    // Load election
    const election = await Election.findById(electionId).select(
      "title positionName status publicResults",
    );

    if (!election) {
      return errorResponse(res, 404, "Election Not Found");
    }

    // Only show results when closed or public
    if (election.status !== "closed") {
      return errorResponse(
        res,
        403,
        "The election is still ongoing. Results will be available after it closes.",
      );
    }

    // Only show results when closed or public
    if (election.publicResults !== true) {
      return errorResponse(
        res,
        403,
        "Results are currently being verified by the administrator.",
      );
    }

    // Total votes in this election
    const totalVotes = await Vote.countDocuments({ electionId });

    const resultsAgg = await Vote.aggregate([
      { $match: { electionId } },
      {
        $group: {
          _id: "$candidateId",
          votes: { $sum: 1 },
        },
      },
      { $sort: { votes: -1 } },
      {
        $lookup: {
          from: "candidates",
          localField: "_id",
          foreignField: "_id",
          as: "candidate",
        },
      },
      { $unwind: "$candidate" },
      {
        $project: {
          _id: 0,
          candidateId: "$_id",
          displayName: "$candidate.displayName",
          votes: 1,
        },
      },
    ]);

    // Add percentages
    const results = resultsAgg.map((r) => ({
      candidateId: r.candidateId,
      displayName: r.displayName,
      votes: r.votes,
      percentage: totalVotes
        ? Number(((r.votes / totalVotes) * 100).toFixed(2))
        : 0,
    }));

    // Determine winners (handles ties)
    const maxVotes = results.length ? results[0].votes : 0;
    const winners = results.filter((r) => r.votes === maxVotes);

    const responseData = {
      election: {
        id: election._id,
        title: election.title,
        positionName: election.positionName,
      },
      totalVotes,
      results,
      winners,
    };

    return successResponse(
      res,
      200,
      "Results Fetched Successfully",
      responseData,
    );
  } catch (err) {
    return next(err);
  }
};

// Get Candidate by Election ID
const getCandidatesByElection = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;

    // check election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    // get candidates
    const candidates = await Candidate.find({ electionId });
    const responseData = {
      election: {
        id: election._id,
        title: election.title,
        positionName: election.positionName,
        status: election.status,
      },
      totalCandidates: candidates.length,
      candidates,
    };

    return successResponse(
      res,
      200,
      "Candidates Fetched Successfully",
      responseData,
    );
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getActiveElections,
  getElectionBallot,
  getAllElections,
  castVote,
  getResults,
  getCandidatesByElection,
};
