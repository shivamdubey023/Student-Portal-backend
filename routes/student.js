const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Submission = require('../models/Submission');

router.use(requireAuth('student'));

// Get student's assigned courses with assignment/exam progress
router.get('/courses', async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).populate('courses.courseId', 'title assignments exams certificateFee');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const now = new Date();
    const courses = student.courses.map(c => {
      const course = c.courseId;
      const totalAssignments = course.assignments.length;
      const totalExams = course.exams.length;
      const completedAssignments = c.assignmentsCompleted.length;
      const submittedAssignments = c.assignmentsSubmitted.length;
      const completedExams = c.examsCompleted.length;
      const passedExams = c.examsPassed.length;

      // Calculate assignment statuses
      const activeAssignments = course.assignments.filter(a => new Date(a.dueDate) > now).length;
      const upcomingAssignments = course.assignments.filter(a => new Date(a.dueDate) > now && !c.assignmentsSubmitted.includes(a.order)).length;
      const missedAssignments = course.assignments.filter(a => new Date(a.dueDate) < now && !c.assignmentsSubmitted.includes(a.order)).length;

      // Calculate exam statuses
      const activeExams = course.exams.filter(e => new Date(e.dueDate) > now).length;
      const upcomingExams = course.exams.filter(e => new Date(e.dueDate) > now && !c.examsCompleted.includes(e.order)).length;
      const missedExams = course.exams.filter(e => new Date(e.dueDate) < now && !c.examsCompleted.includes(e.order)).length;

      return {
        courseId: course._id,
        title: course.title,
        expiresAt: c.expiresAt,
        active: c.active && (!c.expiresAt || c.expiresAt > now),
        assignments: {
          total: totalAssignments,
          completed: completedAssignments,
          submitted: submittedAssignments,
          active: activeAssignments,
          upcoming: upcomingAssignments,
          missed: missedAssignments
        },
        exams: {
          total: totalExams,
          completed: completedExams,
          passed: passedExams,
          active: activeExams,
          upcoming: upcomingExams,
          missed: missedExams
        },
        eligibleForCertificate: completedAssignments >= totalAssignments && passedExams >= totalExams,
        certificateIssued: c.certificateIssued,
        certificateFee: course.certificateFee
      };
    });

    return res.json({ userId: student.userId, name: student.name, courses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get assignments for a course
router.get('/course/:courseId/assignments', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const student = await Student.findById(req.user.id);
    const assigned = student.courses.find(c => c.courseId.toString() === req.params.courseId);
    if (!assigned) return res.status(404).json({ message: 'Course not assigned' });

    if (assigned.expiresAt && new Date() > assigned.expiresAt) {
      return res.status(403).json({ message: 'Access expired' });
    }

    const now = new Date();
    const assignments = course.assignments
      .filter(a => a.isVisible && new Date(a.releaseDate) <= now) // Only show visible assignments that are released
      .map(a => ({
        order: a.order,
        title: a.title,
        description: a.description,
        blogLinks: a.blogLinks,
        githubLinks: a.githubLinks,
        studyMaterials: a.studyMaterials,
        dueDate: a.dueDate,
        repositoryUrl: a.repositoryUrl,
        instructions: a.instructions,
        week: a.week,
        submitted: assigned.assignmentsSubmitted.includes(a.order),
        completed: assigned.assignmentsCompleted.includes(a.order)
      }))
      .sort((a, b) => a.order - b.order); // Sort by order

    return res.json(assignments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Submit assignment
router.post('/course/:courseId/assignment/:order/submit', async (req, res) => {
  try {
    const { courseId, order } = req.params;
    const { repositoryUrl, pullRequestUrl } = req.body;

    if (!repositoryUrl) return res.status(400).json({ message: 'Repository URL required' });

    const student = await Student.findById(req.user.id);
    const assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned) return res.status(404).json({ message: 'Course not assigned' });

    // Check if already submitted
    if (assigned.assignmentsSubmitted.includes(Number(order))) {
      return res.status(400).json({ message: 'Assignment already submitted' });
    }

    const submission = new Submission({
      type: 'assignment',
      assignmentSubmission: {
        studentId: student._id,
        courseId,
        assignmentOrder: Number(order),
        repositoryUrl,
        pullRequestUrl
      }
    });

    await submission.save();

    // Mark as submitted
    assigned.assignmentsSubmitted.push(Number(order));
    await student.save();

    return res.json({ message: 'Assignment submitted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get exam details
router.get('/course/:courseId/exam/:order', async (req, res) => {
  try {
    const { courseId, order } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const student = await Student.findById(req.user.id);
    const assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned) return res.status(404).json({ message: 'Course not assigned' });

    const exam = course.exams.find(e => e.order === Number(order));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Check if already completed
    if (assigned.examsCompleted.includes(Number(order))) {
      return res.status(400).json({ message: 'Exam already completed' });
    }

    // Check if due date passed
    if (new Date() > new Date(exam.dueDate)) {
      return res.status(400).json({ message: 'Exam deadline passed' });
    }

    return res.json({
      title: exam.title,
      description: exam.description,
      questions: exam.questions.map(q => ({
        question: q.question,
        options: q.options
      })),
      duration: exam.duration,
      dueDate: exam.dueDate
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Submit exam
router.post('/course/:courseId/exam/:order/submit', async (req, res) => {
  try {
    const { courseId, order } = req.params;
    const { answers, timeTaken } = req.body;

    const course = await Course.findById(courseId);
    const exam = course.exams.find(e => e.order === Number(order));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const student = await Student.findById(req.user.id);
    const assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned) return res.status(404).json({ message: 'Course not assigned' });

    // Calculate score
    let correctAnswers = 0;
    exam.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) correctAnswers++;
    });

    const score = Math.round((correctAnswers / exam.questions.length) * 100);
    const passed = score >= exam.passingScore;

    const submission = new Submission({
      type: 'exam',
      examSubmission: {
        studentId: student._id,
        courseId,
        examOrder: Number(order),
        answers,
        score,
        passed,
        timeTaken: timeTaken || exam.duration
      }
    });

    await submission.save();

    // Update student progress
    assigned.examsCompleted.push(Number(order));
    if (passed) {
      assigned.examsPassed.push(Number(order));
    }
    await student.save();

    return res.json({
      message: 'Exam submitted',
      score,
      passed,
      correctAnswers,
      totalQuestions: exam.questions.length
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
