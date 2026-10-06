/**
 * src/lib/auto-backup.ts
 * Automated daily database backup service.
 * Keeps rolling daily backups in the backups/ folder with automatic 30-day retention.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import {
  patients,
  caseHistories,
  visits,
  medicines,
  prescriptions,
  bills,
  followUps,
  templates,
  clinicSettings,
  users,
  chiefComplaints,
} from "@/lib/schema";
import { logAudit } from "@/lib/audit";

const BACKUP_DIR = path.resolve(process.cwd(), "backups");
const RETENTION_DAYS = 30;

let lastRunDate = "";

/**
 * Ensures a backup is created once per calendar day.
 * Safe to call on every clinic load — checks if today's backup already exists.
 */
export async function ensureDailyBackup(): Promise<{ ran: boolean; file?: string }> {
  const today = new Date().toISOString().slice(0, 10);
  if (lastRunDate === today) {
    return { ran: false };
  }

  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const filename = `ayus-auto-${today}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Check if today's backup file already exists
    try {
      await fs.access(filepath);
      lastRunDate = today;
      return { ran: false, file: filename };
    } catch {
      // File does not exist, proceed to create
    }

    // Export all current data
    const [pats, chs, vis, meds, pres, bls, fus, tpls, sets, usrs, ccs] = await Promise.all([
      db.select().from(patients),
      db.select().from(caseHistories),
      db.select().from(visits),
      db.select().from(medicines),
      db.select().from(prescriptions),
      db.select().from(bills),
      db.select().from(followUps),
      db.select().from(templates),
      db.select().from(clinicSettings),
      db.select({
        id: users.id,
        email: users.email,
        username: users.username,
        fullName: users.fullName,
        password: users.password,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
      }).from(users),
      db.select().from(chiefComplaints),
    ]);

    const backupPayload = {
      version: 1,
      type: "daily_auto_backup",
      exportedAt: new Date().toISOString(),
      counts: {
        patients: pats.length,
        caseHistories: chs.length,
        visits: vis.length,
        chiefComplaints: ccs.length,
        medicines: meds.length,
        prescriptions: pres.length,
        bills: bls.length,
        followUps: fus.length,
        templates: tpls.length,
        users: usrs.length,
      },
      data: {
        clinicSettings: sets,
        users: usrs,
        patients: pats,
        caseHistories: chs,
        visits: vis,
        chiefComplaints: ccs,
        medicines: meds,
        prescriptions: pres,
        bills: bls,
        followUps: fus,
        templates: tpls,
      },
    };

    await fs.writeFile(filepath, JSON.stringify(backupPayload, null, 2), "utf8");
    lastRunDate = today;

    // Prune backups older than RETENTION_DAYS
    await pruneOldBackups();

    // Record audit entry
    await logAudit({
      action: "AUTO_BACKUP",
      entityType: "system",
      entityId: filename,
      details: {
        file: filename,
        records: backupPayload.counts,
      },
    });

    console.log(`[AutoBackup] Successfully created daily backup: ${filename}`);
    return { ran: true, file: filename };
  } catch (err) {
    console.error("[AutoBackup] Daily backup failed:", err);
    return { ran: false };
  }
}

/**
 * Removes auto-backups older than RETENTION_DAYS
 */
async function pruneOldBackups(): Promise<void> {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const autoFiles = files.filter(
      (f) => f.startsWith("ayus-auto-") && f.endsWith(".json"),
    );

    if (autoFiles.length <= RETENTION_DAYS) return;

    // Sort ascending by name (since date is in ISO format YYYY-MM-DD)
    autoFiles.sort();

    const toRemove = autoFiles.slice(0, autoFiles.length - RETENTION_DAYS);
    for (const f of toRemove) {
      await fs.unlink(path.join(BACKUP_DIR, f)).catch(() => {});
    }
  } catch {
    // Ignore pruning errors
  }
}
