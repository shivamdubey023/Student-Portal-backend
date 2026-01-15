const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  blogLinks: { type: [String], default: [] },
  githubLinks: { type: [String], default: [] },
  studyMaterials: { type: [String], default: [] }, // URLs to study materials
  dueDate: { type: Date, required: true },
  repositoryUrl: { type: String, required: true }, // GitHub repo for submissions
  instructions: { type: String, required: true }, // Step-by-step submission instructions
  order: { type: Number, required: true },
  week: { type: Number, required: true }, // Week number (1-4 for one month)
  releaseDate: { type: Date, required: true }, // When this assignment becomes visible to students
  isVisible: { type: Boolean, default: true } // Admin can hide assignments if needed
});

const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  questions: [{
    question: { type: String, required: true },
    options: { type: [String], required: true }, // 4 options
    correctAnswer: { type: Number, required: true }, // Index of correct option (0-3)
  }],
  passingScore: { type: Number, default: 70 }, // Percentage
  duration: { type: Number, default: 60 }, // Minutes
  dueDate: { type: Date, required: true },
  order: { type: Number, required: true },
  week: { type: Number, required: true }, // Week number when exam becomes available
  releaseDate: { type: Date, required: true }, // When this exam becomes visible to students
  isVisible: { type: Boolean, default: true } // Admin can hide exams if needed
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  overview: { type: String },
  duration: { type: String, default: '1 Month' }, // Changed to 1 Month
  mode: { type: String, enum: ['Remote', 'In-Person', 'Hybrid'], default: 'Remote' },
  category: { type: String, default: 'Core Training' },
  tools: { type: [String], default: [] },
  learnTopics: { type: [String], default: [] },
  certification: { type: String },
  certificateFee: { type: Number, default: 59 }, // ₹59
  assignments: { type: [AssignmentSchema], default: [] },
  exams: { type: [ExamSchema], default: [] },
  enrolledCount: { type: Number, default: 0 },
  startDate: { type: Date }, // Course start date for calculating weeks
  totalWeeks: { type: Number, default: 4 } // Total weeks in the program
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
