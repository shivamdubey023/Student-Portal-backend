const mongoose = require('mongoose');

const ModuleSubSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  title: { type: String, required: true },
  videoUrl: { type: String },
  contentText: { type: String },
  task: { type: String },
  optionalProject: { type: Boolean, default: false }
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  overview: { type: String },
  duration: { type: String, default: '2 Months' },
  mode: { type: String, enum: ['Remote', 'In-Person', 'Hybrid'], default: 'Remote' },
  category: { type: String, default: 'Core Training' },
  tools: { type: [String], default: [] },
  learnTopics: { type: [String], default: [] },
  projects: { type: Object, default: { minor: [], major: null } },
  certification: { type: String },
  price: { type: Number, default: 0 },
  durationMonths: { type: Number, default: 2 },
  modules: { type: [ModuleSubSchema], default: [] },
  enrolledCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
