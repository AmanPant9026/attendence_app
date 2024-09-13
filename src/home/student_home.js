const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { studentPool } = require('../config/config');

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/profile-photos/');
  },
  filename: function (req, file, cb) {
    cb(null, req.session.enrollment + path.extname(file.originalname));
  }
});

const upload = multer({ 
  dest: 'uploads/', // Directory to save the uploaded files
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Serve Student Home Page
router.get('/', async (req, res) => {
  try {
    const { enrollment } = req.session;

    if (!enrollment) {
      return res.redirect('/student/login'); // Redirect to login if not authenticated
    }

    // Fetch student details, including profile photo
    const [studentResults] = await studentPool.query('SELECT name, photo FROM students WHERE enrollment = ?', [enrollment]);
    const student = studentResults[0];
    const studentName = student?.name || 'Student';
    const studentPhoto = student?.photo || '/images/default-profile.png';

    // Fetch available courses
    const [courses] = await studentPool.query('SELECT id, course_name FROM courses');

    res.render('student/student_home', { studentName, studentPhoto, courses });
  } catch (error) {
    console.error('Error loading student home page:', error.message);
    res.status(500).send('Internal server error');
  }
});

// Handle Course Enrollment
router.post('/enroll', async (req, res) => {
  try {
    const { enrollment } = req.session;

    if (!enrollment) {
      return res.redirect('/student/login'); // Redirect to login if not authenticated
    }

    const { course } = req.body;

    if (!course) {
      return res.status(400).send("Course selection is required.");
    }

    // Check if the student is already enrolled in the course
    const [existingEnrollment] = await studentPool.query(
      'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?',
      [enrollment, course]
    );

    if (existingEnrollment.length > 0) {
      return res.redirect(`/student/attendance/${course}`);
    }

    // Insert student enrollment into the course
    await studentPool.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
      [enrollment, course]
    );

    // Insert attendance record for the student
    await studentPool.query(
      'INSERT INTO attendance (student_id, course_id, date) VALUES (?, ?, NOW())',
      [enrollment, course]
    );

    res.redirect(`/student/attendance/${course}`);
  } catch (error) {
    console.error('Error during enrollment:', error.message);
    res.status(500).send('Internal server error');
  }
});

// Serve Attendance Page
router.get('/attendance/:courseId', async (req, res) => {
  try {
    const { enrollment } = req.session;
    const { courseId } = req.params;

    if (!enrollment) {
      return res.redirect('/student/login'); // Redirect to login if not authenticated
    }

    // Fetch student attendance for the specific course
    const [attendance] = await studentPool.query(
      'SELECT date FROM attendance WHERE student_id = ? AND course_id = ?',
      [enrollment, courseId]
    );

    // Fetch course details
    const [courseDetails] = await studentPool.query(
      'SELECT course_name FROM courses WHERE id = ?',
      [courseId]
    );
    const courseName = courseDetails[0]?.course_name || 'Course';

    res.render('student/view_attendance', { courseName, attendance });
  } catch (error) {
    console.error('Error loading attendance page:', error.message);
    res.status(500).send('Internal server error');
  }
});

// Route to handle photo upload
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    const { enrollment } = req.session;

    if (!enrollment) {
      return res.redirect('/student/login'); // Redirect to login if not authenticated
    }

    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    // Define the path where the file will be saved
    const photoPath = `/uploads/${req.file.filename}`;

    // Update student profile photo in the database
    await studentPool.query(
      'UPDATE students SET photo = ? WHERE enrollment = ?',
      [photoPath, enrollment]
    );

    res.redirect('/student');
  } catch (error) {
    console.error('Error uploading photo:', error.message);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
