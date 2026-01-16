const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

const seedAdmin = async () => {
  // Fixed credentials for MVP
  const adminUser = process.env.ADMIN_USER || 'Ankit';
  const adminPass = process.env.ADMIN_PASS || '0806';
  const studentUser = process.env.DEFAULT_STUDENT || 'srey';
  const studentPass = process.env.DEFAULT_STUDENT_PASS || '0806';

  // Seed admin
  const existingAdmin = await Admin.findOne({ username: adminUser });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash(adminPass, 10);
    const admin = new Admin({ username: adminUser, password: hashed });
    await admin.save();
    console.log('Seeded admin user:', adminUser);
  } else {
    console.log('Admin already exists');
  }

  // Seed default student
  const Student = require('./models/Student');
  const existingStudent = await Student.findOne({ username: studentUser });
  if (!existingStudent) {
    const hashedS = await bcrypt.hash(studentPass, 10);
    const stu = new Student({ userId: studentUser, username: studentUser, name: studentUser, password: hashedS });
    await stu.save();
    console.log('Seeded default student:', studentUser);
  } else {
    console.log('Default student already exists');
  }
};

module.exports = seedAdmin;
