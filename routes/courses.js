const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const { generateCourseContent } = require('../services/cohere');
let useMockDB = false;

// Exported function to set mock mode (called from server.js on DB failure)
router.setMockMode = (mock) => { useMockDB = mock; };

// Get all courses
router.get('/', async (req, res) => {
  try {
    if (useMockDB) {
      return res.json(db.courses);
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
    const course = new Course({
      ...req.body,
      marksDistribution: {
        mcq: 20,
        mini: 10,
        major: 30,
        git: 30
      }
    });
    await course.save();

    // Auto-generate modules and lessons via Cohere
    const generated = await generateCourseContent(course.title, course.description);
    const modules = Array.isArray(generated?.modules) ? generated.modules : [
      { title: 'Module 1', lessons: [{ title: 'Lesson 1', content: 'Intro content' }, { title: 'Lesson 2', content: 'Core concepts' }, { title: 'Lesson 3', content: 'Practice' }] },
      { title: 'Module 2', lessons: [{ title: 'Lesson 4', content: 'Applied topics' }, { title: 'Lesson 5', content: 'Advanced tips' }, { title: 'Lesson 6', content: 'Wrap-up' }] }
    ];

    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      const moduleDoc = new Module({ courseId: course._id, title: m.title, order: i + 1 });
      await moduleDoc.save();
      const lessons = Array.isArray(m.lessons) ? m.lessons : [];
      for (let j = 0; j < lessons.length; j++) {
        const l = lessons[j];
        const lessonDoc = new Lesson({
          moduleId: moduleDoc._id,
          title: l.title || `Lesson ${j + 1}`,
          contentId: `${course._id}-${moduleDoc._id}-${j + 1}`,
          contentText: l.content || '',
          order: j + 1,
          locked: false
        });
        await lessonDoc.save();
      }
    }

    // Auto-create required assignments + MCQ exam
    const now = new Date();
    const addDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    course.assignments.push(
      {
        title: 'Mini Project 1',
        description: 'Complete the first mini project.',
        type: 'mini',
        marks: 10,
        dueDate: addDays(7),
        repositoryUrl: 'https://github.com/your-org/your-repo',
        instructions: 'Submit your repository link.',
        order: 1,
        week: 1,
        releaseDate: now,
        isVisible: true
      },
      {
        title: 'Mini Project 2',
        description: 'Complete the second mini project.',
        type: 'mini',
        marks: 10,
        dueDate: addDays(14),
        repositoryUrl: 'https://github.com/your-org/your-repo',
        instructions: 'Submit your repository link.',
        order: 2,
        week: 2,
        releaseDate: now,
        isVisible: true
      },
      {
        title: 'Major Project',
        description: 'Complete the major project.',
        type: 'major',
        marks: 30,
        dueDate: addDays(21),
        repositoryUrl: 'https://github.com/your-org/your-repo',
        instructions: 'Submit your repository link.',
        order: 3,
        week: 3,
        releaseDate: now,
        isVisible: true
      },
      {
        title: 'Git Task: Fork + Branch + Push',
        description: 'Fork the repository and push work to a branch named after your username.',
        type: 'git',
        marks: 30,
        dueDate: addDays(28),
        repositoryUrl: 'https://github.com/shivamdubey023/SIH',
        instructions: 'Fork the repo, create a branch with your student username, push your changes, and submit the repo link.',
        order: 4,
        week: 4,
        releaseDate: now,
        isVisible: true
      }
    );

    course.exams.push({
      title: 'MCQ Assessment',
      description: '20 marks MCQ paper.',
      marks: 20,
      questions: [
        { question: 'Placeholder question 1', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
        { question: 'Placeholder question 2', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
        { question: 'Placeholder question 3', options: ['A', 'B', 'C', 'D'], correctAnswer: 2 },
        { question: 'Placeholder question 4', options: ['A', 'B', 'C', 'D'], correctAnswer: 3 },
        { question: 'Placeholder question 5', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 }
      ],
      passingScore: 70,
      duration: 30,
      dueDate: addDays(30),
      order: 1,
      week: 4,
      releaseDate: now,
      isVisible: true
    });

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
