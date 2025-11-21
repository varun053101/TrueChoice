const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },

  positionName: {
    type: String,
    required: true,
    trim: true
  },

  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },

  voterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  castAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

module.exports = mongoose.model('Vote', VoteSchema);
