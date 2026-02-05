const jwt = require('jsonwebtoken');

const adminToken = jwt.sign({ id: '1', role: 'admin', username: 'Ankit' }, 'change_this_to_a_strong_secret', { expiresIn: '8h' });
const studentToken = jwt.sign({ id: '1', role: 'student', username: 'Sreya' }, 'change_this_to_a_strong_secret', { expiresIn: '7d' });

console.log('Admin Token:', adminToken);
console.log('Student Token:', studentToken);
