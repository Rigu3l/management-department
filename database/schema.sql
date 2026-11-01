-- Hotel Management System — Management Department module
-- database/schema.sql — the single schema file (no migrations folder).
--
-- These are the SHARED tables of the whole Hotel Management System: the
-- other department modules (Front Office, Food & Beverage, Kitchen,
-- Accounts & Finance, Security) write into the same database, and the
-- Management module reads across all of them. Import order on a fresh
-- XAMPP install: schema.sql, then seed-data.sql for demo records.
--
-- MySQL / MariaDB, utf8mb4. All timestamps are Philippine time (UTC+8):
-- the PHP bootstrap sets the session time zone to +08:00.

CREATE DATABASE IF NOT EXISTS hotel_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_management;

SET time_zone = '+08:00';

-- ---------------------------------------------------------------------------
-- Reference / shared tables (owned by the whole system, read by Management)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_id INT UNSIGNED NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  position      VARCHAR(80)  NOT NULL,
  status        ENUM('active','on_leave','inactive') NOT NULL DEFAULT 'active',
  hire_date     DATE NULL,
  CONSTRAINT fk_emp_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

-- Accounts are created and authenticated by the Front Office / system login
-- module; the Management module ships without its own login page. The table
-- is part of the shared schema so reports can name who generated them.
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id   INT UNSIGNED NULL,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('general_manager','department_head','admin','staff') NOT NULL DEFAULT 'staff',
  CONSTRAINT fk_user_emp FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL UNIQUE,
  room_type   VARCHAR(40) NOT NULL,               -- Standard, Deluxe, Suite, Family
  floor       INT NOT NULL DEFAULT 1,
  status      ENUM('available','occupied','reserved','cleaning','maintenance') NOT NULL DEFAULT 'available',
  rate        DECIMAL(10,2) NOT NULL DEFAULT 0    -- nightly rate (PHP)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservations (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guest_name   VARCHAR(120) NOT NULL,
  room_id      INT UNSIGNED NULL,
  check_in     DATE NOT NULL,
  check_out    DATE NOT NULL,
  status       ENUM('confirmed','checked_in','checked_out','cancelled','no_show') NOT NULL DEFAULT 'confirmed',
  guests       INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  source       VARCHAR(40) NOT NULL DEFAULT 'Walk-in',  -- Walk-in, Phone, Online, Travel agency
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_res_room FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB;

-- One row per recorded income/expense line (Accounts & Finance writes these;
-- Management summarizes them). type separates revenue from expenses.
CREATE TABLE IF NOT EXISTS financial_transactions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_id INT UNSIGNED NULL,
  type          ENUM('revenue','expense') NOT NULL,
  category      VARCHAR(60) NOT NULL,   -- Rooms, Food & Beverage, Events, Laundry, Salaries, Utilities, Supplies, Maintenance, Marketing, Other
  description   VARCHAR(255) NULL,
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  txn_date      DATE NOT NULL,
  reference     VARCHAR(60) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_txn_dept FOREIGN KEY (department_id) REFERENCES departments(id),
  INDEX idx_txn_date (txn_date),
  INDEX idx_txn_type_cat (type, category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS guest_feedback (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  guest_name    VARCHAR(120) NOT NULL,
  reservation_id INT UNSIGNED NULL,
  rating        TINYINT NOT NULL,               -- 1..5
  category      VARCHAR(40) NOT NULL DEFAULT 'Overall', -- Overall, Cleanliness, Service, Food, Value
  comment       VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fb_res FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  CONSTRAINT chk_fb_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaints_incidents (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(160) NOT NULL,
  type          ENUM('complaint','incident') NOT NULL DEFAULT 'complaint',
  department_id INT UNSIGNED NULL,
  severity      ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  status        ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  reported_by   VARCHAR(120) NULL,
  description   VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at   DATETIME NULL,
  CONSTRAINT fk_ci_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  category      VARCHAR(60)  NOT NULL,          -- Linens, Toiletries, F&B Stock, Cleaning, Kitchen, Office
  department_id INT UNSIGNED NULL,
  quantity      INT NOT NULL DEFAULT 0,
  unit          VARCHAR(20) NOT NULL DEFAULT 'pcs',
  reorder_level INT NOT NULL DEFAULT 0,
  unit_cost     DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id      INT UNSIGNED NULL,
  department_id INT UNSIGNED NULL,
  title        VARCHAR(160) NOT NULL,
  priority     ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status       ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  assigned_to  INT UNSIGNED NULL,               -- employees.id
  reported_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_mr_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT fk_mr_dept FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_mr_emp  FOREIGN KEY (assigned_to) REFERENCES employees(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id       INT UNSIGNED NULL,
  assigned_to   INT UNSIGNED NULL,              -- employees.id
  task_type     VARCHAR(60) NOT NULL DEFAULT 'Room cleaning', -- Room cleaning, Deep cleaning, Laundry, Turndown, Inspection
  status        ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  completed_at  DATETIME NULL,
  CONSTRAINT fk_hk_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT fk_hk_emp  FOREIGN KEY (assigned_to) REFERENCES employees(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Management-owned tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS budgets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_id INT UNSIGNED NULL,              -- NULL = whole hotel
  category      VARCHAR(60) NOT NULL,
  period_month  DATE NOT NULL,                  -- first day of the budget month
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes         VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bud_dept FOREIGN KEY (department_id) REFERENCES departments(id),
  UNIQUE KEY uq_budget (department_id, category, period_month)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kpi_targets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,          -- e.g. Occupancy rate, Guest satisfaction
  department_id INT UNSIGNED NULL,
  target_value  DECIMAL(10,2) NOT NULL,
  unit          VARCHAR(20) NOT NULL DEFAULT '%', -- %, rating, hours, count, PHP
  period        ENUM('daily','weekly','monthly','yearly') NOT NULL DEFAULT 'monthly',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_kpi_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS decisions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NULL,
  decided_by    VARCHAR(120) NULL,
  assigned_to   VARCHAR(120) NULL,              -- person responsible (name kept free-form: assignees can be dept heads outside employees)
  department_id INT UNSIGNED NULL,
  deadline      DATE NULL,
  status        ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  DATETIME NULL,
  approved      TINYINT(1) NOT NULL DEFAULT 0, -- management approval, set only once the department flags the decision completed
  CONSTRAINT fk_dec_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alerts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  message     VARCHAR(500) NULL,
  severity    ENUM('info','warning','critical') NOT NULL DEFAULT 'info',
  source      VARCHAR(60)  NOT NULL DEFAULT 'System', -- Occupancy, Inventory, Maintenance, Housekeeping, Finance, Guest feedback, System
  status      ENUM('unread','read','resolved') NOT NULL DEFAULT 'unread',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL
) ENGINE=InnoDB;

-- Log of reports generated from the module (who exported what, when).
CREATE TABLE IF NOT EXISTS reports (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  type         VARCHAR(40)  NOT NULL,
  generated_by VARCHAR(120) NULL,
  parameters   JSON NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Reference seed: departments + rooms (needed by every other table)
-- ---------------------------------------------------------------------------

INSERT INTO departments (id, name, code, description) VALUES
  (1, 'Management',          'MGT', 'Hotel management and administration'),
  (2, 'Front Office',        'FO',  'Reservations, check-in and check-out'),
  (3, 'Housekeeping',        'HK',  'Room cleaning and upkeep'),
  (4, 'Food & Beverage',     'FB',  'Restaurant and bar services'),
  (5, 'Kitchen & Food Production', 'KIT', 'Food preparation'),
  (6, 'Accounts & Finance',  'FIN', 'Billing, payroll and financial records'),
  (7, 'Maintenance',         'MNT', 'Repairs and preventive maintenance'),
  (8, 'Security',            'SEC', 'Guest and property safety')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO rooms (room_number, room_type, floor, status, rate) VALUES
  ('101','Standard',1,'occupied',   2500), ('102','Standard',1,'occupied',   2500),
  ('103','Standard',1,'available',  2500), ('104','Standard',1,'cleaning',   2500),
  ('105','Standard',1,'occupied',   2500), ('106','Standard',1,'available',  2500),
  ('107','Standard',1,'reserved',   2500), ('108','Standard',1,'occupied',   2500),
  ('201','Deluxe',  2,'occupied',   4200), ('202','Deluxe',  2,'occupied',   4200),
  ('203','Deluxe',  2,'available',  4200), ('204','Deluxe',  2,'maintenance',4200),
  ('205','Deluxe',  2,'occupied',   4200), ('206','Deluxe',  2,'occupied',   4200),
  ('207','Deluxe',  2,'reserved',   4200), ('208','Deluxe',  2,'cleaning',   4200),
  ('301','Family',  3,'occupied',   5800), ('302','Family',  3,'available',  5800),
  ('303','Family',  3,'occupied',   5800), ('304','Family',  3,'reserved',   5800),
  ('401','Suite',   4,'occupied',   9500), ('402','Suite',   4,'available',  9500),
  ('403','Suite',   4,'occupied',   9500), ('404','Suite',   4,'maintenance',9500)
ON DUPLICATE KEY UPDATE room_type = VALUES(room_type);
