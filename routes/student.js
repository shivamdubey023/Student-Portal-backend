const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Submission = require('../models/Submission');

router.use(requireAuth('student'));

// Get student's assigned courses and statuses
router.get('/courses', async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).populate('courses.courseId', 'title price durationMonths modules');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    // Check expiry and lock
    const now = new Date();
    const courses = student.courses.map(c => ({
      courseId: c.courseId._id,
      title: c.courseId.title,
      expiresAt: c.expiresAt,
      active: c.active && (!c.expiresAt || c.expiresAt > now),
      modulesCompleted: c.modulesCompleted
    }));
    return res.json({ userId: student.userId, name: student.name, courses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get modules for a course, enforce progression
router.get('/course/:courseId/modules', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const student = await Student.findById(req.user.id);
    const assigned = student.courses.find(c => c.courseId.toString() === req.params.courseId);
    if (!assigned) return res.status(404).json({ message: 'Course not assigned' });

    // check expiry
    if (assigned.expiresAt && new Date() > assigned.expiresAt) return res.status(403).json({ message: 'Access expired' });

    const completed = new Set(assigned.modulesCompleted || []);
    // Determine next module index (modules are ordered by 'order')
    const sorted = course.modules.sort((a,b)=>a.order-b.order);
    const modulesResponse = sorted.map(m => ({
      order: m.order,
      title: m.title,
      videoUrl: m.videoUrl,
      contentText: m.contentText,
      task: m.task,
      optionalProject: m.optionalProject,
      unlocked: (m.order === 1) || completed.has(m.order) || completed.has(m.order - 1)
    }));

    // Enforce strict progression: unlocked only if previous completed
    const final = modulesResponse.map((m, idx) => {
      if (m.order === 1) m.unlocked = true;
      else m.unlocked = completed.has(m.order - 1);
      return m;
    });

    return res.json(final);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Mark module as completed (student action)
router.post('/course/:courseId/module/:order/complete', async (req, res) => {
  try {
    const { courseId, order } = req.params;
    const student = await Student.findById(req.user.id);
    const assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned) return res.status(404).json({ message: 'Course not assigned' });
    // Check progression: can only complete module N if N-1 is completed or N==1
    const n = Number(order);
    if (n !== 1 && !assigned.modulesCompleted.includes(n-1)) {
      return res.status(403).json({ message: 'Previous module not completed' });
    }
    if (!assigned.modulesCompleted.includes(n)) assigned.modulesCompleted.push(n);
    await student.save();
    return res.json({ message: 'Module marked complete' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Submit project/task link
router.post('/course/:courseId/module/:order/submit', async (req, res) => {
  try {
    const { courseId, order } = req.params;
    const { link } = req.body;
    if (!link) return res.status(400).json({ message: 'Submission link required' });
    const student = await Student.findById(req.user.id);
    const assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned) return res.status(404).json({ message: 'Course not assigned' });
    const sub = new Submission({ studentId: student._id, studentUserId: student.userId, courseId, moduleOrder: Number(order), link });
    await sub.save();
    return res.json({ message: 'Submitted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
