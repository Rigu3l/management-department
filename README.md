# Management Department — Hotel Management System

The **Management Department module** of the Hotel Management System: a web-based
application that serves as the command center of the hotel. Managers open one
dashboard and see the hotel's live state — occupancy, reservations, revenue,
expenses, and outstanding operational tasks — generate reports across every
department, track budgets and KPI targets, record management decisions with
responsible persons and deadlines, and receive operational alerts.

This repository contains **only the Management Department module**. It has
**no login page of its own** — accounts and authentication belong to the
system's login module. The module reads from the **one shared MySQL database**
(`hotel_management`) that all department modules of the Hotel Management
System write to, so every figure it shows is current.

## Tech stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4 + Chart.js, jsPDF (exports)
- **Backend:** PHP 8 (PDO) JSON API
- **Database:** MySQL / MariaDB (XAMPP)

## The 25 features

| # | Feature | Where |
|---|---------|-------|
| 1 | Executive dashboard | Dashboard |
| 2 | Hotel occupancy monitoring | Dashboard + Reports |
| 3 | Revenue performance monitoring | Dashboard + Reports |
| 4 | Expense monitoring | Dashboard + Reports |
| 5 | Reservation analytics | Reports |
| 6 | Room availability reports | Reports |
| 7 | Department performance reports | Reports |
| 8 | Employee performance monitoring | Reports |
| 9 | Key performance indicators (KPIs) | Dashboard + Reports + Budgets & Targets |
| 10 | Average Daily Rate (ADR) reports | Reports |
| 11 | Revenue per Available Room (RevPAR) reports | Reports |
| 12 | Guest satisfaction analytics | Reports |
| 13 | Complaint and incident summaries | Reports |
| 14 | Inventory and stock reports | Reports |
| 15 | Maintenance performance reports | Reports |
| 16 | Housekeeping performance reports | Reports |
| 17 | Food and Beverage sales reports | Reports |
| 18 | Financial summaries | Reports |
| 19 | Daily, weekly, monthly, and yearly reports | Period presets in the filter bar |
| 20 | Date range and department filters | Filter bar on Dashboard / Reports / Decisions |
| 21 | PDF and CSV report exports | Reports (export buttons) |
| 22 | Budget and target management | Budgets & Targets |
| 23 | Management decision tracking | Decision Tracking |
| 24 | Operational alerts and notifications | Operational Alerts (+ dashboard) |
| 25 | Historical performance comparisons | Reports → Historical Comparison |

## Project structure

```
management-department/
├── database/
│   ├── schema.sql        — the shared hotel database (16 tables) + departments/rooms seed
│   └── seed-data.sql     — demo records (CURDATE()-relative: always the last ~90 days)
├── backend/
│   ├── config/           — bootstrap.php (periods, shared metrics), database.php (PDO)
│   └── api/              — dashboard.php, reports.php, budgets.php, decisions.php, alerts.php
└── frontend/             — Vite + React app (src/pages, src/components, src/lib)
```

## Setup on XAMPP (Windows)

1. **Clone** this repository, e.g. into `C:\xampp\htdocs\management-department`.
2. **Start** Apache and MySQL in the XAMPP control panel.
3. **Create the database:** open phpMyAdmin → Import → run `database/schema.sql`,
   then import `database/seed-data.sql` for demo records.
   (Database name: `hotel_management`. Default connection is `root` with no
   password; override with the `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
   `DB_PASS` environment variables if yours differ.)
4. **Build the frontend:**
   ```
   cd frontend
   npm install
   npm run build
   ```
5. **Deploy:** copy the contents of `frontend/dist/` into your web folder
   (e.g. `C:\xampp\htdocs\management\`), and copy `backend/api/` and
   `backend/config/` into the **same** folder, so `api/` sits beside
   `index.html`. The app derives its API path from the page URL, so it works
   from any subfolder without rebuilding.
6. Open `http://localhost/management/` — the Executive Dashboard loads
   directly (no login in this module).

## Development mode

```
cd frontend && npm run dev          # Vite dev server (proxies /api)
php -S localhost:8000 -t backend    # in a second terminal, from the repo root
```

## Demo mode

If the PHP API is unreachable (for example, opening the built frontend
without XAMPP running), the app automatically runs on built-in demo data
generated relative to today, so every page, report, and form can be
previewed and demonstrated without a database. Start XAMPP and reload to
switch to the live database.

## Notes for the other department modules

- The tables in `database/schema.sql` are the **shared** schema agreed by
  all modules (users, departments, employees, rooms, reservations,
  financial_transactions, guest_feedback, complaints_incidents,
  inventory_items, maintenance_requests, housekeeping_tasks, plus the
  Management-owned budgets, kpi_targets, decisions, alerts, reports).
- Accounts are created/authenticated by the login module (`users` table);
  this module never handles passwords.
- All dates/times are Philippine time (Asia/Manila, UTC+8): PHP sets the
  timezone in `bootstrap.php` and the MySQL session in `database.php`.
