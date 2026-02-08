require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Student = require('./models/Student');
const Course = require('./models/Course');

const generateCourseCode = (courseName) => {
  if (!courseName) return 'XXXX';
  const words = courseName.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0].toUpperCase()).join('').substring(0, 3);
};

const generateStudentIds = async (courseId) => {
  const count = await Student.countDocuments() + 2001;
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const year = today.getFullYear();

  let courseCode = 'XXXX';
  if (courseId) {
    try {
      const course = await Course.findById(courseId);
      if (course) courseCode = generateCourseCode(course.title);
    } catch (e) {
      console.warn('Could not fetch course for code generation:', e.message);
    }
  }

  return {
    rollId: `${courseCode}-${count}`,
    studentId: `SIH-${courseCode}-${year}-${day}-${count}`
  };
};

const users = [
  {
    username: 'Ankit',
    email: 'dubeysk2003@gmail.com',
    password: '0806',
    role: 'admin',
    name: 'Ankit'
  },
  {
    username: 'Shreya',
    email: 'srivastavashreyanshi69@gmail.com',
    password: '0608',
    role: 'admin',
    name: 'Shreya'
  },
  {
    username: 'Cherry',
    email: 'smartfresherhubsa@gmail.com',
    password: '123456',
    role: 'student',
    name: 'Cherry',
    isSuper: true
  }
];

const upsertUser = async (u) => {
  const hashed = await bcrypt.hash(u.password, 10);
  let user = await User.findOne({ $or: [{ email: u.email }, { username: u.username, role: u.role }] });
  if (!user) {
    user = new User({
      username: u.username,
      email: u.email,
      password: hashed,
      role: u.role,
      name: u.name
    });
    await user.save();
  } else {
    user.username = u.username;
    user.email = u.email;
    user.password = hashed;
    user.role = u.role;
    user.name = u.name;
    await user.save();
  }

  if (u.role === 'admin') {
    const existing = await Admin.findOne({ userId: user._id });
    if (!existing) {
      await new Admin({ userId: user._id }).save();
    }
  } else {
    let student = await Student.findOne({ userId: user._id });
    if (!student) {
      const ids = await generateStudentIds();
      student = new Student({ userId: user._id, isSuper: !!u.isSuper, ...ids });
    } else {
      student.isSuper = !!u.isSuper;
    }
    await student.save();
  }
};

const main = async () => {
  await connectDB();
  try {
    await Admin.collection.dropIndex('username_1');
  } catch (_) {
    // ignore if index doesn't exist
  }
  try {
    await Student.collection.dropIndex('username_1');
  } catch (_) {
    // ignore if index doesn't exist
  }
  for (const u of users) {
    await upsertUser(u);
  }
  console.log('Users seeded/updated successfully.');
  process.exit(0);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
