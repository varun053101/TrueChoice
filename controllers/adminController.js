const mongoose = require("mongoose");
const Election = require("../models/election");
const Candidate = require("../models/candidate");
const Vote = require("../models/vote");
const EligibleVoter = require("../models/eligibleVoter");
const { successResponse, errorResponse } = require("../utils/response");

// Create an Election
const createElection = async (req, res, next) => {
  try {
    const { title, positionName, description, startTime, endTime } = req.body;

    // Check if EveryThing is Valid
    if (!title || !positionName || !startTime || !endTime) {
      return errorResponse(
        res,
        400,
        "title, positionName, startTime and endTime are required",
      );
    }

    // Create a date object
    const s = new Date(startTime);
    const e = new Date(endTime);
    const now = new Date();

    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return errorResponse(res, 400, "Invalid startTime or endTime");
    }

    // If start date is in the past
    // We subtract 60000ms (1 min) to allow for slight network delay
    if (s < new Date(now.getTime() - 60000)) {
      return errorResponse(res, 422, "startTime cannot be in the past");
    }

    // If start date is after end date
    if (s >= e) {
      return errorResponse(res, 422, "startTime must be before endTime");
    }

    // Create Election Data
    const election = new Election({
      title,
      positionName,
      description: description || "",
      status: "draft",
      startTime: s,
      endTime: e,
      publicResults: false,
      createdBy: req.user.id,
    });

    // Save Data
    const responseData = await election.save();
    return successResponse(res, 201, "Election created", {
      election: responseData,
    });
  } catch (err) {
    return next(err);
  }
};

// Update Election Details
const updateElection = async (req, res, next) => {
  try {
    const { electionId } = req.params;

    if (!mongoose.isValidObjectId(electionId)) {
      return errorResponse(res, 400, "Invalid election ID");
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    // Only allow edits when election is in draft
    if (election.status !== "draft") {
      return errorResponse(
        res,
        400,
        "Election can only be edited while it is in draft state",
      );
    }

    // Check if all the entries are undefined
    if (Object.keys(req.body).length === 0) {
      return errorResponse(res, 400, "Updation Fields are empty");
    }

    const { title, positionName, description, startTime, endTime } = req.body;

    // Check if all the entries are empty
    if (!title && !positionName && !description && !startTime && !endTime) {
      return errorResponse(res, 400, "Updation Fields are empty");
    }

    // Basic field updates
    if (title) election.title = title.trim();
    if (positionName) election.positionName = positionName.trim();
    if (typeof description === "string") election.description = description;

    const s = election.startTime;
    const e = election.endTime;
    const now = new Date();

    //update startTime
    if (startTime) {
      const parsed = new Date(startTime);
      if (isNaN(parsed.getTime())) {
        return errorResponse(res, 400, "Invalid start-time format");
      }
      s = parsed;
    }

    // update endTime
    if (endTime) {
      const parsed = new Date(endTime);
      if (isNaN(parsed.getTime())) {
        return errorResponse(res, 400, "Invalid end-time format");
      }
      e = parsed;
    }

    // Validate time relation

    // Start time cannot be past
    if (s < now) {
      return errorResponse(res, 422, "startTime cannot be in the past");
    }

    if (s && e && s >= e) {
      return errorResponse(res, 400, "startTime must be before endTime");
    }

    election.startTime = s;
    election.endTime = e;

    const responseData = await election.save();

    return successResponse(res, 200, "Election updated successfully", {
      election: responseData,
    });
  } catch (err) {
    return next(err);
  }
};

// Schedule the election
const scheduleElection = async (req, res, next) => {
  try {
    const { electionId } = req.params;

    if (!mongoose.isValidObjectId(electionId)) {
      return errorResponse(res, 400, "Invalid election ID");
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 400, "Election not found");
    }

    if (election.status !== "draft") {
      return errorResponse(
        res,
        409,
        "Only draft elections can be moved to scheduled",
      );
    }

    const now = new Date();

    if (!election.startTime || !election.endTime) {
      return errorResponse(
        res,
        422,
        "Election must have startTime and endTime set before scheduling",
      );
    }

    if (election.startTime <= now) {
      return errorResponse(
        res,
        422,
        "startTime must be in the future to schedule the election",
      );
    }

    if (election.endTime <= election.startTime) {
      return errorResponse(res, 422, "endTime must be after startTime");
    }

    election.status = "scheduled";
    const responseData = await election.save();

    return successResponse(res, 200, "Election scheduled successfully", {
      election: responseData,
    });
  } catch (err) {
    return next(err);
  }
};

