require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seed() {
  try {
    // Admin user (password: admin123)
    const adminHash = await bcrypt.hash('admin123', 10);
    await db.query(
      'INSERT IGNORE INTO users (username, password, role, wallet_balance) VALUES (?, ?, "admin", 1000.00)',
      ['admin', adminHash]
    );

    // Sample courts
    const courts = [
      ['Badminton Court A', 'Badminton', 'REVA University, Bengaluru', 150.00],
      ['Badminton Court B', 'Badminton', 'REVA University, Bengaluru', 150.00],
      ['Tennis Court', 'Tennis', 'REVA University, Bengaluru', 250.00],
      ['Football Ground', 'Football', 'REVA University, Bengaluru', 500.00],
      ['Basketball Court', 'Basketball', 'REVA University, Bengaluru', 200.00],
    ];

    for (const [name, sport, address, rate] of courts) {
      await db.query(
        'INSERT IGNORE INTO courts (name, sport, address, rate_per_hour, status) VALUES (?, ?, ?, ?, "available")',
        [name, sport, address, rate]
      );
    }

    console.log('Seed completed successfully.');
    console.log('Admin credentials -> username: admin | password: admin123');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
