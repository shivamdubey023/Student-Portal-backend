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
  price: { type: Number, default: 0 },
  durationMonths: { type: Number, default: 2 },
  modules: { type: [ModuleSubSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
