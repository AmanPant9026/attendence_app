const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { studentPool } = require('../config/config');

// Import the student_home router
const studentHomeRouter = require('../home/student_home');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/images')); // Use path.join for better cross-platform compatibility
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Save with unique name
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Images only!'));
    }
  }
});

// Serve Student signup page
router.get('/signup', (req, res) => {
  res.render('student/student_signup'); // Ensure this file exists
});

// Handle Student Registration with photo upload
router.post('/signup', upload.single('photo'), async (req, res) => {
  try {
    const { name, enrollment, branch, email, password } = req.body;
    const photo = req.file ? req.file.filename : null; // Get the filename of the uploaded photo

    // Check if student already exists
    const [results] = await studentPool.query('SELECT * FROM students WHERE enrollment = ?', [enrollment]);
    if (results.length > 0) {
      return res.send("Student already exists. Please choose a different enrollment ID.");
    }

    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new student
    await studentPool.query(
      'INSERT INTO students (name, enrollment, branch, email, password, photo) VALUES (?, ?, ?, ?, ?, ?)',
      [name, enrollment, branch, email, hashedPassword, photo]
    );

    res.send("Student registered successfully");
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).send('Internal server error');
  }
});

// Serve Student login page
router.get('/login', (req, res) => {
  res.render('student/student_login'); // Ensure this file exists
});

// Handle Student Login
router.post('/login', async (req, res) => {
  try {
    const { enrollment, password } = req.body;

    // Fetch the student details
    const [results] = await studentPool.query('SELECT * FROM students WHERE enrollment = ?', [enrollment]);
    if (results.length === 0) {
      return res.send("Enrollment ID cannot be found");
    }

    const student = results[0]; // Student data

    // Compare the hashed password
    const isPasswordMatch = await bcrypt.compare(password, student.password);
    if (!isPasswordMatch) {
      return res.send("Wrong password");
    }

    // Set session variables for student
    req.session.studentId = student.enrollment; // Changed to use enrollment as ID
    req.session.enrollment = student.enrollment;
    req.session.studentName = student.name;

    // Redirect to student home page after login
    res.redirect('/student/home');
  } catch (error) {
    console.error('Error during student login:', error);
    res.status(500).send('Internal server error');
  }
});

// Use the student_home router for handling student home routes
router.use('/home', studentHomeRouter);

// Handle Enrollment
router.post('/enroll', async (req, res) => {
  const { course } = req.body;
  const studentId = req.session.studentId; // Assuming student ID is stored in session

  if (!studentId) {
    return res.redirect('/student/login'); // Redirect to login if not authenticated
  }

  try {
    // Check if the enrollment record already exists
    const [existingEnrollments] = await studentPool.query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [studentId, course]
    );

    if (existingEnrollments.length > 0) {
      return res.send("You are already enrolled in this course.");
    }

    // Insert into enrollments table
    await studentPool.query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [studentId, course]);
    res.redirect('/student/attendance'); // Redirect to attendance page after successful enrollment
  } catch (err) {
    console.error('Error enrolling in course:', err);
    res.status(500).send('Error enrolling in course');
  }
});

// Show student attendance
router.get('/attendance', async (req, res) => {
  const studentId = req.session.studentId; // Assuming student ID is stored in session

  if (!studentId) {
    return res.redirect('/student/login'); // Redirect to login if not authenticated
  }

  try {
    // Fetch attendance data from the database
    const [results] = await studentPool.query('SELECT * FROM attendance WHERE student_id = ?', [studentId]);

    // Render the attendance page with fetched data
    res.render('student/attendance', { attendance: results }); // Ensure this file exists
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).send('Internal server error');
  }
});

// Handle logout
router.get('/logout', (req, res) => {
  req.session.destroy(); // Destroy the session
  res.redirect('/student/login'); // Redirect to login page
});

module.exports = router;
