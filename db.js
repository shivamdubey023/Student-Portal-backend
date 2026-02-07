// In-memory mock database for MVP testing
// Replace with MongoDB when ready

const admins = [
  { id: '1', username: 'Ankit', email: 'ankit@example.com', password: '$2a$10$f8Ak5LlPRomRl8/1vKMIxevV5QTZIVAc1lr7f5lMklp96ji7Y/YDu', role: 'admin' } // bcrypt hash of '0806'
];

const students = [
  { id: '1', userId: 'Sreya', username: 'Sreya', email: 'sreya@example.com', password: '$2a$10$f8Ak5LlPRomRl8/1vKMIxevV5QTZIVAc1lr7f5lMklp96ji7Y/YDu', role: 'student', locked: false, courses: [] } // bcrypt hash of '0806'
];

const courses = [];
const submissions = [];

module.exports = {
  admins,
  students,
  courses,
  submissions
};
