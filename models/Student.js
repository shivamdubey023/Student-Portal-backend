const mongoose = require('mongoose');

const AssignedCourseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  assignedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  active: { type: Boolean, default: true },
  // Track assignment progress
  assignmentsCompleted: { type: [Number], default: [] }, // Array of assignment orders completed
  assignmentsSubmitted: { type: [Number], default: [] }, // Array of assignment orders submitted
  // Track exam progress
  examsCompleted: { type: [Number], default: [] }, // Array of exam orders completed
  examsPassed: { type: [Number], default: [] }, // Array of exam orders passed
  // Certificate eligibility
  eligibleForCertificate: { type: Boolean, default: false },
  certificateIssued: { type: Boolean, default: false }
});

const StudentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  rollId: { type: String, unique: true, sparse: true },
  studentId: { type: String, unique: true, sparse: true },
  isSuper: { type: Boolean, default: false },
  courses: { type: [AssignedCourseSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
