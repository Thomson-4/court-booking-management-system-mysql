const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/bookings?courtId=1&date=2025-06-05
router.get('/', auth, async (req, res) => {
  const { courtId, date } = req.query;
  try {
    const [bookings] = await db.query(
      'SELECT time FROM bookings WHERE court_id = ? AND date = ? AND status = "confirmed"',
      [courtId, date]
    );
    console.log('Fetched booked slots:', bookings);
    res.json(bookings.map(b => b.time));
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings
router.post('/', auth, async (req, res) => {
  const { courtId, date, time } = req.body;
  const userId = req.user.id;
  let connection;

  console.log('Booking request:', { courtId, date, time, userId });

  try {
    // Check if the booking time is in the past
    const bookingDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    if (bookingDateTime < now) {
      return res.status(400).json({ error: 'Cannot book a time slot in the past' });
    }

    // Get a connection from the pool
    connection = await db.getConnection();
    await connection.beginTransaction();
    console.log('Transaction started');

    // Get court details and user's wallet balance
    const [courts] = await connection.query('SELECT rate_per_hour FROM courts WHERE id = ?', [courtId]);
    console.log('Court details:', courts);

    const [users] = await connection.query('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
    console.log('User details:', users);

    if (courts.length === 0) {
      console.log('Court not found:', courtId);
      await connection.rollback();
      return res.status(404).json({ error: 'Court not found' });
    }

    if (users.length === 0) {
      console.log('User not found:', userId);
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const courtRate = parseFloat(courts[0].rate_per_hour);
    const walletBalance = parseFloat(users[0].wallet_balance || 0);

    console.log('Balance check:', { courtRate, walletBalance });

    // Check if user has enough balance
    if (walletBalance < courtRate) {
      console.log('Insufficient balance:', { required: courtRate, current: walletBalance });
      await connection.rollback();
      return res.status(402).json({ 
        error: 'Insufficient balance',
        required: courtRate,
        current: walletBalance
      });
    }

    // Check if slot is already booked with a lock
    const [existing] = await connection.query(
      'SELECT * FROM bookings WHERE court_id = ? AND date = ? AND time = ? AND status = "confirmed" FOR UPDATE',
      [courtId, date, time]
    );
    console.log('Existing bookings check:', existing);

    if (existing.length > 0) {
      console.log('Slot already booked');
      await connection.rollback();
      return res.status(409).json({ 
        error: 'This slot is already booked',
        details: 'The time slot you selected has just been booked by another user. Please select a different time.'
      });
    }

    // Create booking
    const [result] = await connection.query(
      'INSERT INTO bookings (user_id, court_id, date, time, status) VALUES (?, ?, ?, ?, "confirmed")',
      [userId, courtId, date, time]
    );
    console.log('Booking created:', result);

    // Deduct amount from wallet
    await connection.query(
      'UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?',
      [courtRate, userId]
    );
    console.log('Amount deducted from wallet');

    // Commit transaction
    await connection.commit();
    console.log('Transaction committed');

    // Fetch updated booked slots
    const [updatedBookings] = await connection.query(
      'SELECT time FROM bookings WHERE court_id = ? AND date = ? AND status = "confirmed"',
      [courtId, date]
    );

    res.status(201).json({
      message: 'Booking successful',
      bookingId: result.insertId,
      amount: courtRate,
      bookedSlots: updatedBookings.map(b => b.time)
    });
  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    console.error('Booking error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      error: 'Booking failed',
      details: error.message
    });
  } finally {
    // Release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});

// GET /api/bookings/user/:userId
router.get('/user/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  try {
    const [bookings] = await db.query(
      'SELECT bookings.*, courts.name, courts.sport FROM bookings JOIN courts ON bookings.court_id = courts.id WHERE bookings.user_id = ? AND bookings.status = "confirmed"',
      [userId]
    );
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', auth, async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    // Get a connection from the pool
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Get booking details including court rate
    const [bookings] = await connection.query(
      `SELECT b.*, c.rate_per_hour 
       FROM bookings b 
       JOIN courts c ON b.court_id = c.id 
       WHERE b.id = ? AND b.user_id = ? AND b.status = "confirmed"`,
      [id, req.user.id]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Booking not found or already cancelled' });
    }

    const booking = bookings[0];
    const refundAmount = parseFloat(booking.rate_per_hour);

    // Update booking status to cancelled
    await connection.query(
      'UPDATE bookings SET status = "cancelled" WHERE id = ?',
      [id]
    );

    // Refund the amount to user's wallet
    await connection.query(
      'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
      [refundAmount, req.user.id]
    );

    // Commit transaction
    await connection.commit();

    res.json({ 
      message: "Booking cancelled successfully",
      refundAmount: refundAmount
    });
  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
