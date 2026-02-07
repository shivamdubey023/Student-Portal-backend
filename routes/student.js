const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Submission = require('../models/Submission');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const StudentProgress = require('../models/StudentProgress');
const { fetchLessonContent } = require('../services/content');
const { generateOutline, rephraseContent, evaluateAssignment } = require('../services/cohere');

router.use(requireAuth('student'));

// Get student's assigned courses with assignment/exam progress
router.get('/courses', async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id })
      .populate('courses.courseId', 'title assignments exams certificateFee')
      .populate('userId', 'name');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const now = new Date();
    let courses = [];
    if (student.isSuper) {
      const allCourses = await Course.find();
      const assignedMap = new Map(student.courses.map(c => [String(c.courseId), c]));
      const allCourseIds = allCourses.map(c => c._id);
      const lessonCounts = await Lesson.aggregate([
        { $lookup: { from: 'modules', localField: 'moduleId', foreignField: '_id', as: 'module' } },
        { $unwind: '$module' },
        { $match: { 'module.courseId': { $in: allCourseIds } } },
        { $group: { _id: '$module.courseId', total: { $sum: 1 } } }
      ]);
      const lessonCountMap = new Map(lessonCounts.map(l => [String(l._id), l.total]));
      const progressDocs = await StudentProgress.find({ userId: req.user.id, courseId: { $in: allCourseIds } });
      const progressMap = new Map(progressDocs.map(p => [String(p.courseId), p]));

      courses = allCourses.map(course => {
        const assigned = assignedMap.get(String(course._id));
        const progress = progressMap.get(String(course._id));
        const totalLessons = lessonCountMap.get(String(course._id)) || 0;
        const completedLessons = progress?.completedLessons?.length || 0;
        const progressPct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
        const completedAssignments = assigned?.assignmentsCompleted?.length || 0;
        const submittedAssignments = assigned?.assignmentsSubmitted?.length || 0;
        const completedExams = assigned?.examsCompleted?.length || 0;
        const passedExams = assigned?.examsPassed?.length || 0;

        // Calculate assignment statuses
        const activeAssignments = course.assignments.filter(a => new Date(a.dueDate) > now).length;
        const upcomingAssignments = course.assignments.filter(a => new Date(a.dueDate) > now && !(assigned?.assignmentsSubmitted || []).includes(a.order)).length;
        const missedAssignments = course.assignments.filter(a => new Date(a.dueDate) < now && !(assigned?.assignmentsSubmitted || []).includes(a.order)).length;

        // Calculate exam statuses
        const activeExams = course.exams.filter(e => new Date(e.dueDate) > now).length;
        const upcomingExams = course.exams.filter(e => new Date(e.dueDate) > now && !(assigned?.examsCompleted || []).includes(e.order)).length;
        const missedExams = course.exams.filter(e => new Date(e.dueDate) < now && !(assigned?.examsCompleted || []).includes(e.order)).length;

        const completedMini = (assigned?.assignmentsCompleted || []).filter(order => {
          const a = course.assignments.find(x => x.order === order);
          return a?.type === 'mini';
        }).length;
        const completedMajor = (assigned?.assignmentsCompleted || []).filter(order => {
          const a = course.assignments.find(x => x.order === order);
          return a?.type === 'major';
        }).length;
        const completedGit = (assigned?.assignmentsCompleted || []).filter(order => {
          const a = course.assignments.find(x => x.order === order);
          return a?.type === 'git';
        }).length;

        return {
          courseId: course._id,
          title: course.title,
          expiresAt: assigned?.expiresAt || null,
          active: assigned ? (assigned.active && (!assigned.expiresAt || assigned.expiresAt > now)) : true,
          progressPct,
          totalLessons,
          completedLessons,
          lastLessonId: progress?.lastLessonId || null,
          assignments: {
            total: course.assignments.length,
            completed: completedAssignments,
            submitted: submittedAssignments,
            active: activeAssignments,
            upcoming: upcomingAssignments,
            missed: missedAssignments
          },
          exams: {
            total: course.exams.length,
            completed: completedExams,
            passed: passedExams,
            active: activeExams,
            upcoming: upcomingExams,
            missed: missedExams
          },
          eligibleForCertificate: assigned ? (
            completedLessons >= totalLessons &&
            passedExams >= course.exams.length &&
            completedMini >= 2 &&
            completedMajor >= 1 &&
            completedGit >= 1
          ) : false,
          certificateIssued: assigned?.certificateIssued || false,
          certificateFee: course.certificateFee
        };
      });
    } else {
      const courseIds = student.courses.map(c => c.courseId._id);
      const lessonCounts = await Lesson.aggregate([
        { $lookup: { from: 'modules', localField: 'moduleId', foreignField: '_id', as: 'module' } },
        { $unwind: '$module' },
        { $match: { 'module.courseId': { $in: courseIds } } },
        { $group: { _id: '$module.courseId', total: { $sum: 1 } } }
      ]);
      const lessonCountMap = new Map(lessonCounts.map(l => [String(l._id), l.total]));
      const progressDocs = await StudentProgress.find({ userId: req.user.id, courseId: { $in: courseIds } });
      const progressMap = new Map(progressDocs.map(p => [String(p.courseId), p]));

      courses = student.courses.map(c => {
        const course = c.courseId;
        const progress = progressMap.get(String(course._id));
        const totalLessons = lessonCountMap.get(String(course._id)) || 0;
        const completedLessons = progress?.completedLessons?.length || 0;
        const progressPct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
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

        const completedMini = c.assignmentsCompleted.filter(order => {
          const a = course.assignments.find(x => x.order === order);
          return a?.type === 'mini';
        }).length;
        const completedMajor = c.assignmentsCompleted.filter(order => {
          const a = course.assignments.find(x => x.order === order);
          return a?.type === 'major';
        }).length;
        const completedGit = c.assignmentsCompleted.filter(order => {
          const a = course.assignments.find(x => x.order === order);
          return a?.type === 'git';
        }).length;

        return {
          courseId: course._id,
          title: course.title,
          expiresAt: c.expiresAt,
          active: c.active && (!c.expiresAt || c.expiresAt > now),
          progressPct,
          totalLessons,
          completedLessons,
          lastLessonId: progress?.lastLessonId || null,
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
          eligibleForCertificate: (
            completedLessons >= totalLessons &&
            passedExams >= totalExams &&
            completedMini >= 2 &&
            completedMajor >= 1 &&
            completedGit >= 1
          ),
          certificateIssued: c.certificateIssued,
          certificateFee: course.certificateFee
        };
      });
    }

    return res.json({ userId: student.userId, name: student.userId?.name || '', courses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get course modules/lessons for student
router.get('/course/:courseId', async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned && !student.isSuper) return res.status(404).json({ message: 'Course not assigned' });
    if (!student.isSuper && assigned?.expiresAt && new Date() > assigned.expiresAt) {
      return res.status(403).json({ message: 'Access expired' });
    }

    const modules = await Module.find({ courseId }).sort({ order: 1 });
    const moduleIds = modules.map(m => m._id);
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });
    const progress = await StudentProgress.findOne({ userId: req.user.id, courseId });
    const completedSet = new Set((progress?.completedLessons || []).map(String));

    const moduleMap = modules.map(m => ({
      _id: m._id,
      title: m.title,
      order: m.order,
      lessons: lessons
        .filter(l => String(l.moduleId) === String(m._id))
        .map(l => ({
          _id: l._id,
          title: l.title,
          order: l.order,
          contentId: l.contentId,
          locked: l.locked,
          completed: completedSet.has(String(l._id))
        }))
    }));

    return res.json({ courseId, modules: moduleMap, lastLessonId: progress?.lastLessonId || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Mark lesson as complete
router.post('/lesson/:lessonId/complete', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const module = await Module.findById(lesson.moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    const courseId = module.courseId;

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const assigned = student.courses.find(c => c.courseId.toString() === String(courseId));
    if (!assigned && !student.isSuper) return res.status(404).json({ message: 'Course not assigned' });
    if (!student.isSuper && assigned?.expiresAt && new Date() > assigned.expiresAt) {
      return res.status(403).json({ message: 'Access expired' });
    }

    let progress = await StudentProgress.findOne({ userId: req.user.id, courseId });
    if (!progress) {
      progress = new StudentProgress({ userId: req.user.id, courseId, completedLessons: [], lastLessonId: null });
    }
    if (!progress.completedLessons.map(String).includes(String(lessonId))) {
      progress.completedLessons.push(lessonId);
    }
    progress.lastLessonId = lessonId;
    progress.updatedAt = new Date();
    await progress.save();

    return res.json({ message: 'Lesson completed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Fetch lesson content and Cohere-processed text
router.get('/lesson/:lessonId/content', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const module = await Module.findById(lesson.moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });

    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const assigned = student.courses.find(c => c.courseId.toString() === String(module.courseId));
    if (!assigned && !student.isSuper) return res.status(404).json({ message: 'Course not assigned' });
    if (!student.isSuper && assigned?.expiresAt && new Date() > assigned.expiresAt) {
      return res.status(403).json({ message: 'Access expired' });
    }

    const raw = await fetchLessonContent(lesson.contentId);
    const outline = await generateOutline(raw || '');
    const rephrased = await rephraseContent(raw || '');
    return res.json({
      lessonId,
      title: lesson.title,
      content: raw || '',
      outline: outline || '',
      rephrased: rephrased || ''
    });
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

    const student = await Student.findOne({ userId: req.user.id });
    const assigned = student.courses.find(c => c.courseId.toString() === req.params.courseId);
    if (!assigned && !student.isSuper) return res.status(404).json({ message: 'Course not assigned' });

    if (!student.isSuper && assigned?.expiresAt && new Date() > assigned.expiresAt) {
      return res.status(403).json({ message: 'Access expired' });
    }

    const now = new Date();
    const assignments = course.assignments
      .filter(a => a.isVisible && new Date(a.releaseDate) <= now) // Only show visible assignments that are released
      .map(a => ({
        order: a.order,
        title: a.title,
        description: a.description,
        type: a.type,
        marks: a.marks,
        blogLinks: a.blogLinks,
        githubLinks: a.githubLinks,
        studyMaterials: a.studyMaterials,
        dueDate: a.dueDate,
        repositoryUrl: a.repositoryUrl,
        instructions: a.instructions,
        week: a.week,
        submitted: assigned ? assigned.assignmentsSubmitted.includes(a.order) : false,
        completed: assigned ? assigned.assignmentsCompleted.includes(a.order) : false
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

    const student = await Student.findOne({ userId: req.user.id });
    let assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned && student.isSuper) {
      assigned = {
        courseId,
        assignedAt: new Date(),
        expiresAt: null,
        active: true,
        assignmentsCompleted: [],
        assignmentsSubmitted: [],
        examsCompleted: [],
        examsPassed: []
      };
      student.courses.push(assigned);
    } else if (!assigned) {
      return res.status(404).json({ message: 'Course not assigned' });
    }

    // Check if already submitted
    if (assigned.assignmentsSubmitted.includes(Number(order))) {
      return res.status(400).json({ message: 'Assignment already submitted' });
    }

    const course = await Course.findById(courseId);
    const assignment = course?.assignments?.find(a => a.order === Number(order));
    const maxScore = assignment?.marks || (assignment?.type === 'major' ? 30 : assignment?.type === 'git' ? 30 : 10);

    const submission = new Submission({
      type: 'assignment',
      assignmentSubmission: {
        studentId: student._id,
        courseId,
        assignmentOrder: Number(order),
        repositoryUrl,
        pullRequestUrl,
        maxScore
      }
    });

    await submission.save();

    // Auto-evaluate using Cohere (best-effort)
    const evalResult = await evaluateAssignment({
      title: assignment?.title || `Assignment ${order}`,
      description: assignment?.description || '',
      instructions: assignment?.instructions || '',
      repoUrl: repositoryUrl,
      prUrl: pullRequestUrl,
      marks: maxScore
    });
    if (evalResult && submission.assignmentSubmission) {
      const score = Math.max(0, Math.min(maxScore, Number(evalResult.score) || 0));
      const status = evalResult.status === 'Approved' ? 'Approved' : 'Rejected';
      submission.assignmentSubmission.score = score;
      submission.assignmentSubmission.status = status;
      submission.assignmentSubmission.feedback = evalResult.feedback || '';
      submission.assignmentSubmission.reviewedAt = new Date();
      await submission.save();
      if (status === 'Approved') {
        if (!assigned.assignmentsCompleted.includes(Number(order))) {
          assigned.assignmentsCompleted.push(Number(order));
          await student.save();
        }
      }
    }

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

    const student = await Student.findOne({ userId: req.user.id });
    const assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned && !student.isSuper) return res.status(404).json({ message: 'Course not assigned' });

    const exam = course.exams.find(e => e.order === Number(order));
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Check if already completed
    if (assigned && assigned.examsCompleted.includes(Number(order))) {
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

    const student = await Student.findOne({ userId: req.user.id });
    let assigned = student.courses.find(c => c.courseId.toString() === courseId);
    if (!assigned && student.isSuper) {
      assigned = {
        courseId,
        assignedAt: new Date(),
        expiresAt: null,
        active: true,
        assignmentsCompleted: [],
        assignmentsSubmitted: [],
        examsCompleted: [],
        examsPassed: []
      };
      student.courses.push(assigned);
    } else if (!assigned) {
      return res.status(404).json({ message: 'Course not assigned' });
    }

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
