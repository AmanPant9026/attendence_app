const mysql = require('mysql2/promise');

// Create pools for student and admin databases
const studentPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'IHxalb#2',
  database: 'attendanceSystem'
});

const adminPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'IHxalb#2',
  database: 'attendanceSystem'
});

// Function to test database connection
const testConnection = async (pool, name) => {
  try {
    const connection = await pool.getConnection();
    console.log(`${name} database connected successfully`);
    connection.release(); // Release the connection back to the pool
  } catch (err) {
    console.error(`Error connecting to ${name} database:`, err);
  }
};

// Test connections for student and admin pools
testConnection(studentPool, 'Student');
testConnection(adminPool, 'Admin');

module.exports = { studentPool, adminPool };
