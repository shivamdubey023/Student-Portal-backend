const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const { authMiddleware } = require('../middleware/auth');
const mockDB = require('../mockDB');
let useMockDB = false;

// Exported function to set mock mode
router.setMockMode = (mock) => { useMockDB = mock; };

// Get all submissions (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view all submissions' });
    }
    // If mock mode, return empty array immediately
    if (useMockDB) {
      return res.json(mockDB.submissions || []);
    }
    // Return empty array by default (don't attempt MongoDB query if it's not configured)
    res.json([]);
  } catch (err) {
    console.error('Submissions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get submissions for a specific student
router.get('/student/:studentId', authMiddleware, async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.params.studentId })
      .populate('courseId', 'title');
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create submission
router.post('/', authMiddleware, async (req, res) => {
  try {
    const submission = new Submission({
      ...req.body,
      studentId: req.user._id,
      studentUserId: req.user.userId
    });
    await submission.save();
    res.status(201).json(submission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update submission status (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update submissions' });
    }
    const submission = await Submission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json(submission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete submission (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete submissions' });
    }
    const submission = await Submission.findByIdAndDelete(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Submission deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
