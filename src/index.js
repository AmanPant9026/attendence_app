const express = require('express');
const session = require('express-session');
const path = require('path');
const { exec } = require('child_process');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');

const app = express();

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views')); // Ensure this path is correct for your views directory

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Ensure this path is correct for your public assets

// Session middleware configuration
app.use(session({
  secret: 'your-secret-key', // Replace with your own secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set secure to true if using HTTPS
}));

// Routes
app.use('/student', studentRoutes);
app.use('/admin', adminRoutes);

// Route to execute a Python script
app.get('/run-python/:enrollment', (req, res) => {
    const enrollment = req.params.enrollment; // Get enrollment from URL parameters
    const pythonScriptPath = path.join(__dirname, 'upload_image.py'); // Ensure this path is correct

    exec(`python3 ${pythonScriptPath} ${enrollment}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error.message}`);
            return res.status(500).send('Error executing script');
        }
        if (stderr) {
            console.error(`Python stderr: ${stderr}`);
            return res.status(500).send('Script execution error: ' + stderr);
        }
        console.log(`Python stdout: ${stdout}`);
        res.send(`Python script executed successfully: ${stdout}`);
    });
});

// Default route
app.get('/', (req, res) => {
    res.render('main'); // Ensure you have a 'main.ejs' file in the views directory
});

// Error handling for 404
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
