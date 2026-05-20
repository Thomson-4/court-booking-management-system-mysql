# Court Booking and Management System

A full-stack web application for booking and managing sports courts, built as a **DBMS Mini Project** at REVA University.

Users can register, browse courts, book time slots, and manage payments via a built-in wallet. Admins can manage courts and view all bookings.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | MySQL |
| Frontend | HTML, CSS, Vanilla JS |
| Authentication | JSON Web Tokens (JWT) |
| Password Hashing | bcryptjs |

---

## Project Structure

```
court-booking-management-system-mysql/
├── backend/
│   ├── app.js                  # Express server (serves API + frontend)
│   ├── schema.sql              # Database schema (run this first)
│   ├── seed.js                 # Seed admin user + sample courts
│   ├── package.json
│   ├── .env.example
│   ├── config/db.js
│   ├── middleware/auth.js
│   └── routes/
│       ├── auth.js
│       ├── courts.js
│       ├── bookings.js
│       ├── wallet.js
│       └── admin.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── ER Diagram.png
```

---

## Getting Started

### Prerequisites
- Node.js v16+
- MySQL v8+

### 1. Clone the repository
```bash
git clone https://github.com/Thomson-4/court-booking-management-system-mysql.git
cd court-booking-management-system-mysql
```

### 2. Set up the database
```bash
mysql -u root -p < backend/schema.sql
```

### 3. Configure environment variables
```bash
cd backend
cp .env.example .env
```
Edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=court_booking
JWT_SECRET=pick_a_long_random_string
PORT=5000
```

### 4. Install dependencies & seed data
```bash
npm install
npm run seed
```
This creates an **admin user** and **5 sample courts**.

### 5. Start the server
```bash
npm start
```

Open **http://localhost:5000** in your browser.

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |

Register any new account for a regular user.

---

## Features

### User
- Register & login with hashed passwords (bcrypt)
- Browse and filter courts by sport
- Book courts by selecting date and time slot
- Wallet — add funds, auto-deducted on booking
- Cancel bookings with automatic refund

### Admin
- Add, edit, and delete courts
- View all bookings across all users

---

## API Endpoints

### Auth
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |

### Courts
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/courts` | No |
| GET | `/api/courts/:id` | No |

### Bookings
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/bookings?courtId=&date=` | User |
| POST | `/api/bookings` | User |
| GET | `/api/bookings/user/:userId` | User |
| PATCH | `/api/bookings/:id/cancel` | User |

### Wallet
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/wallet/balance` | User |
| POST | `/api/wallet/add` | User |

### Admin
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/admin/courts` | Admin |
| POST | `/api/admin/courts` | Admin |
| PUT | `/api/admin/courts/:id` | Admin |
| DELETE | `/api/admin/courts/:id` | Admin |
| GET | `/api/admin/bookings` | Admin |

---

## ER Diagram

![ER Diagram](ER%20Diagram.png)

---

## Author

**Thomson Sunny**  
GitHub: [@Thomson-4](https://github.com/Thomson-4)
