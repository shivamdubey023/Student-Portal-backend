const express = require('express');
const jwt = require('jsonwebtoken');
const Course = require('../models/Course');
const PurchaseRequest = require('../models/PurchaseRequest');
const PlatformSettings = require('../models/PlatformSettings');
const db = require('../db');

const router = express.Router();

let useMockDB = false;
router.setMockMode = (mock) => { useMockDB = mock; };

const defaultSettings = () => ({
  brandName: db.platformSettings.brandName,
  supportEmail: db.platformSettings.supportEmail,
  supportPhone: db.platformSettings.supportPhone,
  whatsappNumber: db.platformSettings.whatsappNumber,
  whatsappBotEnabled: db.platformSettings.whatsappBotEnabled,
  whatsappAutomationNote: db.platformSettings.whatsappAutomationNote,
  internshipHeadline: db.platformSettings.internshipHeadline,
  paymentMethods: db.platformSettings.paymentMethods
});

const getSettings = async () => {
  if (useMockDB) {
    return defaultSettings();
  }

  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = await PlatformSettings.create(defaultSettings());
  }
  return settings;
};

const extractUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return '';
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_this_to_a_strong_secret');
    return payload.userId || payload.id || '';
  } catch (error) {
    return '';
  }
};

router.get('/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load platform settings' });
  }
});

router.post('/purchase-requests', async (req, res) => {
  try {
    const {
      courseId,
      fullName,
      email,
      phone,
      city,
      learnerGoal,
      note,
      paymentMethodId,
      paymentReference,
      wantsWhatsAppUpdates,
      requestType,
      requestedByUserId
    } = req.body;

    if (!courseId || !fullName || !email || !paymentMethodId) {
      return res.status(400).json({ message: 'courseId, fullName, email, and paymentMethodId are required' });
    }

    const course = useMockDB
      ? db.courses.find((item) => item._id === courseId)
      : await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const settings = await getSettings();
    const paymentMethod = (settings.paymentMethods || []).find((item) => item.id === paymentMethodId && item.isEnabled);
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Selected payment method is not available' });
    }

    const cleanRequest = {
      courseId,
      requestedByUserId: requestedByUserId || extractUserId(req) || '',
      fullName,
      email,
      phone: phone || '',
      city: city || '',
      learnerGoal: learnerGoal || '',
      note: note || '',
      paymentMethodId,
      paymentMethodLabel: paymentMethod.label,
      paymentReference: paymentReference || '',
      wantsWhatsAppUpdates: wantsWhatsAppUpdates !== false,
      requestType: requestType || 'course'
    };

    if (useMockDB) {
      const purchaseRequest = {
        _id: String(db.purchaseRequests.length + 1),
        ...cleanRequest,
        status: 'pending',
        adminNotes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        courseSnapshot: {
          title: course.title,
          price: course.price || 0,
          salePrice: course.salePrice || 0,
          enrollmentType: course.enrollmentType || 'paid'
        }
      };
      db.purchaseRequests.unshift(purchaseRequest);
      return res.status(201).json({
        message: 'Purchase request created',
        requestId: purchaseRequest._id,
        paymentInstructions: paymentMethod.instructions
      });
    }

    const purchaseRequest = await PurchaseRequest.create(cleanRequest);
    return res.status(201).json({
      message: 'Purchase request created',
      requestId: purchaseRequest._id,
      paymentInstructions: paymentMethod.instructions
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to create purchase request' });
  }
});

module.exports = router;
