# Court Booking and Management System

A full-stack web application for booking and managing sports courts, built as a **DBMS Mini Project** at REVA University. The system allows users to register, browse courts, book time slots, and manage payments via an in-app wallet.

---

## Features

### User
- Register and login with JWT-based authentication
- Browse available sports courts (badminton, tennis, football, etc.)
- Book a court by selecting date and time slot
- Wallet system — add funds and pay for bookings automatically
- Cancel bookings with automatic refund to wallet
- View all personal bookings

### Admin
- Add, update, and manage court listings
- Set hourly rates per court
- Monitor all bookings across the platform

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | MySQL |
| Authentication | JSON Web Tokens (JWT) |
| ORM / DB Driver | mysql2 |
| Environment Config | dotenv |

---

## Database Design

### Entities & Tables

| Table | Description |
|-------|-------------|
| `users` | Stores user credentials, role, and wallet balance |
| `courts` | Court details — name, sport type, location, hourly rate |
| `bookings` | Booking records linking users to courts with date, time, and status |

### Key Concepts Applied
- ER Modelling (see [`ER Diagram.png`](ER%20Diagram.png))
- Normalization (up to 3NF)
- Transactions with ROLLBACK for double-booking prevention
- Row-level locking (`SELECT ... FOR UPDATE`) to handle concurrent bookings
- Role-based access control (user / admin)

---

## Project Structure

```
court-booking-management-system-mysql/
│
├── app.js                        # Express server entry point
├── package.json
├── .env.example                  # Environment variable template
│
├── config/
│   └── db.js                     # MySQL connection pool
│
├── middleware/
│   └── auth.js                   # JWT authentication middleware
│
├── routes/
│   ├── auth.js                   # Register & Login
│   ├── courts.js                 # Court listing & details
│   ├── bookings.js               # Book, cancel, view bookings
│   ├── wallet.js                 # Wallet balance & top-up
│   └── admin.js                  # Admin court management
│
├── migrations/
│   └── add_wallet_balance.sql    # DB migration scripts
│
└── ER Diagram.png                # Entity-Relationship diagram
```

---

## Getting Started

### Prerequisites
- Node.js (v16+)
- MySQL (v8+)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Thomson-4/court-booking-management-system-mysql.git
cd court-booking-management-system-mysql
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
```bash
cp .env.example .env
```
Edit `.env` with your MySQL credentials and a secure JWT secret.

**4. Set up the database**
```sql
CREATE DATABASE court_booking;
```
Then run the migration script:
```bash
mysql -u root -p court_booking < migrations/add_wallet_balance.sql
```

**5. Start the server**
```bash
node app.js
```
Server runs on `http://localhost:5000`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT token |

### Courts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courts` | Get all courts |
| GET | `/api/courts/:id` | Get court by ID |

### Bookings *(requires auth)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings?courtId=&date=` | Get booked slots for a court |
| POST | `/api/bookings` | Book a court slot |
| GET | `/api/bookings/user/:userId` | Get user's bookings |
| PATCH | `/api/bookings/:id/cancel` | Cancel a booking (auto-refund) |

### Wallet *(requires auth)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet/balance` | Get wallet balance |
| POST | `/api/wallet/add` | Add funds to wallet |

### Admin *(requires auth + admin role)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/courts` | Add a new court |
| PUT | `/api/admin/courts/:id` | Update court details |
| DELETE | `/api/admin/courts/:id` | Delete a court |

---

## ER Diagram

![ER Diagram](ER%20Diagram.png)

---

## Academic Details

- **Institution:** REVA University, Bengaluru
- **Course:** DBMS Lab — B22EF0405
- **Academic Year:** 2024–25
- **Semester:** 4th

---

## Author

**Thomson Sunny**  
GitHub: [@Thomson-4](https://github.com/Thomson-4)
