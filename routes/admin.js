const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Admin middleware
router.use(auth, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  next();
});

// Court management
router.get('/courts', async (req, res) => {
  try {
    const [courts] = await db.query('SELECT * FROM courts');
    res.json(courts);
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/courts', async (req, res) => {
  console.log('Received request body:', req.body);
  const { name, sport, address, rate_per_hour } = req.body;
  
  // Validate required fields
  if (!name || !sport || !address || !rate_per_hour) {
    return res.status(400).json({ 
      error: "Missing required fields",
      received: { name, sport, address, rate_per_hour }
    });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO courts (name, sport, address, rate_per_hour, status) VALUES (?, ?, ?, ?, "available")',
      [name, sport, address, rate_per_hour]
    );
    console.log('Insert result:', result);
    res.json({ message: "Court added successfully", id: result.insertId });
  } catch (error) {
    console.error('Error adding court:', error);
    res.status(500).json({ 
      error: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
  }
});

router.delete('/courts/:id', async (req, res) => {
  const courtId = req.params.id;
  console.log('Attempting to delete court with ID:', courtId);
  
  try {
    // First check if the court exists
    const [court] = await db.query('SELECT * FROM courts WHERE id = ?', [courtId]);
    console.log('Found court:', court);
    
    if (court.length === 0) {
      console.log('Court not found');
      return res.status(404).json({ error: "Court not found" });
    }

    // Check for bookings
    const [bookings] = await db.query('SELECT * FROM bookings WHERE court_id = ?', [courtId]);
    console.log('Found bookings:', bookings);
    
    if (bookings.length > 0) {
      console.log('Deleting bookings first...');
      await db.query('DELETE FROM bookings WHERE court_id = ?', [courtId]);
      console.log('Bookings deleted successfully');
    }
    
    // Now delete the court
    console.log('Deleting court...');
    const [result] = await db.query('DELETE FROM courts WHERE id = ?', [courtId]);
    console.log('Delete result:', result);
    
    if (result.affectedRows === 0) {
      console.log('No rows affected during court deletion');
      return res.status(404).json({ error: "Court not found" });
    }
    
    console.log('Court deleted successfully');
    res.json({ message: "Court deleted successfully" });
  } catch (error) {
    console.error('Detailed error in delete operation:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ 
      error: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      code: error.code
    });
  }
});

// Existing users and bookings routes remain same
// ...

module.exports = router;
