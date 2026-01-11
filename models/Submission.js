const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentUserId: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  moduleOrder: { type: Number, required: true },
  link: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['Submitted','Reviewed','Approved','Rejected'], default: 'Submitted' }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
