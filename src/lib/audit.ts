/**
 * src/lib/audit.ts
 * Audit logging helper for clinical, staff, and financial compliance.
 */
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/schema";

export interface AuditLogEntry {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown;
}

/**
 * Record an audit log entry.
 * Can run inside an ongoing transaction or on the default db instance.
 */
export async function logAudit(entry: AuditLogEntry, tx?: any): Promise<void> {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const runner = tx ?? db;
  const detailsStr =
    typeof entry.details === "object" && entry.details !== null
      ? JSON.stringify(entry.details)
      : entry.details !== undefined && entry.details !== null
      ? String(entry.details)
      : null;

  try {
    await runner.insert(auditLogs).values({
      userId: entry.userId ?? null,
      userName: entry.userName ?? "System",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: detailsStr,
      createdAt: now,
    });
  } catch (err) {
    // Audit logging should never bring down the primary transaction if it fails
    console.error("Audit log error:", err);
  }
}
