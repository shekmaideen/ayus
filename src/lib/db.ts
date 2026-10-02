/**
 * src/lib/db.ts
 * Drizzle ORM connected to local MySQL via mysql2 pool.
 * Import `db` wherever you need to run queries.
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/lib/schema";

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined;
}

export function getPool(): mysql.Pool {
  if (!globalThis._mysqlPool) {
    globalThis._mysqlPool = mysql.createPool({
      host: process.env["MYSQL_HOST"] ?? "localhost",
      port: Number(process.env["MYSQL_PORT"] ?? 3306),
      user: process.env["MYSQL_USER"] ?? "root",
      password: process.env["MYSQL_PASSWORD"] ?? "",
      database: process.env["MYSQL_DATABASE"] ?? "homeocare",
      waitForConnections: true,
      connectionLimit: 20,
      maxIdle: 10,
      idleTimeout: 10000, // Release idle connections after 10s
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      dateStrings: true,
    });
  }
  return globalThis._mysqlPool;
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
      await pool.query("ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL AFTER email");
    } catch {
      try {
        await pool.query("ALTER TABLE users ADD username VARCHAR(50) NULL");
      } catch {
        // Column already exists or table issue
      }
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


