const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { jwtAuthMiddleware } = require('../auth/jwt');
const { requireAdmin } = require('../middlewares/Roles');
const Election = require('../models/Election');
const Candidate = require("../models/Candidate");
const Vote = require("../models/Vote");
const EligibleVoter = require("../models/EligibleVoter")
const multer = require('multer'); // for file uploads

// Create an election
router.post('/elections/create', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const { title, positionName, description, startTime, endTime } = req.body;

    // Check if EveryThing is Valid
    if (!title || !positionName || !startTime || !endTime) {
      return res.status(400).json({ error: 'title, positionName, startTime and endTime are required' });
    }

    // Create a date object
    const s = new Date(startTime);
    const e = new Date(endTime);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return res.status(400).json({ error: 'Invalid startTime or endTime' });
    }

    // If start date is after end date
    if (s >= e) {
      return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    // Create Election Data
    const election = new Election({
      title,
      positionName,
      description: description || '',
      status: 'draft',
      startTime: s,
      endTime: e,
      publicResults: false,
      createdBy: req.user.id
    });

    // Save Data
    const saved = await election.save();

    return res.status(201).json({ message: 'Election created', election: saved });
  } catch (err) {
    console.error('Create election error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create candidates
router.post(
  '/elections/:electionId/candidates/create',
  jwtAuthMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const electionId = req.params.electionId;
      const { displayName, manifesto, photoUrl } = req.body;

      // Must have their Name
      if (!displayName) {
        return res.status(400).json({ error: "displayName is required" });
      }

      // Check if election exists
      const election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ error: "Election not found" });
      }

      // check election status
      if (election.status === "closed") {
        return res.status(400).json({
          error: "Cannot add candidates. Election is already closed."
        });
      }

      if (election.status === "ongoing") {
        return res.status(400).json({
          error: "Cannot add candidates after voting has started."
        });
      }

      // Create candidate
      const candidate = new Candidate({
        electionId,
        displayName: displayName.trim(),
        manifesto: manifesto || "",
        photoUrl: photoUrl || null,
        createdAt: new Date()
      });

      const savedCandidate = await candidate.save();

      return res.status(201).json({
        message: "Candidate created successfully",
        candidate: savedCandidate
      });
    } catch (err) {
      console.error("Create candidate error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);


// Upload Eligible Voters List for specific Position
// Store file in memory (buffer) not on disk
const upload = multer({ storage: multer.memoryStorage() });

// Upload a CSV file containing SRN for this election.
router.post(
  '/elections/:electionId/eligible/upload',
  jwtAuthMiddleware,
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      const electionId = req.params.electionId;

      // ckeck if election exists
      const election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ error: 'Election not found' });
      }

      //check if file is uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required (field name: file)' });
      }

      // Convert file buffer to string
      const content = req.file.buffer.toString('utf-8');

      // Split into lines
      const lines = content.split(/\r?\n/);

      const srnRegex = /^R\d{2}[A-Za-z]{2}\d{3}$/; // same rule as used before

      const srns = [];
      for (let line of lines) {
        const raw = line.trim();
        if (!raw) continue; // skip if empty 

        const srn = raw.toUpperCase();

        // validate SRN format
        if (!srnRegex.test(srn)) {
          // skip invalid lines.
          console.log('Skipping invalid SRN line:', raw);
          continue;
        }

        srns.push(srn);
      }

      if (srns.length === 0) {
        return res.status(400).json({ error: 'No valid SRNs found in file' });
      }

      // Remove duplicates
      const uniqueSrns = Array.from(new Set(srns));

      // Delete old eligible voters for this election if exists
      await EligibleVoter.deleteMany({ electionId });

      // 7) Insert new eligible voters
      const docs = uniqueSrns.map(srn => ({
        electionId,
        srn
      }));

      await EligibleVoter.insertMany(docs);

      return res.status(200).json({
        message: 'Eligible voters uploaded successfully',
        totalLines: lines.length,
        validSrns: srns.length,
        uniqueSrns: uniqueSrns.length
      });

    } catch (err) {
      console.error('Eligible upload error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);


// Force start the election 
router.post('/elections/:electionId/start', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const { forceStart } = req.body || {};

    if (!forceStart) {
      return res.status(400).json({
        error: 'This endpoint only supports forceStart. Send { "forceStart": true } in body.'
      });
    }

    if (!mongoose.isValidObjectId(electionId)) {
      return res.status(400).json({ error: 'Invalid election ID' });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (election.status === 'closed') {
      return res.status(400).json({ error: 'Cannot start a closed election' });
    }

    if (election.status === 'ongoing') {
      return res.status(400).json({ error: 'Election is already ongoing' });
    }

    if (election.status !== 'scheduled') {
      return res.status(400).json({
        error: 'Election must be scheduled before it can be force-started'
      });
    }

    const now = new Date();

    if (election.endTime && election.endTime <= now) {
      return res.status(400).json({
        error: 'Cannot start election because endTime has already passed'
      });
    }

    election.startTime = now;
    election.startedAt = now;
    election.status = 'ongoing';

    const savedElection = await election.save();

    return res.status(200).json({
      message: 'Election force-started successfully',
      election: savedElection
    });
  } catch (err) {
    console.error('Start election error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Force close the election
router.post('/elections/:electionId/close', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const { forceClose } = req.body || {};

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Only allow forceClose
    if (!forceClose) {
      return res.status(400).json({
        error: 'Election will close automatically at endTime. Use forceClose=true to close early.'
      });
    }

    // Already closed
    if (election.status === 'closed') {
      return res.status(400).json({ error: 'Election is already closed' });
    }

    const now = new Date();

    election.endTime = now;
    election.closedAt = now; 
    election.status = 'closed';

    const savedElection = await election.save();

    return res.status(200).json({
      message: 'Election force-closed',
      election: savedElection
    });
  } catch (err) {
    console.error('Close election error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Move from draft to scheduled
router.patch('/elections/:electionId/schedule', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    if (!mongoose.isValidObjectId(electionId)) {
      return res.status(400).json({ error: 'Invalid election ID' });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (election.status !== 'draft') {
      return res.status(400).json({
        error: 'Only draft elections can be moved to scheduled'
      });
    }

    const now = new Date();

    if (!election.startTime || !election.endTime) {
      return res.status(400).json({
        error: 'Election must have startTime and endTime set before scheduling'
      });
    }

    if (election.startTime <= now) {
      return res.status(400).json({
        error: 'startTime must be in the future to schedule the election'
      });
    }

    if (election.endTime <= election.startTime) {
      return res.status(400).json({
        error: 'endTime must be after startTime'
      });
    }

    election.status = 'scheduled';
    const saved = await election.save();

    return res.status(200).json({
      message: 'Election scheduled successfully',
      election: saved
    });
  } catch (err) {
    console.error('Schedule election error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update election details ONLY when status is 'draft'
router.patch('/elections/:electionId', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const { electionId } = req.params;

    if (!mongoose.isValidObjectId(electionId)) {
      return res.status(400).json({ error: 'Invalid election ID' });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Only allow edits when election is in draft
    if (election.status !== 'draft') {
      return res.status(400).json({
        error: 'Election can only be edited while it is in draft state'
      });
    }

    const {
      title,
      positionName,
      description,
      startTime,
      endTime,
      publicResults
    } = req.body;

    // Basic field updates 
    if (title) election.title = title.trim();
    if (positionName) election.positionName = positionName.trim();
    if (typeof description === 'string') election.description = description;

    let s = election.startTime;
    let e = election.endTime;

    //update startTime
    if (startTime) {
      const parsed = new Date(startTime);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid startTime format' });
      }
      s = parsed;
    }

    // update endTime
    if (endTime) {
      const parsed = new Date(endTime);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid endTime format' });
      }
      e = parsed;
    }

    // Validate time relation
    if (s && e && s >= e) {
      return res.status(400).json({ error: 'startTime must be before endTime' });
    }

    election.startTime = s;
    election.endTime = e;

    if (typeof publicResults === 'boolean') {
      election.publicResults = publicResults;
    }

    const saved = await election.save();

    return res.status(200).json({
      message: 'Election updated successfully',
      election: saved
    });
  } catch (err) {
    console.error('Update election error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Get candidates by specific elections
router.get('/elections/:electionId/candidates', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    // check election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }

    // get candidates
    const candidates = await Candidate.find({ electionId });

    return res.status(200).json({
      election: {
        id: election._id,
        title: election.title,
        positionName: election.positionName,
        status: election.status
      },
      totalCandidates: candidates.length,
      candidates
    });

  } catch (err) {
    console.error("List candidates error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// Delete Candidate befole election started
router.delete('/candidates/:candidateId', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    // 1) Find candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // 2)Check election status
    const election = await Election.findById(candidate.electionId).select('status title');
    if (!election) {
      return res.status(404).json({ error: 'Associated election not found' });
    }

    // Only allow delete while election is in draft
    if (election.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot delete candidate after election setup has finished (only allowed in draft status)' });
    }

    // 3) Prevent deletion if votes exist
    const voteCount = await Vote.countDocuments({ candidateId: candidate._id });
    if (voteCount > 0) {
      return res.status(400).json({ error: `Cannot delete candidate: ${voteCount} vote(s) already recorded` });
    }

    // 4) Delete candidate
    await Candidate.deleteOne({ _id: candidate._id });

    return res.status(200).json({ message: 'Candidate deleted successfully', candidateId: candidate._id.toString() });
  } catch (err) {
    console.error('Delete candidate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List of elections

router.get('/elections', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    //all elections sorted by creation time (newest first)
    const elections = await Election.find().sort({ createdAt: -1 });

    return res.status(200).json({
      total: elections.length,
      elections
    });

  } catch (err) {
    console.error('List elections error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Specific Election Details
router.get('/elections/:electionId', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const electionId = req.params.electionId;
    //load election
    const election = await Election.findById(electionId).select(
      'title positionName description status startTime endTime publicResults createdBy createdAt'
    );
    if (!election) return res.status(404).json({ error: 'Election not found' });
    //candidates for this election
    const candidates = await Candidate.find({ electionId }).select('displayName manifesto photoUrl createdAt');
    //quick stats - including eligible voter count
    const totalCandidates = candidates.length;
    const totalVotes = await Vote.countDocuments({ electionId });
    const eligibleCount = await EligibleVoter.countDocuments({ electionId });
    return res.status(200).json({
      election,
      stats: {
        totalCandidates,
        totalVotes,
        eligibleCount
      },
      candidates
    });
  } catch (err) {
    console.error('Get election details error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Enables public visibility of results for a closed election
router.patch('/elections/:electionId/publish-results', jwtAuthMiddleware, requireAdmin, async (req, res) => {

    try {
      const electionId = req.params.electionId;

      const election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ error: 'Election not found' });
      }

      // Only closed elections can publish results
      if (election.status !== 'closed') {
        return res.status(400).json({
          error: 'Results can only be published after the election is closed'
        });
      }

      // If already public no change required
      if (election.publicResults === true) {
        return res.status(200).json({
          message: 'Results are already public',
          election
        });
      }

      // Apply patch update
      election.publicResults = true;
      await election.save();

      return res.status(200).json({
        message: 'Results published successfully',
        election
      });
    } catch (err) {
      console.error('Publish results error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);



module.exports = router;
