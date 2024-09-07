const express = require('express');
const app = express();
const path = require('path');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/student', studentRoutes);
app.use('/admin', adminRoutes);

// Default route
app.get('/', (req, res) => {
  res.render('main'); // Ensure `main.ejs` exists in the views directory
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
