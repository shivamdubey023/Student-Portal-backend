const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Submission = require('../models/Submission');
const mockDB = require('../mockDB');

let useMockDB = false;

// Exported function to set mock mode
router.setMockMode = (mock) => { useMockDB = mock; };

// Middleware: admin only
router.use(requireAuth('admin'));

// Get all students
router.get('/students', async (req, res) => {
  try {
    if (useMockDB) {
      return res.json(mockDB.students);
    } else {
      const students = await Student.find({});
      return res.json(students);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Create student
router.post('/students', async (req, res) => {
  const { username, name, email, password } = req.body;
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
    
    // ensure both userId and username are set so older flows continue to work
    const existing = await Student.findOne({ $or: [{ userId: uid }, { username: uid }] });
    if (existing) return res.status(400).json({ error: 'user already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const student = new Student({ userId: uid, username: uid, name, email, password: hashed });
    await student.save();
    return res.json({ student: { rollId: uid } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete student (admin decides)
router.delete('/students/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await Student.findOneAndDelete({ userId });
    return res.json({ message: 'Student deleted (if existed)' });
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

    // Pricing logic
    let expiresAt = null;
    if (course.price === 100 || course.price === 200) {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year
    } else if (course.price === 600) {
      expiresAt = null; // lifetime; interpret null as no expiry
    } else {
      const months = course.durationMonths || 2;
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
  const { title, description, blogLinks, githubLinks, studyMaterials, dueDate, repositoryUrl, instructions, order, week, releaseDate } = req.body;
  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    course.assignments.push({
      title,
      description,
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

    // Check eligibility
    const totalAssignments = course.assignments.length;
    const totalExams = course.exams.length;
    const completedAssignments = courseAssignment.assignmentsCompleted.length;
    const passedExams = courseAssignment.examsPassed.length;

    if (completedAssignments < totalAssignments || passedExams < totalExams) {
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
