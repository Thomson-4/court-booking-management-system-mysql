const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [courts] = await db.query('SELECT * FROM courts');
    res.json(courts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [courts] = await db.query('SELECT * FROM courts WHERE id = ?', [req.params.id]);
    if (courts.length === 0) {
      return res.status(404).json({ error: 'Court not found' });
    }
    res.json(courts[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