// Force Start the Election
const startElection = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;
    const { forceStart } = req.body || {};

    if (!forceStart) {
      return errorResponse(
        res,
        422,
        'This endpoint only supports forceStart. Send { "forceStart": true } in body.',
      );
    }

    if (!mongoose.isValidObjectId(electionId)) {
      return errorResponse(res, 400, "Invalid election ID");
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    if (election.status === "closed") {
      return errorResponse(res, 409, "Cannot start a closed election");
    }

    if (election.status === "ongoing") {
      return errorResponse(res, 409, "Election is already ongoing");
    }

    if (election.status !== "scheduled") {
      return errorResponse(
        res,
        409,
        "Election must be scheduled before it can be force-started",
      );
    }

    const now = new Date();

    if (election.endTime && election.endTime <= now) {
      return errorResponse(
        res,
        422,
        "Cannot start election because endTime has already passed",
      );
    }

    election.startTime = now;
    election.startedAt = now;
    election.status = "ongoing";

    const responseData = await election.save();
    return successResponse(res, 200, "Election force-started successfully", {
      election: responseData,
    });
  } catch (err) {
    return next(err);
  }
};

// Force Close the Election
const closeElection = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;
    const { forceClose } = req.body || {};

    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    // Only allow forceClose
    if (!forceClose) {
      return errorResponse(
        res,
        422,
        "Election will close automatically at endTime. Use forceClose=true to close early.",
      );
    }

    // Already closed
    if (election.status === "closed") {
      return errorResponse(res, 409, "Election is already closed");
    }

    const now = new Date();

    election.endTime = now;
    election.closedAt = now;
    election.status = "closed";

    const responseData = await election.save();

    return successResponse(res, 200, "Election force-closed", {
      election: responseData,
    });
  } catch (err) {
    return next(err);
  }
};

// Publish Results
const publishResults = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;

    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    // Only closed elections can publish results
    if (election.status !== "closed") {
      return errorResponse(
        res,
        409,
        "Results can only be published after the election is closed",
      );
    }

    // If already public no change required
    if (election.publicResults === true) {
      return errorResponse(res, 409, "Results are already public");
    }

    // Apply patch update
    election.publicResults = true;
    await election.save();

    return successResponse(res, 201, "Results published successfully", {});
  } catch (err) {
    return next(err);
  }
};

// Create Candidate
const createCandidate = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;
    const { displayName, manifesto, photoUrl } = req.body;

    // Must have their Name
    if (!displayName) {
      return errorResponse(res, 400, "displayName is required");
    }

    // Check if election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    // check election status
    if (election.status === "closed") {
      return errorResponse(
        res,
        409,
        "Cannot add candidates. Election is already closed.",
      );
    }

    if (election.status === "ongoing") {
      return errorResponse(
        res,
        409,
        "Cannot add candidates after voting has started.",
      );
    }

    // Create candidate
    const candidate = new Candidate({
      electionId,
      displayName: displayName.trim(),
      manifesto: manifesto || "",
      photoUrl: photoUrl || null,
    });

    const responseData = await candidate.save();
    return successResponse(res, 201, "Candidate created successfully", {
      candidate: responseData,
    });
  } catch (err) {
    return next(err);
  }
};

// Delete a Candidate
const deleteCandidate = async (req, res, next) => {
  try {
    const candidateId = req.params.candidateId;

    // 1) Find candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return errorResponse(res, 404, "Candidate not found");
    }

    // 2)Check election status
    const election = await Election.findById(candidate.electionId).select(
      "status title",
    );

    if (!election) {
      return errorResponse(res, 404, "Associated election not found");
    }

    // Only allow delete while election is in draft
    if (election.status !== "draft") {
      return errorResponse(
        res,
        409,
        "Cannot delete candidate after election setup has finished (only allowed in draft status)",
      );
    }

    // 3) Prevent deletion if votes exist
    const voteCount = await Vote.countDocuments({
      candidateId: candidate._id,
    });

    if (voteCount > 0) {
      return errorResponse(
        res,
        409,
        `Cannot delete candidate: ${voteCount} vote(s) already recorded`,
      );
    }

    // 4) Delete candidate
    await Candidate.deleteOne({ _id: candidate._id });
    return successResponse(res, 200, "Candidate deleted successfully", {
      candidateId: candidate._id.toString(),
    });
  } catch (err) {
    return next(err);
  }
};

