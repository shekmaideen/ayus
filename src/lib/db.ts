/**
 * src/lib/db.ts
 * Drizzle ORM connected to local MySQL via mysql2 pool.
 * Import `db` wherever you need to run queries.
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/lib/schema";

// Singleton pool — reused across all server function calls
let _pool: mysql.Pool | undefined;

function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host: process.env["MYSQL_HOST"] ?? "localhost",
      port: Number(process.env["MYSQL_PORT"] ?? 3306),
      user: process.env["MYSQL_USER"] ?? "root",
      password: process.env["MYSQL_PASSWORD"] ?? "",
      database: process.env["MYSQL_DATABASE"] ?? "homeocare",
      waitForConnections: true,
      connectionLimit: 10,
      // Return dates as strings (YYYY-MM-DD) so they match what the app expects
      dateStrings: true,
    });
  }
  return _pool;
}

export const db = drizzle(getPool(), { schema, mode: "default" });

export type DB = typeof db;

let _migrated = false;

/** Auto-migrate missing columns/tables on existing MySQL databases */
export async function ensureDatabaseColumns() {
  if (_migrated) return;
  try {
    const pool = getPool();
    // 1. Add missing username column to existing users table
    try {
      await pool.query("ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER email");
    } catch {
      // Column already exists or error ignored
    }

    // 2. Ensure appointments table exists
    try {
      await pool.query(`
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
        )
      `);
    } catch {
      // Table already exists or error ignored
    }
    _migrated = true;
  } catch (err) {
    console.warn("Schema self-healing check skipped:", err);
  }
}

