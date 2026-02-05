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
    try {
      const hashed = await bcrypt.hash(adminPass, 10);
      adminUserDoc = new User({ username: adminUser, password: hashed, role: 'admin', email: 'admin@example.com' });
      await adminUserDoc.save();
      console.log('✓ Seeded admin user:', adminUser);
    } catch (err) {
      if (err.code === 11000) {
        console.log('✓ Admin user already exists');
        adminUserDoc = await User.findOne({ username: adminUser, role: 'admin' });
      } else {
        console.error('Error seeding admin user:', err.message);
        throw err;
      }
    }
  } else {
    console.log('✓ Admin user already exists');
  }

  // Seed admin record
  if (adminUserDoc) {
    const existingAdmin = await Admin.findOne({ userId: adminUserDoc._id });
    if (!existingAdmin) {
      try {
        const admin = new Admin({ userId: adminUserDoc._id });
        await admin.save();
        console.log('✓ Seeded admin record');
      } catch (err) {
        if (err.code === 11000) {
          console.log('✓ Admin record already exists');
        } else {
          console.error('Error seeding admin record:', err.message);
        }
      }
    } else {
      console.log('✓ Admin record already exists');
    }
  }

  // Seed default student user
  let studentUserDoc = await User.findOne({ username: studentUser, role: 'student' });
  if (!studentUserDoc) {
    try {
      const hashedS = await bcrypt.hash(studentPass, 10);
      studentUserDoc = new User({ username: studentUser, password: hashedS, role: 'student', name: studentUser, email: 'student@example.com' });
      await studentUserDoc.save();
      console.log('✓ Seeded default student user:', studentUser);
    } catch (err) {
      if (err.code === 11000) {
        console.log('✓ Default student user already exists');
        studentUserDoc = await User.findOne({ username: studentUser, role: 'student' });
      } else {
        console.error('Error seeding student user:', err.message);
        throw err;
      }
    }
  } else {
    console.log('✓ Default student user already exists');
  }

  // Seed student record
  if (studentUserDoc) {
    const existingStudent = await Student.findOne({ userId: studentUserDoc._id });
    if (!existingStudent) {
      try {
        const stu = new Student({ userId: studentUserDoc._id });
        await stu.save();
        console.log('✓ Seeded default student record');
      } catch (err) {
        if (err.code === 11000) {
          console.log('✓ Default student record already exists');
        } else {
          console.error('Error seeding student record:', err.message);
        }
      }
    } else {
      console.log('✓ Default student record already exists');
    }
  }
};

module.exports = seedAdmin;
