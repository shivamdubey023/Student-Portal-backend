const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['student', 'admin'] },
  name: { type: String },
  email: { type: String },
  locked: { type: Boolean, default: false }
}, { timestamps: true });

// Compound unique index: username + role must be unique
UserSchema.index({ username: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);