const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { authMiddleware } = require('../middleware/auth');
const mockDB = require('../mockDB');
let useMockDB = false;

// Exported function to set mock mode
router.setMockMode = (mock) => { useMockDB = mock; };

// Helper to generate course code from course name
const generateCourseCode = (courseName) => {
  if (!courseName) return 'XXXX';
  // If single word, take first 3 letters
  const words = courseName.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  // If multiple words, take first letter of each word
  return words.map(w => w[0].toUpperCase()).join('').substring(0, 3);
};

// Helper to generate rollId and studentId
// Format: 
// Certificate ID: SIH-FST-2026-22-2001 (SIH constant, course code, year, date, count)
// Roll ID: FST-2001 (course code, count)
const generateStudentIds = async (courseId) => {
  if (useMockDB) {
    const count = mockDB.students.length + 2001; // Start counting from 2001
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    
    // If we have a course, get its code; otherwise use default
    let courseCode = 'XXXX';
    if (courseId && mockDB.courses && mockDB.courses.length > 0) {
      const course = mockDB.courses.find(c => c._id === courseId);
      if (course) {
        courseCode = generateCourseCode(course.title);
      }
    }
    
    return {
      rollId: `${courseCode}-${count}`,
      studentId: `SIH-${courseCode}-${year}-${day}-${count}`
    };
  }
  
  const count = await Student.countDocuments() + 2001;
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();
  
  let courseCode = 'XXXX';
  if (courseId) {
    try {
      const Course = require('../models/Course');
      const course = await Course.findById(courseId);
      if (course) {
        courseCode = generateCourseCode(course.title);
      }
    } catch (e) {
      console.warn('Could not fetch course for code generation:', e.message);
    }
  }
  
  return {
    rollId: `${courseCode}-${count}`,
    studentId: `SIH-${courseCode}-${year}-${day}-${count}`
  };
};

const generateStudentIds_old = async () => {
  if (useMockDB) {
    const count = mockDB.students.length;
    const num = String(count + 1).padStart(3, '0');
    const year = new Date().getFullYear();
    return {
      rollId: `SI-FST-${year}-${num}`,
      studentId: `SI-${year}-${num}`
    };
  }
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
    if (useMockDB) {
      const students = mockDB.students.map(s => {
        const { password, ...rest } = s;
        return rest;
      });
      return res.json(students);
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
    
    // Build courses array with assigned courses
    const courses = [];
    let primaryCourseId = null;
    if (req.body.assignedCourses && Array.isArray(req.body.assignedCourses)) {
      primaryCourseId = req.body.assignedCourses[0]; // Use first assigned course for ID generation
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
    
    // Generate IDs with course info
    const ids = await generateStudentIds(primaryCourseId);
    
    if (useMockDB) {
      const newStudent = {
        _id: String(mockDB.students.length + 1),
        id: String(mockDB.students.length + 1),
        userId: req.body.username,
        ...req.body,
        ...ids,
        courses,
        role: 'student',
        locked: false
      };
      mockDB.students.push(newStudent);
      const { password, ...rest } = newStudent;
      return res.status(201).json({ message: 'Student created', student: rest });
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
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    if (useMockDB) {
      const index = mockDB.students.findIndex(s => s._id === req.params.id || s.id === req.params.id);
      if (index === -1) return res.status(404).json({ error: 'Student not found' });
      mockDB.students.splice(index, 1);
      return res.json({ message: 'Student deleted' });
    }
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