// Upload Eleigible Voters List
const uploadEligibleVoters = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;

    // ckeck if election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    //check if file is uploaded
    if (!req.file) {
      return errorResponse(res, 400, "CSV file is required (field name: file)");
    }

    // Ensure it's actually a CSV
    if (
      req.file.mimetype !== "text/csv" &&
      !req.file.originalname.endsWith(".csv")
    ) {
      return errorResponse(
        res,
        400,
        "Invalid file type. Please upload a CSV file.",
      );
    }

    // Convert file buffer to string
    const content = req.file.buffer.toString("utf-8");

    // Split into lines
    const lines = content.split(/\r?\n/);

    const srnRegex = /^R\d{2}[A-Za-z]{2}\d{3}$/;

    const srns = [];
    for (let line of lines) {
      const raw = line.trim();
      if (!raw) continue; // skip if empty

      const srn = raw.toUpperCase();

      // validate SRN format
      if (!srnRegex.test(srn)) {
        // skip invalid lines.
        console.log("Skipping invalid SRN line:", raw);
        continue;
      }

      srns.push(srn);
    }

    if (srns.length === 0) {
      return errorResponse(res, 400, "No valid SRNs found in file");
    }

    // Remove duplicates
    const uniqueSrns = Array.from(new Set(srns));

    // Delete old eligible voters for this election if exists
    await EligibleVoter.deleteMany({ electionId });

    // 7) Insert new eligible voters
    const docs = uniqueSrns.map((srn) => ({
      electionId,
      srn,
    }));

    await EligibleVoter.insertMany(docs);

    const responseData = {
      totalLines: lines.length,
      validSrns: srns.length,
      uniqueSrns: uniqueSrns.length,
      duplicatesRemoved: srns.length - uniqueSrns.length,
    };

    return successResponse(res, 201, "Eligible voters uploaded successfully", {
      summary: responseData,
    });
  } catch (err) {
    return next(err);
  }
};

// Get a list of all the elections
const listElections = async (req, res, next) => {
  try {
    //all elections sorted by creation time (newest first)
    const elections = await Election.find().sort({ createdAt: -1 });

    // Add candidate and eligible voter counts for each election
    const electionsWithCounts = await Promise.all(
      elections.map(async (election) => {
        const candidateCount = await Candidate.countDocuments({
          electionId: election._id,
        });
        const eligibleCount = await EligibleVoter.countDocuments({
          electionId: election._id,
        });

        return {
          ...election.toObject(),
          candidateCount,
          eligibleCount,
        };
      }),
    );

    return successResponse(res, 200, "Elections fetched successfully", {
      total: electionsWithCounts.length,
      elections: electionsWithCounts,
    });
  } catch (err) {
    return next(err);
  }
};

// Get the details of specific election
const getElectionDetails = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;

    if (!mongoose.Object.isValidObjectId(electionId)) {
      return errorResponse(res, 400, "Invalid Election id");
    }

    //load election
    const election = await Election.findById(electionId).select(
      "title positionName description status startTime endTime publicResults createdBy createdAt",
    );

    if (!election) {
      return errorResponse(res, 404, "Election not found");
    }

    //candidates for this election
    const candidates = await Candidate.find({ electionId }).select(
      "displayName manifesto photoUrl createdAt",
    );

    //quick stats - including eligible voter count
    const totalCandidates = candidates.length;
    const totalVotes = await Vote.countDocuments({ electionId });
    const eligibleCount = await EligibleVoter.countDocuments({ electionId });

    return successResponse(res, 200, "Fetched Election Details Successfully", {
      election,
      stats: {
        totalCandidates,
        totalVotes,
        eligibleCount,
      },
      candidates,
    });
  } catch (err) {
    return next(err);
  }
};

// Get Results of the Election
const getAdminResults = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;

    // Get total votes
    const totalVotes = await Vote.countDocuments({ electionId });

    // Aggregate votes per candidate
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

    // Calculate percentages
    const results = resultsAgg.map((r) => ({
      candidateId: r.candidateId,
      displayName: r.displayName,
      votes: r.votes,
      percentage: totalVotes
        ? Number(((r.votes / totalVotes) * 100).toFixed(2))
        : 0,
    }));

    return successResponse(res, 200, "Results Fetched", {
      totalVotes,
      results,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
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
};
