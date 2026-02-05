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

// Single login endpoint: { username, password, role }
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    if (!username) return res.status(400).json({ message: 'Invalid username' });
    if (!password) return res.status(400).json({ message: 'Invalid password' });
    if (!role || (role !== 'admin' && role !== 'student')) return res.status(400).json({ message: 'Invalid role' });

    if (useMockDB) {
      // Mock DB logic remains the same
      if (role === 'admin') {
        const admin = db.admins.find(a => a.username === username);
        if (!admin) return res.status(401).json({ message: 'Invalid username' });
        if (!await bcrypt.compare(password, admin.password)) return res.status(401).json({ message: 'Invalid password' });
        const token = jwt.sign({ id: admin.id, role: 'admin', username: admin.username }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '8h' });
        return res.json({ token, role: 'admin' });
      } else {
        const student = db.students.find(s => s.username === username);
        if (!student) return res.status(401).json({ message: 'Invalid username' });
        if (student.locked) return res.status(403).json({ message: 'Account locked; contact admin' });
        if (!await bcrypt.compare(password, student.password)) return res.status(401).json({ message: 'Invalid password' });
        const token = jwt.sign({ id: student.id, role: 'student', username: student.username }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '7d' });
        return res.json({ token, role: 'student', username: student.username });
      }
    } else {
      // Real DB: Find user by username and role
      const user = await User.findOne({ username, role });
      if (!user) return res.status(401).json({ message: 'Invalid username or role' });
      if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ message: 'Invalid password' });

      if (role === 'admin') {
        const admin = await Admin.findOne({ userId: user._id });
        if (!admin) return res.status(401).json({ message: 'Admin account not found' });
        const token = jwt.sign({ id: user._id, role: 'admin', username: user.username }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '8h' });
        return res.json({ token, role: 'admin' });
      } else {
        const student = await Student.findOne({ userId: user._id });
        if (!student) return res.status(401).json({ message: 'Student account not found' });
        if (user.locked) return res.status(403).json({ message: 'Account locked; contact admin' });
        const token = jwt.sign({ id: user._id, role: 'student', username: user.username }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '7d' });
        return res.json({ token, role: 'student', username: user.username });
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

