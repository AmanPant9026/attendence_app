const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Assuming you have a config file for DB connection

// Route to render the admin home page with courses from the database
router.get('/home', async (req, res) => {
    try {
      // Fetch attendance records
      const [attendance] = await adminPool.query('SELECT * FROM attendance');
      console.log('Attendance:', attendance); // Log attendance data
  
      // Render the EJS template with the `attendance` variable
      res.render('admin/admin_home', { attendance });
    } catch (err) {
      console.error('Error fetching attendance:', err);
      res.status(500).send('Server error');
    }
  });

// Route to handle form submission and update attendance based on selected course
router.post('/update-attendance', (req, res) => {
    const selectedCourseId = req.body.course;
    
    // Handle the attendance update logic for the selected course
    console.log('Selected course ID:', selectedCourseId);
    
    // Redirect back to the home page after processing
    res.redirect('/admin/home');
});

module.exports = router;
