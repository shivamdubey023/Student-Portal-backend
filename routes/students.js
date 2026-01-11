const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { authMiddleware } = require('../middleware/auth');

// Helper to generate rollId and studentId
const generateStudentIds = async () => {
  const count = await Student.countDocuments();
  const num = String(count + 1).padStart(3, '0');
  const year = new Date().getFullYear();
  return {
    rollId: `SI-FST-${year}-${num}`,
    studentId: `SI-${year}-${num}`
  };
};

// Get all students (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view all students' });
    }
    const students = await Student.find().select('-password');
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student profile (self or admin)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.userId !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot view other student profiles' });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create student (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create students' });
    }
    const ids = await generateStudentIds();
    
    // Build courses array with assigned courses
    const courses = [];
    if (req.body.assignedCourses && Array.isArray(req.body.assignedCourses)) {
      for (const courseId of req.body.assignedCourses) {
        courses.push({
          courseId,
          assignedAt: new Date(),
          expiresAt: null,
          modulesCompleted: [],
          active: true
        });
      }
    }
    
    const student = new Student({ 
      ...req.body, 
      ...ids,
      courses 
    });
    await student.save();
    res.status(201).json({ message: 'Student created', student });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update student (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update students' });
    }
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete student (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete students' });
    }
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
