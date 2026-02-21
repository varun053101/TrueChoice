const mongoose = require("mongoose");

const CandidateSchema = new mongoose.Schema({
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Election",
    required: true,
  },

  displayName: {
    type: String,
    required: true,
    trim: true,
  },

  manifesto: {
    type: String,
    default: "",
  },

  photoUrl: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-update updatedAt
CandidateSchema.pre("save", function (next) {
  if (!this.isNew) this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Candidate", CandidateSchema);
