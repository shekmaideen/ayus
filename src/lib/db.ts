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
