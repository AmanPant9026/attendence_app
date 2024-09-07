const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const adminPool = require('../config/config').adminPool;

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
      res.render('admin/admin_home'); // Adjust as needed
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

module.exports = router;
