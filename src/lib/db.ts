/**
 * src/lib/db.ts
 * Drizzle ORM connected to local MySQL via mysql2 pool.
 * Import `db` wherever you need to run queries.
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/lib/schema";

// Global singleton pool — preserved on globalThis across Vite HMR module reloads
const globalForDb = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

function getPool(): mysql.Pool {
  if (!globalForDb.mysqlPool) {
    globalForDb.mysqlPool = mysql.createPool({
      host: process.env["MYSQL_HOST"] ?? "localhost",
      port: Number(process.env["MYSQL_PORT"] ?? 3306),
      user: process.env["MYSQL_USER"] ?? "root",
      password: process.env["MYSQL_PASSWORD"] ?? "",
      database: process.env["MYSQL_DATABASE"] ?? "ayus",
      waitForConnections: true,
      connectionLimit: 20,
      maxIdle: 10,
      idleTimeout: 30000,
      queueLimit: 0,
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // Return dates as strings (YYYY-MM-DD) so they match what the app expects
      dateStrings: true,
    });
  }
  return globalForDb.mysqlPool;
}

export const db = drizzle(getPool(), { schema, mode: "default" });

export type DB = typeof db;
