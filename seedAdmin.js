const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const Student = require('./models/Student');
const User = require('./models/User');

const seedAdmin = async () => {
  // Fixed credentials for MVP
  const adminUser = process.env.ADMIN_USER || 'Ankit';
  const adminPass = process.env.ADMIN_PASS || '0806';
  const studentUser = process.env.DEFAULT_STUDENT || 'Sreya';
  const studentPass = process.env.DEFAULT_STUDENT_PASS || '0806';

  // Seed admin user
  let adminUserDoc = await User.findOne({ username: adminUser, role: 'admin' });
  if (!adminUserDoc) {
    const hashed = await bcrypt.hash(adminPass, 10);
    adminUserDoc = new User({ username: adminUser, password: hashed, role: 'admin' });
    await adminUserDoc.save();
    console.log('Seeded admin user:', adminUser);
  } else {
    console.log('Admin user already exists');
  }

  // Seed admin record
  const existingAdmin = await Admin.findOne({ userId: adminUserDoc._id });
  if (!existingAdmin) {
    const admin = new Admin({ userId: adminUserDoc._id });
    await admin.save();
    console.log('Seeded admin record');
  } else {
    console.log('Admin record already exists');
  }

  // Seed default student user
  let studentUserDoc = await User.findOne({ username: studentUser, role: 'student' });
  if (!studentUserDoc) {
    const hashedS = await bcrypt.hash(studentPass, 10);
    studentUserDoc = new User({ username: studentUser, password: hashedS, role: 'student', name: studentUser });
    await studentUserDoc.save();
    console.log('Seeded default student user:', studentUser);
  } else {
    console.log('Default student user already exists');
  }

  // Seed student record
  const existingStudent = await Student.findOne({ userId: studentUserDoc._id });
  if (!existingStudent) {
    const stu = new Student({ userId: studentUserDoc._id });
    await stu.save();
    console.log('Seeded default student record');
  } else {
    console.log('Default student record already exists');
  }
};

module.exports = seedAdmin;
