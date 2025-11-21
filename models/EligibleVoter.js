const mongoose = require('mongoose');

const EligibleVoterSchema = new mongoose.Schema({
  srn: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  email: {
    type: String,
    default: null,
    trim: true,
    lowercase: true
  },

  name: {
    type: String,
    default: null,
    trim: true
  },

  note: {
    type: String,
    default: null
  },

  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  addedAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
});

module.exports = mongoose.model('EligibleVoter', EligibleVoterSchema);
