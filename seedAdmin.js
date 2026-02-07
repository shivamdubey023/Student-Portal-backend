const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const Student = require('./models/Student');
const User = require('./models/User');

const seedAdmin = async () => {
  // Fixed credentials for MVP
  const adminUsers = [
    { username: 'Ankit', password: '0608' },
    { username: 'Shreya', password: '0608' }
  ];
  const studentUser = process.env.DEFAULT_STUDENT || 'Sreya';
  const studentPass = process.env.DEFAULT_STUDENT_PASS || '0806';
  const superStudent = { username: 'cherry', password: '0806' };

  for (const adminUser of adminUsers) {
    // Seed admin user
    let adminUserDoc = await User.findOne({ username: adminUser.username, role: 'admin' });
    if (!adminUserDoc) {
      try {
        const hashed = await bcrypt.hash(adminUser.password, 10);
        adminUserDoc = new User({ username: adminUser.username, password: hashed, role: 'admin', email: `${adminUser.username.toLowerCase()}@example.com` });
        await adminUserDoc.save();
        console.log('✓ Seeded admin user:', adminUser.username);
      } catch (err) {
        if (err.code === 11000) {
          console.log('✓ Admin user already exists:', adminUser.username);
          adminUserDoc = await User.findOne({ username: adminUser.username, role: 'admin' });
        } else {
          console.error('Error seeding admin user:', err.message);
          throw err;
        }
      }
    } else {
      console.log('✓ Admin user already exists:', adminUser.username);
    }

    // Seed admin record
    if (adminUserDoc) {
      const existingAdmin = await Admin.findOne({ userId: adminUserDoc._id });
      if (!existingAdmin) {
        try {
          const admin = new Admin({ userId: adminUserDoc._id });
          await admin.save();
          console.log('✓ Seeded admin record for:', adminUser.username);
        } catch (err) {
          if (err.code === 11000) {
            console.log('✓ Admin record already exists for:', adminUser.username);
          } else {
            console.error('Error seeding admin record:', err.message);
          }
        }
      } else {
        console.log('✓ Admin record already exists for:', adminUser.username);
      }
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

  // Seed super student user
  let superUserDoc = await User.findOne({ username: superStudent.username, role: 'student' });
  if (!superUserDoc) {
    try {
      const hashedSuper = await bcrypt.hash(superStudent.password, 10);
      superUserDoc = new User({
        username: superStudent.username,
        password: hashedSuper,
        role: 'student',
        name: superStudent.username,
        email: `${superStudent.username}@example.com`
      });
      await superUserDoc.save();
      console.log('✓ Seeded super student user:', superStudent.username);
    } catch (err) {
      if (err.code === 11000) {
        console.log('✓ Super student user already exists');
        superUserDoc = await User.findOne({ username: superStudent.username, role: 'student' });
      } else {
        console.error('Error seeding super student user:', err.message);
        throw err;
      }
    }
  } else {
    console.log('✓ Super student user already exists');
  }

  // Seed super student record
  if (superUserDoc) {
    const existingSuperStudent = await Student.findOne({ userId: superUserDoc._id });
    if (!existingSuperStudent) {
      try {
        const stu = new Student({ userId: superUserDoc._id, isSuper: true });
        await stu.save();
        console.log('✓ Seeded super student record');
      } catch (err) {
        if (err.code === 11000) {
          console.log('✓ Super student record already exists');
        } else {
          console.error('Error seeding super student record:', err.message);
        }
      }
    } else {
      if (!existingSuperStudent.isSuper) {
        existingSuperStudent.isSuper = true;
        await existingSuperStudent.save();
      }
      console.log('✓ Super student record already exists');
    }
  }
};

module.exports = seedAdmin;
