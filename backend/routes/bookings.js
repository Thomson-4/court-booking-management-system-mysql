const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { courtId, date } = req.query;
  try {
    const [bookings] = await db.query(
      'SELECT time FROM bookings WHERE court_id = ? AND date = ? AND status = "confirmed"',
      [courtId, date]
    );
    res.json(bookings.map(b => b.time));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { courtId, date, time } = req.body;
  const userId = req.user.id;
  let connection;

  try {
    const bookingDateTime = new Date(`${date}T${time}`);
    if (bookingDateTime < new Date())
      return res.status(400).json({ error: 'Cannot book a time slot in the past' });

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [courts] = await connection.query('SELECT * FROM courts WHERE id = ?', [courtId]);
    const [users] = await connection.query('SELECT wallet_balance FROM users WHERE id = ?', [userId]);

    if (courts.length === 0) { await connection.rollback(); return res.status(404).json({ error: 'Court not found' }); }
    if (users.length === 0) { await connection.rollback(); return res.status(404).json({ error: 'User not found' }); }

    const courtRate = parseFloat(courts[0].rate_per_hour);
    const walletBalance = parseFloat(users[0].wallet_balance || 0);

    if (walletBalance < courtRate) {
      await connection.rollback();
      return res.status(402).json({ error: 'Insufficient balance', required: courtRate, current: walletBalance });
    }

    const [existing] = await connection.query(
      'SELECT id FROM bookings WHERE court_id = ? AND date = ? AND time = ? AND status = "confirmed" FOR UPDATE',
      [courtId, date, time]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'This slot is already booked' });
    }

    const [result] = await connection.query(
      'INSERT INTO bookings (user_id, court_id, date, time, status) VALUES (?, ?, ?, ?, "confirmed")',
      [userId, courtId, date, time]
    );
    await connection.query(
      'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
      [courtRate, userId]
    );
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES (?, "debit", ?, ?)',
      [userId, courtRate, `Booking: ${courts[0].name} on ${date} at ${time}`]
    );

    await connection.commit();

    res.status(201).json({ message: 'Booking successful', bookingId: result.insertId, amount: courtRate });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: 'Booking failed', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT bookings.*, courts.name, courts.sport, courts.rate_per_hour
       FROM bookings JOIN courts ON bookings.court_id = courts.id
       WHERE bookings.user_id = ?
       ORDER BY bookings.created_at DESC`,
      [req.params.userId]
    );
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/cancel', auth, async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [bookings] = await connection.query(
      `SELECT b.*, c.rate_per_hour, c.name AS court_name
       FROM bookings b JOIN courts c ON b.court_id = c.id
       WHERE b.id = ? AND b.user_id = ? AND b.status = "confirmed"`,
      [req.params.id, req.user.id]
    );
    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Booking not found or already cancelled' });
    }

    const booking = bookings[0];
    const refundAmount = parseFloat(booking.rate_per_hour);

    await connection.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [req.params.id]);
    await connection.query(
      'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
      [refundAmount, req.user.id]
    );
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES (?, "credit", ?, ?)',
      [req.user.id, refundAmount, `Refund: ${booking.court_name} booking cancelled`]
    );

    await connection.commit();
    res.json({ message: 'Booking cancelled successfully', refundAmount });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
