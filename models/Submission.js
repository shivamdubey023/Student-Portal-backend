const mongoose = require('mongoose');

const AssignmentSubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  assignmentOrder: { type: Number, required: true },
  repositoryUrl: { type: String, required: true }, // GitHub repository URL
  pullRequestUrl: { type: String }, // Pull request URL
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Submitted','Reviewed','Approved','Rejected'], default: 'Submitted' },
  score: { type: Number },
  maxScore: { type: Number },
  feedback: { type: String },
  reviewedAt: { type: Date },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
});

const ExamSubmissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  examOrder: { type: Number, required: true },
  answers: { type: [Number], required: true }, // Array of selected option indices
  score: { type: Number, required: true }, // Percentage score
  passed: { type: Boolean, required: true },
  submittedAt: { type: Date, default: Date.now },
  timeTaken: { type: Number } // Minutes
});

const CertificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  issuedAt: { type: Date, default: Date.now },
  certificateNumber: { type: String, required: true, unique: true },
  paymentStatus: { type: String, enum: ['Pending','Paid','Failed'], default: 'Pending' },
  paymentAmount: { type: Number, default: 59 }
});

// Main Submission model that can contain either assignment or exam submissions
const SubmissionSchema = new mongoose.Schema({
  type: { type: String, enum: ['assignment', 'exam', 'certificate'], required: true },
  assignmentSubmission: AssignmentSubmissionSchema,
  examSubmission: ExamSubmissionSchema,
  certificate: CertificateSchema
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
