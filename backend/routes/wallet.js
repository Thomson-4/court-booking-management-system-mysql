const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/balance', auth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ balance: users[0].wallet_balance || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/add', auth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    await db.query(
      'UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?',
      [amount, req.user.id]
    );
    await db.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES (?, "credit", ?, ?)',
      [req.user.id, amount, `Added ₹${amount} to wallet`]
    );
    const [users] = await db.query('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Money added successfully', newBalance: users[0].wallet_balance || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const [txns] = await db.query(
      'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(txns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
