const mongoose = require('mongoose');

const AssignedCourseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  assignedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  modulesCompleted: { type: [Number], default: [] },
  active: { type: Boolean, default: true }
});

const StudentSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String },
  password: { type: String, required: true },
  rollId: { type: String, unique: true, sparse: true },
  studentId: { type: String, unique: true, sparse: true },
  role: { type: String, default: 'student' },
  locked: { type: Boolean, default: false },
  courses: { type: [AssignedCourseSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
