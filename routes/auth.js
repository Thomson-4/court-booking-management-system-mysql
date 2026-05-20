const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Test database connection and get table structure
db.getConnection()
  .then(async (connection) => {
    console.log('Database connection successful in auth routes');
    try {
      const [rows] = await connection.query('SHOW COLUMNS FROM users');
      console.log('Users table columns:', rows.map(col => col.Field));
    } catch (err) {
      console.error('Error getting table structure:', err);
    }
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed in auth routes:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
  });

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username }); // Log login attempt (without password)
  
  if (!username || !password) {
    console.log('Login failed: Missing credentials');
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    console.log('Executing query for user:', username);
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    console.log('Query result:', users.length > 0 ? 'User found' : 'User not found');
    
    if (users.length === 0) {
      console.log('Login failed: User not found');
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (users[0].password !== password) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ error: "Invalid username or password" });
    }

    console.log('Login successful for user:', username);
    const token = jwt.sign(
      { id: users[0].id, role: users[0].role }, 
      process.env.JWT_SECRET || 'your-secret-key', 
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      userId: users[0].id, 
      role: users[0].role,
      walletBalance: users[0].wallet_balance || 0 
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      details: error.sqlMessage || error.message
    });
  }
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  console.log('Registration attempt:', { username }); // Log registration attempt (without password)
  
  if (!username || !password) {
    console.log('Registration failed: Missing credentials');
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      console.log('Registration failed: Username already taken');
      return res.status(400).json({ error: "Username already taken" });
    }

    console.log('Creating new user:', username);
    const [result] = await db.query(
      'INSERT INTO users (username, password, role, wallet_balance) VALUES (?, ?, "user", 0.00)',
      [username, password]
    );
    console.log('Registration successful for:', username, 'with ID:', result.insertId);
    res.json({ message: "Registered successfully" });
  } catch (error) {
    console.error('Registration error details:', {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      details: error.sqlMessage || error.message
    });
  }
});

module.exports = router;
