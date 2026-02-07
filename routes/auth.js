const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const User = require('../models/User');

// Check if we're using mock DB (set by server.js)
let useMockDB = false;
router.setMockMode = (mock) => { useMockDB = mock; };

// Single login endpoint: { usernameOrEmail, password }
router.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  try {
    if (!usernameOrEmail) return res.status(400).json({ message: 'Invalid username or email' });
    if (!password) return res.status(400).json({ message: 'Invalid password' });

    if (useMockDB) {
      const admin = db.admins.find(a => a.email === usernameOrEmail || a.username === usernameOrEmail);
      if (admin) {
        if (!await bcrypt.compare(password, admin.password)) return res.status(401).json({ message: 'Invalid password' });
        const token = jwt.sign({ id: admin.id, userId: admin.id, role: 'admin', username: admin.username, email: admin.email }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '8h' });
        return res.json({ token, role: 'admin', userId: admin.id });
      }
      const student = db.students.find(s => s.email === usernameOrEmail || s.username === usernameOrEmail);
      if (!student) return res.status(401).json({ message: 'Invalid username or email' });
      if (student.locked) return res.status(403).json({ message: 'Account locked; contact admin' });
      if (!await bcrypt.compare(password, student.password)) return res.status(401).json({ message: 'Invalid password' });
      const token = jwt.sign({ id: student.id, userId: student.id, role: 'student', username: student.username, email: student.email }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '7d' });
      return res.json({ token, role: 'student', username: student.username, userId: student.id });
    } else {
      // Real DB: Find user by username or email
      const user = await User.findOne({ $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }] });
      if (!user) return res.status(401).json({ message: 'Invalid username or email' });
      if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ message: 'Invalid password' });

      if (user.role === 'admin') {
        const admin = await Admin.findOne({ userId: user._id });
        if (!admin) return res.status(401).json({ message: 'Admin account not found' });
        const token = jwt.sign({ id: user._id, userId: user._id, role: 'admin', username: user.username, email: user.email }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '8h' });
        return res.json({ token, role: 'admin', userId: user._id });
      } else {
        const student = await Student.findOne({ userId: user._id });
        if (!student) return res.status(401).json({ message: 'Student account not found' });
        if (user.locked) return res.status(403).json({ message: 'Account locked; contact admin' });
        const token = jwt.sign({ id: user._id, userId: user._id, role: 'student', username: user.username, email: user.email }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '7d' });
        return res.json({ token, role: 'student', username: user.username, userId: user._id });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Seed endpoint for deployed database
router.post('/seed', async (req, res) => {
  try {
    const seedAdmin = require('./seedAdmin');
    await seedAdmin();
    res.json({ message: 'Database seeded successfully', credentials: { admin: 'Ankit/0806', student: 'Sreya/0806' } });
  } catch (err) {
    console.error('Seeding error:', err);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

module.exports = router;

