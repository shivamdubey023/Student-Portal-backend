const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mockDB = require('../mockDB');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

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

    if (role === 'admin') {
      if (useMockDB) {
        const admin = mockDB.admins.find(a => a.username === username);
        if (!admin) return res.status(401).json({ message: 'Invalid username' });
        if (!await bcrypt.compare(password, admin.password)) return res.status(401).json({ message: 'Invalid password' });
        const token = jwt.sign({ id: admin.id, role: 'admin', username: admin.username }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '8h' });
        return res.json({ token, role: 'admin' });
      } else {
        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(401).json({ message: 'Invalid username' });
        if (!await bcrypt.compare(password, admin.password)) return res.status(401).json({ message: 'Invalid password' });
        const token = jwt.sign({ id: admin._id, role: 'admin', username: admin.username }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '8h' });
        return res.json({ token, role: 'admin' });
      }
    }

    // student
    if (useMockDB) {
      const student = mockDB.students.find(s => s.username === username);
      if (!student) return res.status(401).json({ message: 'Invalid username' });
      if (student.locked) return res.status(403).json({ message: 'Account locked; contact admin' });
      if (!await bcrypt.compare(password, student.password)) return res.status(401).json({ message: 'Invalid password' });
      const token = jwt.sign({ id: student.id, role: 'student', username: student.username }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '7d' });
      return res.json({ token, role: 'student', username: student.username });
    } else {
      const student = await Student.findOne({ username });
      if (!student) return res.status(401).json({ message: 'Invalid username' });
      if (student.locked) return res.status(403).json({ message: 'Account locked; contact admin' });
      if (!await bcrypt.compare(password, student.password)) return res.status(401).json({ message: 'Invalid password' });
      const token = jwt.sign({ id: student._id, role: 'student', username: student.username }, process.env.JWT_SECRET || 'change_this_to_a_strong_secret', { expiresIn: '7d' });
      return res.json({ token, role: 'student', username: student.username });
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

