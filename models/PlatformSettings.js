const mongoose = require('mongoose');

const PaymentMethodSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['qr', 'link', 'email', 'bank'], default: 'link' },
  instructions: { type: String, default: '' },
  qrCodeUrl: { type: String, default: '' },
  paymentLink: { type: String, default: '' },
  recipient: { type: String, default: '' },
  isEnabled: { type: Boolean, default: true }
}, { _id: false });

const PlatformSettingsSchema = new mongoose.Schema({
  brandName: { type: String, default: 'SIH Learn' },
  supportEmail: { type: String, default: 'admissions@sihlearn.com' },
  supportPhone: { type: String, default: '+91 90000 00000' },
  whatsappNumber: { type: String, default: '+91 90000 00000' },
  whatsappBotEnabled: { type: Boolean, default: true },
  whatsappAutomationNote: { type: String, default: 'Send payment instructions, enrollment confirmation, and internship updates automatically.' },
  internshipHeadline: { type: String, default: 'Join job-ready internships and pay only for your certificate when the track requires it.' },
  paymentMethods: { type: [PaymentMethodSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
