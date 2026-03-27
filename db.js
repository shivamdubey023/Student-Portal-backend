// In-memory mock database for MVP testing
// Replace with MongoDB when ready

const admins = [
  { id: '1', username: 'Ankit', email: 'ankit@example.com', password: '$2a$10$f8Ak5LlPRomRl8/1vKMIxevV5QTZIVAc1lr7f5lMklp96ji7Y/YDu', role: 'admin' } // bcrypt hash of '0806'
];

const students = [
  { id: '1', userId: 'Sreya', username: 'Sreya', email: 'sreya@example.com', password: '$2a$10$f8Ak5LlPRomRl8/1vKMIxevV5QTZIVAc1lr7f5lMklp96ji7Y/YDu', role: 'student', locked: false, courses: [] } // bcrypt hash of '0806'
];

const courses = [];
const submissions = [];
const purchaseRequests = [];
const platformSettings = {
  brandName: 'SIH Learn',
  supportEmail: 'admissions@sihlearn.com',
  supportPhone: '+91 90000 00000',
  whatsappNumber: '+91 90000 00000',
  whatsappBotEnabled: true,
  whatsappAutomationNote: 'Send payment instructions, enrollment confirmation, and internship updates automatically.',
  internshipHeadline: 'Join job-ready internships and pay only for your certificate when the track requires it.',
  paymentMethods: [
    {
      id: 'qr',
      label: 'QR Payment',
      type: 'qr',
      instructions: 'Share the QR screenshot and transaction reference after payment.',
      qrCodeUrl: '',
      paymentLink: '',
      recipient: 'Accounts Team',
      isEnabled: true
    },
    {
      id: 'online',
      label: 'Online Payment Link',
      type: 'link',
      instructions: 'Use the secure payment link and keep your payment reference handy.',
      qrCodeUrl: '',
      paymentLink: '',
      recipient: 'Accounts Team',
      isEnabled: true
    },
    {
      id: 'email',
      label: 'Email Confirmation',
      type: 'email',
      instructions: 'Mail your payment intent and our team will send manual payment steps.',
      qrCodeUrl: '',
      paymentLink: 'mailto:admissions@sihlearn.com',
      recipient: 'admissions@sihlearn.com',
      isEnabled: true
    }
  ]
};

module.exports = {
  admins,
  students,
  courses,
  submissions,
  purchaseRequests,
  platformSettings
};
