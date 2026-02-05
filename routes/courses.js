const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db');
let useMockDB = false;

// Exported function to set mock mode (called from server.js on DB failure)
router.setMockMode = (mock) => { useMockDB = mock; };

// Get all courses
router.get('/', async (req, res) => {
  try {
    if (useMockDB) {
      return res.json(mockDB.courses);
    }
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    if (useMockDB) {
      const course = db.courses.find(c => c._id === req.params.id);
      if (!course) return res.status(404).json({ error: 'Course not found' });
      return res.json(course);
    }
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create course (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create courses' });
    }
    if (useMockDB) {
      const course = { _id: String(db.courses.length + 1), ...req.body };
      db.courses.push(course);
      return res.status(201).json(course);
    }
    const course = new Course(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update course (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update courses' });
    }
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete course (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete courses' });
    }
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
