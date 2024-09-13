const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const adminPool = require('../config/config').adminPool;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve Admin login page
router.get('/login', (req, res) => {
  res.render('admin/admin_login');
});

// Serve Admin signup page
router.get('/signup', (req, res) => {
  res.render('admin/admin_signup');
});

// Handle Admin Registration
router.post('/signup', async (req, res) => {
  try {
    const { name, AdminId, branch, email, password } = req.body;

    // Validate input
    if (!name || !AdminId || !branch || !email || !password) {
      return res.status(400).send("All fields are required.");
    }

    // Check if admin already exists
    const [rows] = await adminPool.query('SELECT * FROM teachers WHERE AdminId = ?', [AdminId]);

    if (rows.length > 0) {
      return res.status(400).send("Admin already exists. Please choose a different Admin ID.");
    }

    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new admin
    await adminPool.query(
      'INSERT INTO teachers (name, AdminId, branch, email, password) VALUES (?, ?, ?, ?, ?)',
      [name, AdminId, branch, email, hashedPassword]
    );

    res.send("Admin registered successfully");
  } catch (error) {
    console.error('Error registering admin:', error);
    res.status(500).send('Internal server error');
  }
});

// Handle Admin Login
router.post('/login', async (req, res) => {
  try {
    const { AdminId, password } = req.body;

    // Validate input
    if (!AdminId || !password) {
      return res.status(400).send("Admin ID and password are required.");
    }

    // Query the database for the given AdminId
    const [rows] = await adminPool.query('SELECT * FROM teachers WHERE AdminId = ?', [AdminId]);

    if (rows.length === 0) {
      return res.status(400).send("Admin ID cannot be found");
    }

    // Compare the hashed password
    const isPasswordMatch = await bcrypt.compare(password, rows[0].password);

    if (isPasswordMatch) {
      // Successful login
      res.redirect('/admin/home'); // Adjust redirection as needed
    } else {
      // Incorrect password
      res.status(400).send("Wrong password");
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).send('Internal server error');
  }
});

// Handle Admin Logout
router.get('/logout', (req, res) => {
  // Implement session or token destruction here if needed
  res.redirect('/admin/login');
});

// Admin home route
// Admin home route
router.get('/home', async (req, res) => {
  try {
    // Fetch attendance records from the database
    const [attendance] = await adminPool.query('SELECT * FROM attendance'); // Adjust this query as needed

    // Fetch the list of courses
    const [courses] = await adminPool.query('SELECT * FROM courses');

    console.log('Fetched courses:', courses); // Debugging line to check fetched courses

    // Render the EJS template and pass the `attendance` and `courses` variables
    res.render('admin/admin_home', { attendance, courses });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).send('Server error');
  }
});


// Handle form submission to run the video comparison script
router.post('/run-video-compare', upload.single('videoFile'), (req, res) => {
  const selectedCourseId = req.body.course;
  const videoFilePath = req.file.path;

  // Ensure both courseId and video path are provided
  if (!selectedCourseId || !videoFilePath) {
      return res.status(400).json({ success: false, error: 'Course ID or video file is missing' });
  }

  // Path to your Python script
  const pythonScriptPath = path.resolve(__dirname, '../video_compare.py'); // Use path.resolve for better path management

  // Run the Python script with the video file and selected course ID as arguments
  const command = `python "${pythonScriptPath}" "${videoFilePath}" "${selectedCourseId}"`;

  exec(command, (error, stdout, stderr) => {
      // Clean up the uploaded file
      fs.unlink(videoFilePath, (unlinkError) => {
          if (unlinkError) console.error(`Error deleting file: ${unlinkError.message}`);
      });

      if (error) {
          console.error(`Error executing Python script: ${error.message}`);
          console.error(`stderr: ${stderr}`);
          return res.status(500).json({ success: false, error: 'Error processing video' });
      }

      console.log(`stdout: ${stdout}`);
      res.json({ success: true, message: 'Attendance marked successfully' });
  });
});

module.exports = router;
