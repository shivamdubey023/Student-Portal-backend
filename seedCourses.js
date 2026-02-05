const mongoose = require('mongoose');
const Course = require('./models/Course');
require('dotenv').config();

const SAMPLE_COURSES = [
  {
    title: 'Python Development',
    description: 'Learn Python from scratch and master fundamental programming concepts.',
    overview: 'Learn Python from scratch and master fundamental programming concepts. Build scalable applications with hands-on projects covering data structures, OOP, and real-world problem-solving.',
    duration: '2 Months',
    mode: 'Remote',
    category: 'Core Training',
    tools: ['Python 3', 'VS Code', 'Git', 'Jupyter Notebook', 'pytest', 'Data Structures', 'Algorithms'],
    learnTopics: [
      'Python Basics and syntax fundamentals',
      'Control Flow & Data Structures',
      'Functions & Code Structure',
      'File Handling & Error Handling',
      'Object-Oriented Programming (OOP)',
      'Intermediate Python Concepts'
    ],
    projects: {
      minor: [
        'Smart Student Analytics System',
        'Persistent Task & Notes Manager',
        'Personal Finance & Expense Analyzer'
      ],
      major: 'Python Utility Hub (Aggregator Project)'
    },
    certification: 'Upon successful completion, you\'ll receive a Python Development Training Certificate with a unique verification ID. This certificate recognizes your programming expertise and practical problem-solving skills.',
    price: 0,
    durationMonths: 2,
    enrolledCount: 0
  },
  {
    title: 'Web Development with React',
    description: 'Master React.js and build modern web applications.',
    overview: 'Learn React fundamentals, hooks, state management, and build full-stack applications with confidence.',
    duration: '3 Months',
    mode: 'Remote',
    category: 'Core Training',
    tools: ['React', 'Node.js', 'MongoDB', 'Express', 'Git'],
    learnTopics: [
      'React Basics and JSX',
      'Components & Props',
      'State & Hooks',
      'Routing with React Router',
      'API Integration',
      'State Management (Redux)'
    ],
    projects: {
      minor: [
        'Todo Application',
        'Weather App with API',
        'E-commerce Product Listing'
      ],
      major: 'Full-Stack Blog Platform'
    },
    certification: 'Web Development Certification with React expertise verification.',
    price: 0,
    durationMonths: 3,
    enrolledCount: 0
  },
  {
    title: 'Data Science Fundamentals',
    description: 'Introduction to data analysis, visualization, and machine learning.',
    overview: 'Explore data science with Python, learn data manipulation, visualization, and introductory machine learning concepts.',
    duration: '3 Months',
    mode: 'Remote',
    category: 'Specialization',
    tools: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Scikit-learn', 'Jupyter'],
    learnTopics: [
      'Data Manipulation with Pandas',
      'Data Visualization',
      'Statistical Analysis',
      'Introduction to Machine Learning',
      'Supervised & Unsupervised Learning',
      'Model Evaluation'
    ],
    projects: {
      minor: [
        'Sales Data Analysis',
        'Movie Recommendation System',
        'Customer Segmentation'
      ],
      major: 'Predictive Analytics Dashboard'
    },
    certification: 'Data Science Fundamentals Certificate',
    price: 0,
    durationMonths: 3,
    enrolledCount: 0
  },
  {
    title: 'JavaScript Advanced',
    description: 'Deep dive into JavaScript ES6+ and advanced concepts.',
    overview: 'Master advanced JavaScript concepts including closures, async/await, promises, and functional programming.',
    duration: '6 Weeks',
    mode: 'Remote',
    category: 'Core Training',
    tools: ['JavaScript', 'Node.js', 'Git', 'VS Code'],
    learnTopics: [
      'ES6+ Features',
      'Closures & Scope',
      'Asynchronous JavaScript',
      'Promises & Async/Await',
      'Functional Programming',
      'Design Patterns'
    ],
    projects: {
      minor: [
        'Promise-based Task Manager',
        'Web Scraper',
        'Real-time Chat App'
      ],
      major: 'Microservices Backend with Node.js'
    },
    certification: 'JavaScript Advanced Certification',
    price: 0,
    durationMonths: 2,
    enrolledCount: 0
  },
  {
    title: 'Python Programming',
    description: 'Learn Python from scratch and master fundamental programming concepts.',
    overview: 'Learn Python from scratch and master fundamental programming concepts. Build scalable applications with hands-on projects covering data structures, OOP, and real-world problem-solving.',
    duration: '1 Month',
    mode: 'Remote',
    category: 'Core Training',
    tools: ['Python 3', 'VS Code', 'Git', 'Jupyter Notebook', 'pytest', 'Data Structures', 'Algorithms'],
    learnTopics: [
      'Python Basics and syntax fundamentals',
      'Control Flow & Data Structures',
      'Functions & Code Structure',
      'File Handling & Error Handling',
      'Object-Oriented Programming (OOP)',
      'Intermediate Python Concepts'
    ],
    projects: {
      minor: [
        'Smart Student Analytics System',
        'Persistent Task & Notes Manager',
        'Personal Finance & Expense Analyzer'
      ],
      major: 'Python Utility Hub (Aggregator Project)'
    },
    certification: 'Upon successful completion, you\'ll receive a Python Development Training Certificate with a unique verification ID. This certificate recognizes your programming expertise and practical problem-solving skills.',
    price: 0,
    durationMonths: 1,
    enrolledCount: 0
  },
  {
    title: 'JavaScript Learning Course',
    description: 'Master JavaScript fundamentals and build interactive web applications.',
    overview: 'Learn JavaScript from basics to advanced concepts, including DOM manipulation, asynchronous programming, and modern ES6+ features. Build dynamic web applications with hands-on projects.',
    duration: '1 Month',
    mode: 'Remote',
    category: 'Core Training',
    tools: ['JavaScript', 'HTML', 'CSS', 'Node.js', 'Git', 'VS Code'],
    learnTopics: [
      'JavaScript Basics and Variables',
      'Functions and Scope',
      'DOM Manipulation',
      'Event Handling',
      'Asynchronous JavaScript (Promises, Async/Await)',
      'ES6+ Features and Modern JavaScript'
    ],
    projects: {
      minor: [
        'Interactive Todo List App',
        'Weather Dashboard with API',
        'Simple Calculator with UI'
      ],
      major: 'Full-Stack Web Application with JavaScript'
    },
    certification: 'JavaScript Learning Course Certificate upon completion.',
    price: 0,
    durationMonths: 1,
    enrolledCount: 0
  }
];

const seedDatabase = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-portal';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing courses
    await Course.deleteMany({});
    console.log('Cleared existing courses');

    // Insert sample courses
    await Course.insertMany(SAMPLE_COURSES);
    console.log(`Successfully seeded ${SAMPLE_COURSES.length} courses`);

    // Display inserted courses
    const courses = await Course.find();
    console.log('\nSeeded Courses:');
    courses.forEach((c, i) => {
      console.log(`${i + 1}. ${c.title} (${c._id})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDatabase();
