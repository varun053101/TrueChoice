// models/Election.js
const mongoose = require('mongoose');

const ElectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  positionName: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    default: ""
  },

  // draft | scheduled | ongoing | closed
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'ongoing', 'closed'],
    default: 'draft'
  },

  // When election can start and end
  startTime: {
    type: Date,
    required: true
  },

  endTime: {
    type: Date,
    required: true
  },

  // Public visibility for results after closing
  publicResults: {
    type: Boolean,
    default: false
  },

  // Admin or Superadmin who created it
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto update updatedAt
ElectionSchema.pre('save', function (next) {
  if (!this.isNew) this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Election', ElectionSchema);
