require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// Routes
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development', note: 'Using in-memory mock DB for MVP testing' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Auth ready with mock credentials:');
  console.log('  Admin: Ankit / 0806');
  console.log('  Student: Sreya / 0806');
});

