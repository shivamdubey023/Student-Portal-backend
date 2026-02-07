const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title: { type: String, required: true },
  order: { type: Number, required: true }
}, { timestamps: true });

ModuleSchema.index({ courseId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Module', ModuleSchema);
