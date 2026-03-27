const mongoose = require('mongoose');

const PurchaseRequestSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  requestedByUserId: { type: String, default: '' },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  learnerGoal: { type: String, default: '' },
  note: { type: String, default: '' },
  paymentMethodId: { type: String, default: '' },
  paymentMethodLabel: { type: String, default: '' },
  paymentReference: { type: String, default: '' },
  wantsWhatsAppUpdates: { type: Boolean, default: true },
  requestType: { type: String, enum: ['course', 'internship', 'certificate'], default: 'course' },
  status: { type: String, enum: ['pending', 'contacted', 'approved', 'rejected'], default: 'pending' },
  adminNotes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseRequest', PurchaseRequestSchema);
