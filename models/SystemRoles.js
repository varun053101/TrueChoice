const mongoose = require('mongoose');

const SystemRolesSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'roles'
  },

  superadminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SystemRoles', SystemRolesSchema);
