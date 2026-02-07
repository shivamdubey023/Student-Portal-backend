const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
  title: { type: String, required: true },
  contentId: { type: String, required: true }, // External CMS/Blog content reference
  contentText: { type: String }, // Generated content stored locally (optional)
  order: { type: Number, required: true },
  locked: { type: Boolean, default: false }
}, { timestamps: true });

LessonSchema.index({ moduleId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Lesson', LessonSchema);
