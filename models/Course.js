const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['mini', 'major', 'git'], default: 'mini' },
  marks: { type: Number, default: 10 },
  blogLinks: { type: [String], default: [] },
  githubLinks: { type: [String], default: [] },
  studyMaterials: { type: [String], default: [] },
  dueDate: { type: Date, required: true },
  repositoryUrl: { type: String, required: true },
  instructions: { type: String, required: true },
  order: { type: Number, required: true },
  week: { type: Number, required: true },
  releaseDate: { type: Date, required: true },
  isVisible: { type: Boolean, default: true }
});

const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  marks: { type: Number, default: 20 },
  questions: [{
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true }
  }],
  passingScore: { type: Number, default: 70 },
  duration: { type: Number, default: 60 },
  dueDate: { type: Date, required: true },
  order: { type: Number, required: true },
  week: { type: Number, required: true },
  releaseDate: { type: Date, required: true },
  isVisible: { type: Boolean, default: true }
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  overview: { type: String },
  price: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  learningFormat: { type: String, enum: ['course', 'internship'], default: 'course' },
  enrollmentType: { type: String, enum: ['paid', 'free', 'certificate-only'], default: 'paid' },
  duration: { type: String, default: '1 Month' },
  mode: { type: String, enum: ['Remote', 'In-Person', 'Hybrid'], default: 'Remote' },
  category: { type: String, default: 'Core Training' },
  tools: { type: [String], default: [] },
  learnTopics: { type: [String], default: [] },
  highlights: { type: [String], default: [] },
  outcomes: { type: [String], default: [] },
  certification: { type: String },
  certificateFee: { type: Number, default: 59 },
  internshipDetails: {
    certificateOnly: { type: Boolean, default: false },
    stipend: { type: String, default: '' },
    mentorSupport: { type: String, default: '' },
    hiringSupport: { type: String, default: '' }
  },
  validityMonths: { type: Number, default: 1 },
  marksDistribution: {
    mcq: { type: Number, default: 20 },
    mini: { type: Number, default: 10 },
    major: { type: Number, default: 30 },
    git: { type: Number, default: 30 }
  },
  assignments: { type: [AssignmentSchema], default: [] },
  exams: { type: [ExamSchema], default: [] },
  enrolledCount: { type: Number, default: 0 },
  startDate: { type: Date },
  totalWeeks: { type: Number, default: 4 }
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
