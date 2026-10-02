/**
 * src/lib/backup.functions.ts
 * Server functions for local MySQL database backup and restore.
 * Only accessible to DOCTOR_ADMIN users.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { requireAuth, assertDoctor } from "@/lib/auth-middleware";

const execAsync = promisify(exec);

const BACKUP_DIR = path.resolve(process.cwd(), "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/** Generate safe database backup using mysqldump */
export const createDatabaseBackup = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertDoctor(context.role);
    ensureBackupDir();

    const host = process.env["MYSQL_HOST"] || "127.0.0.1";
    const port = process.env["MYSQL_PORT"] || "3306";
    const user = process.env["MYSQL_USER"] || "root";
    const password = process.env["MYSQL_PASSWORD"] || "";
    const dbName = process.env["MYSQL_DATABASE"] || "homeocare";

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup_${dbName}_${timestamp}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Build mysqldump command
    const passFlag = password ? `-p"${password}"` : "";
    const cmd = `mysqldump -h ${host} -P ${port} -u ${user} ${passFlag} ${dbName} > "${filePath}"`;

    try {
      await execAsync(cmd, { shell: "powershell.exe" });
      const stats = fs.statSync(filePath);

      return {
        ok: true,
        filename,
        sizeBytes: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
        createdAt: stats.birthtime.toISOString(),
      };
    } catch (err: unknown) {
      console.error("Database backup error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Backup failed: ${msg}`);
    }
  });

/** List all existing backup files */
export const listDatabaseBackups = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertDoctor(context.role);
    ensureBackupDir();

    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".sql"));

    const list = files.map((filename) => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        sizeBytes: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
        createdAt: stats.birthtime.toISOString(),
      };
    });

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  });

/** Restore database from a backup file */
export const restoreDatabaseBackup = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({ filename: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    ensureBackupDir();

    // Prevent path traversal
    const safeFilename = path.basename(data.filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new Error("Backup file not found.");
    }

    const host = process.env["MYSQL_HOST"] || "127.0.0.1";
    const port = process.env["MYSQL_PORT"] || "3306";
    const user = process.env["MYSQL_USER"] || "root";
    const password = process.env["MYSQL_PASSWORD"] || "";
    const dbName = process.env["MYSQL_DATABASE"] || "homeocare";

    const passFlag = password ? `-p"${password}"` : "";
    const cmd = `mysql -h ${host} -P ${port} -u ${user} ${passFlag} ${dbName} < "${filePath}"`;

    try {
      await execAsync(cmd, { shell: "powershell.exe" });
      return { ok: true, restoredFile: safeFilename };
    } catch (err: unknown) {
      console.error("Database restore error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Restore failed: ${msg}`);
    }
  });
