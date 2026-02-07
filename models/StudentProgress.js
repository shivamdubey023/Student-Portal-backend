const mongoose = require('mongoose');

const StudentProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  completedLessons: { type: [mongoose.Schema.Types.ObjectId], ref: 'Lesson', default: [] },
  lastLessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
  startedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

StudentProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('StudentProgress', StudentProgressSchema);
