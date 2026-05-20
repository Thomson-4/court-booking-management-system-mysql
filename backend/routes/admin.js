const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
});

router.get('/courts', async (req, res) => {
  try {
    const [courts] = await db.query('SELECT * FROM courts');
    res.json(courts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/courts', async (req, res) => {
  const { name, sport, address, rate_per_hour } = req.body;
  if (!name || !sport || !address || !rate_per_hour)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const [result] = await db.query(
      'INSERT INTO courts (name, sport, address, rate_per_hour, status) VALUES (?, ?, ?, ?, "available")',
      [name, sport, address, rate_per_hour]
    );
    res.json({ message: 'Court added successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/courts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sport, address, rate_per_hour, status } = req.body;
  if (!name || !sport || !address || !rate_per_hour)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const [result] = await db.query(
      'UPDATE courts SET name = ?, sport = ?, address = ?, rate_per_hour = ?, status = ? WHERE id = ?',
      [name, sport, address, rate_per_hour, status || 'available', id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Court not found' });
    res.json({ message: 'Court updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/courts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [court] = await db.query('SELECT id FROM courts WHERE id = ?', [id]);
    if (court.length === 0)
      return res.status(404).json({ error: 'Court not found' });

    await db.query('DELETE FROM bookings WHERE court_id = ?', [id]);
    await db.query('DELETE FROM courts WHERE id = ?', [id]);
    res.json({ message: 'Court deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT b.*, u.username, c.name AS court_name, c.sport
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN courts c ON b.court_id = c.id
       ORDER BY b.created_at DESC`
    );
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
