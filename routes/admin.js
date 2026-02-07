const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const StudentProgress = require('../models/StudentProgress');
const mockDB = require('../db');

let useMockDB = false;

// Exported function to set mock mode
router.setMockMode = (mock) => { useMockDB = mock; };

const generateCourseCode = (courseName) => {
  if (!courseName) return 'XXXX';
  const words = courseName.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0].toUpperCase()).join('').substring(0, 3);
};

const generateStudentIds = async (courseId) => {
  const count = await Student.countDocuments() + 2001;
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();

  let courseCode = 'XXXX';
  if (courseId) {
    try {
      const course = await Course.findById(courseId);
      if (course) courseCode = generateCourseCode(course.title);
    } catch (e) {
      console.warn('Could not fetch course for code generation:', e.message);
    }
  }

  return {
    rollId: `${courseCode}-${count}`,
    studentId: `SIH-${courseCode}-${year}-${day}-${count}`
  };
};

// Middleware: admin only
router.use(requireAuth('admin'));

// Get all students
router.get('/students', async (req, res) => {
  try {
    if (useMockDB) {
      return res.json(mockDB.students);
    } else {
      const students = await Student.find({}).populate('userId', 'username name email locked');
      const normalized = students.map(s => {
        const user = s.userId || {};
        return {
          ...s.toObject(),
          username: user.username,
          name: user.name,
          email: user.email,
          locked: user.locked
        };
      });
      return res.json(normalized);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Create student
router.post('/students', async (req, res) => {
  const { username, name, email, password, assignedCourses = [] } = req.body;
  try {
    const uid = username || `S${Date.now()}`;
    
    if (useMockDB) {
      // Check if student already exists in mock DB
      const existing = mockDB.students.find(s => s.username === uid || s.userId === uid);
      if (existing) return res.status(400).json({ error: 'user already exists' });
      
      // Generate rollId for mock DB
      const count = mockDB.students.length + 2001;
      const rollId = `STD-${count}`;
      
      // Hash password for mock DB (consistent with real DB)
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create student in mock DB
      const student = {
        id: String(mockDB.students.length + 1),
        userId: uid,
        username: uid,
        name: name || uid,
        email: email || `${uid}@example.com`,
        password: hashedPassword, // Store hashed password
        rollId: rollId,
        locked: false,
        assignedCourses: []
      };
      
      mockDB.students.push(student);
      return res.json({ student: { rollId: rollId } });
    }
    
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

    const existingUser = await User.findOne({ username, role: 'student' });
    if (existingUser) return res.status(400).json({ error: 'user already exists' });
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(400).json({ error: 'email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashed,
      role: 'student',
      name,
      email
    });
    await user.save();

    let courseValidityMap = new Map();
    if (Array.isArray(assignedCourses) && assignedCourses.length > 0) {
      const courseDocs = await Course.find({ _id: { $in: assignedCourses } }, 'validityMonths');
      courseValidityMap = new Map(courseDocs.map(c => [String(c._id), c.validityMonths]));
    }

    const courses = Array.isArray(assignedCourses) ? assignedCourses.map(courseId => {
      const months = courseValidityMap.get(String(courseId));
      let expiresAt = null;
      if (typeof months === 'number' && months > 0) {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);
      }
      return {
        courseId,
        assignedAt: new Date(),
        expiresAt,
        active: true,
        assignmentsCompleted: [],
        assignmentsSubmitted: [],
        examsCompleted: [],
        examsPassed: []
      };
    }) : [];

    const ids = await generateStudentIds(assignedCourses[0]);
    const student = new Student({
      userId: user._id,
      ...ids,
      courses
    });
    await student.save();
    return res.json({ student: { rollId: ids.rollId, studentId: ids.studentId } });
  } catch (err) {
    console.error(err);
    if (err && err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ error: `${field} already exists` });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete student (admin decides)
router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (useMockDB) {
      const index = mockDB.students.findIndex(s => s._id === id || s.id === id || s.userId === id);
      if (index === -1) return res.status(404).json({ error: 'Student not found' });
      mockDB.students.splice(index, 1);
      return res.json({ message: 'Student deleted' });
    }

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    await Student.findByIdAndDelete(id);
    if (student.userId) {
      await User.findByIdAndDelete(student.userId);
    }
    return res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Lock/unlock student
router.post('/students/:userId/lock', async (req, res) => {
  const { userId } = req.params;
  const { lock } = req.body; // true or false
  try {
    const s = await Student.findOne({ userId });
    if (!s) return res.status(404).json({ message: 'Student not found' });
    s.locked = !!lock;
    await s.save();
    return res.json({ message: lock ? 'Locked' : 'Unlocked' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create course
router.post('/courses', async (req, res) => {
  try {
    const { title, description, price, durationMonths, modules } = req.body;
    const course = new Course({ title, description, price, durationMonths, modules });
    await course.save();
    return res.json({ message: 'Course created', courseId: course._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Assign course to student with duration logic
router.post('/students/:userId/assign', async (req, res) => {
  const { userId } = req.params;
  const { courseId } = req.body;
  try {
    const student = await Student.findOne({ userId });
    const course = await Course.findById(courseId);
    if (!student || !course) return res.status(404).json({ message: 'Student or Course not found' });

    // Access validity based on course setting (0 or null = lifetime)
    let expiresAt = null;
    const months = course.validityMonths;
    if (typeof months === 'number' && months > 0) {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
    }

    student.courses.push({ courseId: course._id, expiresAt, modulesCompleted: [], active: true });
    await student.save();
    return res.json({ message: 'Course assigned', expiresAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Set access duration manually
router.post('/students/:userId/course/:courseId/duration', async (req, res) => {
  const { userId, courseId } = req.params;
  const { months } = req.body;
  try {
    const student = await Student.findOne({ userId });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned) return res.status(404).json({ message: 'Assigned course not found' });
    if (!months) {
      assigned.expiresAt = null;
    } else {
      const now = new Date();
      const ex = new Date();
      ex.setMonth(now.getMonth() + months);
      assigned.expiresAt = ex;
    }
    await student.save();
    return res.json({ message: 'Duration updated', expiresAt: assigned.expiresAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// View all submissions
router.get('/submissions', async (req, res) => {
  try {
    const subs = await Submission.find().populate('studentId', 'userId name').populate('courseId', 'title');
    return res.json(subs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Add assignment to course
router.post('/courses/:courseId/assignments', async (req, res) => {
  const { courseId } = req.params;
  const { title, description, type, blogLinks, githubLinks, studyMaterials, dueDate, repositoryUrl, instructions, order, week, releaseDate } = req.body;
  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const assignmentType = type === 'major' ? 'major' : (type === 'git' ? 'git' : 'mini');
    const currentMini = course.assignments.filter(a => a.type === 'mini').length;
    const currentMajor = course.assignments.filter(a => a.type === 'major').length;
    const currentGit = course.assignments.filter(a => a.type === 'git').length;
    if (assignmentType === 'mini' && currentMini >= 2) {
      return res.status(400).json({ message: 'Only 2 mini projects allowed' });
    }
    if (assignmentType === 'major' && currentMajor >= 1) {
      return res.status(400).json({ message: 'Only 1 major project allowed' });
    }
    if (assignmentType === 'git' && currentGit >= 1) {
      return res.status(400).json({ message: 'Only 1 git task allowed' });
    }

    course.assignments.push({
      title,
      description,
      type: assignmentType,
      marks: assignmentType === 'major' ? 30 : assignmentType === 'git' ? 30 : 10,
      blogLinks: blogLinks || [],
      githubLinks: githubLinks || [],
      studyMaterials: studyMaterials || [],
      dueDate: new Date(dueDate),
      repositoryUrl,
      instructions,
      order: order || course.assignments.length + 1,
      week: week || 1,
      releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
      isVisible: true
    });

    await course.save();
    return res.json({ message: 'Assignment added', assignmentId: course.assignments[course.assignments.length - 1]._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Add exam to course
router.post('/courses/:courseId/exams', async (req, res) => {
  const { courseId } = req.params;
  const { title, description, questions, passingScore, duration, dueDate, order, week, releaseDate } = req.body;
  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    course.exams.push({
      title,
      description,
      questions,
      passingScore: passingScore || 70,
      duration: duration || 60,
      dueDate: new Date(dueDate),
      order: order || course.exams.length + 1,
      week: week || 1,
      releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
      isVisible: true
    });

    await course.save();
    return res.json({ message: 'Exam added', examId: course.exams[course.exams.length - 1]._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create module for a course
router.post('/courses/:courseId/modules', async (req, res) => {
  const { courseId } = req.params;
  const { title, order } = req.body;
  try {
    if (!title || typeof order !== 'number') {
      return res.status(400).json({ message: 'title and order are required' });
    }
    const module = new Module({ courseId, title, order });
    await module.save();
    return res.json({ message: 'Module created', moduleId: module._id });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) return res.status(400).json({ message: 'Module order already exists' });
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create lesson under a module
router.post('/modules/:moduleId/lessons', async (req, res) => {
  const { moduleId } = req.params;
  const { title, contentId, order, locked } = req.body;
  try {
    if (!title || !contentId || typeof order !== 'number') {
      return res.status(400).json({ message: 'title, contentId, and order are required' });
    }
    const lesson = new Lesson({ moduleId, title, contentId, order, locked: !!locked });
    await lesson.save();
    return res.json({ message: 'Lesson created', lessonId: lesson._id });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) return res.status(400).json({ message: 'Lesson order already exists' });
    return res.status(500).json({ message: 'Server error' });
  }
});

// Review assignment submission
router.post('/submissions/:submissionId/review', async (req, res) => {
  const { submissionId } = req.params;
  const { status, feedback } = req.body;
  try {
    const submission = await Submission.findById(submissionId);
    if (!submission || submission.type !== 'assignment') {
      return res.status(404).json({ message: 'Assignment submission not found' });
    }

    submission.assignmentSubmission.status = status;
    submission.assignmentSubmission.feedback = feedback;
    submission.assignmentSubmission.reviewedAt = new Date();

    // Update student's progress if approved
    if (status === 'Approved') {
      const student = await Student.findById(submission.assignmentSubmission.studentId);
      const courseAssignment = student.courses.find(c => c.courseId.toString() === submission.assignmentSubmission.courseId.toString());
      if (courseAssignment && !courseAssignment.assignmentsCompleted.includes(submission.assignmentSubmission.assignmentOrder)) {
        courseAssignment.assignmentsCompleted.push(submission.assignmentSubmission.assignmentOrder);
      }
    }

    await submission.save();
    return res.json({ message: 'Submission reviewed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Issue certificate
router.post('/students/:userId/course/:courseId/certificate', async (req, res) => {
  const { userId, courseId } = req.params;
  try {
    const student = await Student.findOne({ userId });
    const course = await Course.findById(courseId);
    if (!student || !course) return res.status(404).json({ message: 'Student or course not found' });

    const courseAssignment = student.courses.find(c => c.courseId.toString() === courseId);
    if (!courseAssignment) return res.status(404).json({ message: 'Course not assigned' });

    // Check eligibility: lessons + MCQ + 2 mini + 1 major
    const totalExams = course.exams.length;
    const passedExams = courseAssignment.examsPassed.length;
    const completedMini = courseAssignment.assignmentsCompleted.filter(order => {
      const a = course.assignments.find(x => x.order === order);
      return a?.type === 'mini';
    }).length;
    const completedMajor = courseAssignment.assignmentsCompleted.filter(order => {
      const a = course.assignments.find(x => x.order === order);
      return a?.type === 'major';
    }).length;
    const completedGit = courseAssignment.assignmentsCompleted.filter(order => {
      const a = course.assignments.find(x => x.order === order);
      return a?.type === 'git';
    }).length;
    const progress = await StudentProgress.findOne({ userId: student.userId, courseId: course._id });
    const totalLessons = await Lesson.aggregate([
      { $lookup: { from: 'modules', localField: 'moduleId', foreignField: '_id', as: 'module' } },
      { $unwind: '$module' },
      { $match: { 'module.courseId': course._id } },
      { $count: 'total' }
    ]);
    const totalLessonCount = totalLessons[0]?.total || 0;
    const completedLessons = progress?.completedLessons?.length || 0;

    if (completedLessons < totalLessonCount || passedExams < totalExams || completedMini < 2 || completedMajor < 1 || completedGit < 1) {
      return res.status(400).json({ message: 'Student not eligible for certificate' });
    }

    // Generate certificate number
    const certificateNumber = `CERT-${Date.now()}-${userId}`;

    const certificateSubmission = new Submission({
      type: 'certificate',
      certificate: {
        studentId: student._id,
        courseId: course._id,
        certificateNumber,
        paymentStatus: 'Pending',
        paymentAmount: course.certificateFee
      }
    });

    await certificateSubmission.save();
    courseAssignment.certificateIssued = true;
    await student.save();

    return res.json({ message: 'Certificate issued', certificateNumber });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
