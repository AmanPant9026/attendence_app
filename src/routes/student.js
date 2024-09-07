const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { studentPool } = require('../config/config');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images'); // Folder where images will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Serve Student signup page
router.get('/signup', (req, res) => {
  res.render('student/student_signup');
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
    bcrypt.hash(password, saltRounds, async (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).send('Internal server error');
      }

      // Insert the new student
      const [insertResult] = await studentPool.query(
        'INSERT INTO students (name, enrollment, branch, email, password, photo) VALUES (?, ?, ?, ?, ?, ?)',
        [name, enrollment, branch, email, hashedPassword, photo]
      );

      res.send("Student registered successfully");
    });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).send('Internal server error');
  }
});

// Serve Student login page
router.get('/login', (req, res) => {
  res.render('student/student_login');
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

    // Compare the hashed password
    bcrypt.compare(password, results[0].password, (err, isPasswordMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).send('Internal server error');
      }

      if (isPasswordMatch) {
        res.render('student/student_home'); // Adjust as needed
      } else {
        res.send("Wrong password");
      }
    });
  } catch (error) {
    console.error('Error during student login:', error);
    res.status(500).send('Internal server error');
  }
});

// Serve Student home page
router.get('/home', (req, res) => {
  res.render('student/student_home');
});

module.exports = router;
