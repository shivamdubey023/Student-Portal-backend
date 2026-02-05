require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB and start server after successful connection
const startServer = async () => {
  let usingMock = false;
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection failed; falling back to in-memory mock DB for development.');
    console.error(err.message || err);
    usingMock = true;
  }

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (mock:${usingMock})`);
    console.log('Auth ready with mock credentials:');
    console.log('  Admin: Ankit / 0806');
    console.log('  Student: Sreya / 0806');
  });

  // If using mock DB, enable mock mode on all routes
  if (usingMock) {
    const db = require('./db');
    // Enable mock mode on courses, students, submissions, admin, and auth routes
    require('./routes/courses').setMockMode(true);
    require('./routes/students').setMockMode(true);
    require('./routes/submissions').setMockMode(true);
    require('./routes/admin').setMockMode(true);
    require('./routes/auth').setMockMode(true);
    // Add debug routes
    app.post('/debug/courses', (req, res) => {
      const { title, description } = req.body || {};
      if (!title) return res.status(400).json({ error: 'title required' });
      const course = { _id: String(db.courses.length + 1), title, description };
      db.courses.push(course);
      res.status(201).json(course);
    });
    app.get('/debug/courses', (req, res) => res.json(db.courses));
  }
};

startServer();

app.use(helmet());

// CORS Configuration — allow local dev + deployed frontends and required headers
const whitelist = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  // common deployed preview / vercel hostnames you may use
  'https://student-portal-five-mocha.vercel.app',
  'https://student-portal-e3kb9q12r-kuro-shivs-projects.vercel.app'
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // allow requests with no origin (curl, server-to-server)
    if (!origin) return cb(null, true);
    if (whitelist.indexOf(origin) !== -1) return cb(null, true);
    return cb(new Error('CORS policy: This origin is not allowed.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // include common headers seen in browser requests (case-insensitive)
  allowedHeaders: [
    'Content-Type', 'Authorization', 'authorization', 'Accept', 'accept', 'X-Requested-With', 'Referer', 'User-Agent',
    'Sec-CH-UA', 'Sec-CH-UA-Mobile', 'Sec-CH-UA-Platform'
  ],
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));
// enable pre-flight for all routes
app.options('*', cors(corsOptions));

app.use(morgan('dev'));
app.use(bodyParser.json());

// Seed endpoint for deployed database
app.post('/api/seed', async (req, res) => {
  try {
    const seedAdmin = require('./seedAdmin');
    await seedAdmin();
    res.json({ message: 'Database seeded successfully', credentials: { admin: 'Ankit/0806', student: 'Sreya/0806' } });
  } catch (err) {
    console.error('Seeding error:', err);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/students', require('./routes/students'));
app.use('/api/submissions', require('./routes/submissions'));

// Health check
app.get('/', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development', note: 'Using in-memory mock DB for MVP testing' }));

