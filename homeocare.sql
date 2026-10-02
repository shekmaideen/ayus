-- ============================================================
--  HomeoCare Clinic Manager — MySQL 8.4 Schema
--  Run this file once to create all tables.
--    mysql -u root < homeocare.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS homeocare
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE homeocare;

-- ─── Users ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  email      VARCHAR(255) NOT NULL UNIQUE,
  username   VARCHAR(50)  UNIQUE,
  full_name  VARCHAR(100) NOT NULL DEFAULT '',
  password   VARCHAR(255) NOT NULL,
  role       ENUM('doctor', 'receptionist') NOT NULL DEFAULT 'receptionist',
  active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Clinic Settings (singleton row, id always = 1) ─────────────
CREATE TABLE IF NOT EXISTS clinic_settings (
  id                  INT           PRIMARY KEY DEFAULT 1,
  consultation_fee    DECIMAL(10,2) NOT NULL DEFAULT 400,
  follow_up_fee       DECIMAL(10,2) NOT NULL DEFAULT 250,
  registration_fee    DECIMAL(10,2) NOT NULL DEFAULT 100,
  low_stock_threshold INT           NOT NULL DEFAULT 10,
  clinic_name         VARCHAR(200)  NOT NULL DEFAULT 'HomeoCare Clinic',
  address             VARCHAR(500)  NOT NULL DEFAULT '',
  phone               VARCHAR(20)   NOT NULL DEFAULT '',
  doctor_name         VARCHAR(100)  NOT NULL DEFAULT '',
  logo_data_url       LONGTEXT,
  CONSTRAINT chk_singleton CHECK (id = 1)
);
INSERT IGNORE INTO clinic_settings (id) VALUES (1);

-- ─── Patients ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  reg_no        VARCHAR(20)  NOT NULL UNIQUE,
  name          VARCHAR(150) NOT NULL,
  age           INT          NOT NULL DEFAULT 0,
  gender        VARCHAR(20)  NOT NULL DEFAULT 'Other',
  phone         VARCHAR(20)  NOT NULL DEFAULT '',
  email         VARCHAR(255) NOT NULL DEFAULT '',
  address       VARCHAR(500) NOT NULL DEFAULT '',
  blood_group   VARCHAR(10)  NOT NULL DEFAULT '',
  allergies     JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  occupation    VARCHAR(100) NOT NULL DEFAULT '',
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  registered_on DATE         NOT NULL DEFAULT (CURRENT_DATE),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Case Histories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_histories (
  patient_id CHAR(36) PRIMARY KEY,
  data       JSON     NOT NULL DEFAULT (JSON_OBJECT()),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ─── Visits ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
  id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  patient_id CHAR(36)     NOT NULL,
  date       DATE         NOT NULL DEFAULT (CURRENT_DATE),
  type       VARCHAR(30)  NOT NULL DEFAULT 'New',
  complaint  VARCHAR(500) NOT NULL DEFAULT '',
  notes      VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ─── Medicines ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  id         CHAR(36)      PRIMARY KEY DEFAULT (UUID()),
  name       VARCHAR(200)  NOT NULL,
  potencies  JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  stock      INT           NOT NULL DEFAULT 0,
  price      DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Prescriptions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id             CHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  patient_id     CHAR(36)  NOT NULL,
  visit_id       CHAR(36),
  date           DATE      NOT NULL DEFAULT (CURRENT_DATE),
  items          JSON      NOT NULL DEFAULT (JSON_ARRAY()),
  follow_up_date DATE,
  is_refill      BOOLEAN   NOT NULL DEFAULT FALSE,
  notes          VARCHAR(1000) NOT NULL DEFAULT '',
  created_at     DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (visit_id)   REFERENCES visits(id)   ON DELETE SET NULL
);

-- ─── Bills ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id                CHAR(36)      PRIMARY KEY DEFAULT (UUID()),
  invoice_no        VARCHAR(30)   NOT NULL UNIQUE,
  patient_id        CHAR(36)      NOT NULL,
  prescription_id   CHAR(36),
  date              DATE          NOT NULL DEFAULT (CURRENT_DATE),
  items             JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  status            VARCHAR(20)   NOT NULL DEFAULT 'Pending',
  payment_mode      VARCHAR(20),
  amount_received   DECIMAL(10,2) NOT NULL DEFAULT 0,
  ready_for_payment BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id)      REFERENCES patients(id)      ON DELETE CASCADE,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL
);

-- ─── Follow-ups ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_ups (
  id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  patient_id CHAR(36)     NOT NULL,
  due_date   DATE         NOT NULL,
  reason     VARCHAR(500) NOT NULL DEFAULT '',
  status     VARCHAR(20)  NOT NULL DEFAULT 'Pending',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- ─── Appointments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  patient_id CHAR(36)     NOT NULL,
  doctor_id  CHAR(36),
  date       DATE         NOT NULL,
  time       VARCHAR(20)  NOT NULL DEFAULT '10:00 AM',
  status     VARCHAR(20)  NOT NULL DEFAULT 'Scheduled',
  notes      VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES users(id)    ON DELETE SET NULL
);

-- ─── Indexes for Performance ──────────────────────────────────────
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_name  ON patients(name);
CREATE INDEX idx_visits_date    ON visits(date);
CREATE INDEX idx_appts_date     ON appointments(date);

-- ─── Done ────────────────────────────────────────────────────────
SELECT 'HomeoCare schema created successfully.' AS status;

