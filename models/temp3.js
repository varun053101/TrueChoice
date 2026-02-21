const mongoose = require("mongoose");

const EligibleVoterSchema = new mongoose.Schema({
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true,
  },

  // SRN of the eligible voter
  srn: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

module.exports = mongoose.model("EligibleVoter", EligibleVoterSchema);
