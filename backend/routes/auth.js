const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' });

  try {
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0)
      return res.status(401).json({ error: 'Invalid username or password' });

    const valid = await bcrypt.compare(password, users[0].password);
    if (!valid)
      return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: users[0].id, role: users[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      userId: users[0].id,
      role: users[0].role,
      username: users[0].username,
      walletBalance: users[0].wallet_balance || 0
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, password, role, wallet_balance) VALUES (?, ?, "user", 0.00)',
      [username, hashed]
    );
    res.json({ message: 'Registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
