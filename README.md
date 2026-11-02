# RestroPOS — Restaurant Point of Sale Management System

A complete, full-stack restaurant POS system built with React, Express.js, and MySQL.

![RestroPOS](https://img.shields.io/badge/RestroPOS-v1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Express](https://img.shields.io/badge/Express-4-000000)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1)

## Features

- **Dashboard** — Real-time sales stats, order counts, table availability
- **POS / New Order** — Create dine-in and takeaway orders with menu selection
- **Menu Management** — Categories and menu items with pricing and availability
- **Table Management** — Visual table grid with status tracking
- **Kitchen Dashboard** — View and process orders (Pending → Preparing → Ready)
- **Cashier / Checkout** — Complete payments and generate printable receipts
- **User Management** — Role-based access (Admin, Staff, Kitchen, Cashier)
- **Reports** — Sales analytics, order breakdowns, payment summaries
- **Authentication** — JWT-based login with role-based route protection

## Tech Stack

| Layer     | Technology           |
|-----------|---------------------|
| Frontend  | React 18, React Router, Axios |
| Backend   | Node.js, Express.js |
| Database  | MySQL 8             |
| Auth      | JWT + bcrypt         |

## Project Structure

```
restropos/
├── package.json                # Root scripts (npm run dev, frontend, backend)
├── README.md
├── run.py                      # One-click Python launcher (python3 run.py)
├── start.sh                    # Universal start script
├── .vscode/                    # Pre-configured VS Code settings & tasks
│   ├── launch.json
│   ├── settings.json
│   └── tasks.json
├── backend/                    # Express.js REST API & MySQL
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   ├── server.js               # Entry point
│   ├── config/
│   │   └── db.js               # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js             # JWT auth & role authorization
│   │   └── validate.js         # Input validation
│   ├── routes/
│   │   ├── auth.js
│   │   ├── categories.js
│   │   ├── dashboard.js
│   │   ├── menu.js
│   │   ├── orders.js
│   │   ├── payments.js
│   │   ├── reports.js
│   │   ├── tables.js
│   │   └── users.js
│   ├── db/
│   │   ├── schema.sql          # Database schema
│   │   ├── seed.sql            # SQL seed data
│   │   └── seed.js             # Automated seed script
│   └── utils/
│       └── helpers.js
└── frontend/                   # React 18 User Interface
    ├── package.json
    ├── index.html              # Standalone interactive runner
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js
        ├── App.css
        ├── index.js
        ├── api/
        │   └── axios.js        # Axios instance with JWT interceptor
        ├── context/
        │   └── AuthContext.js  # Auth state management
        ├── components/
        │   ├── Layout/         # Sidebar, Header, Layout wrapper
        │   ├── common/         # Modals, Toast, Spinner, Guards
        │   └── Receipt/        # Printable thermal receipt
        └── pages/
            ├── Login/
            ├── Dashboard/
            ├── Menu/
            ├── Tables/
            ├── Orders/
            ├── Kitchen/
            ├── Cashier/
            ├── Users/
            └── Reports/
```

## How to Run in Visual Studio Code (VS Code)

### Option 1: Quick One-Click in VS Code (Universal)
Open VS Code terminal (`Ctrl+\`` or `Cmd+\``) and run:
```bash
python3 run.py
```
Or simply double-click `start.sh` or right-click `frontend/index.html` -> **Open with Live Server**.

### Option 2: Fullstack Node.js + MySQL Mode
```bash
# 1. Install dependencies
npm run install:all

# 2. Seed database
npm run seed

# 3. Start both frontend and backend
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## Unit & Integration Testing

RestroPOS includes an automated test suite verifying all 17 unit and integration test cases across RBAC security, state transitions, financial calculations, and end-to-end workflows.

Run tests via terminal:
```bash
python3 tests/test_suite.py
```
Or in VS Code:
- Go to **Terminal** -> **Run Task** -> **Run Automated Test Suite (Unit & Integration)**.

## Demo Accounts

| Role    | Email                 | Password    | Permissions & Scope                 |
|---------|-----------------------|-------------|-------------------------------------|
| Admin   | admin@restropos.com   | admin123    | Complete access over all attributes |
| Manager | manager@restropos.com | password123 | Floor, orders, menu prices, reports |
| Waiter  | waiter@restropos.com  | password123 | POS orders & floor tables           |
| Chef    | chef@restropos.com    | password123 | Kitchen Display System (KDS) prep   |
| Cashier | cashier@restropos.com | password123 | Cashier checkout & billing          |

