/**
 * src/lib/backup.functions.ts
 * Server functions for Database Backup, Restore, and Patient CSV Import.
 * All operations require doctor-level authentication.
 */
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
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
  chiefComplaints,
} from "@/lib/schema";
import { requireAuth, assertDoctor } from "@/lib/auth-middleware";
import { logAudit } from "@/lib/audit";
import { normalizeMedicinePotency } from "@/data/types";
import { uid } from "@/lib/utils";

const nowStr = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const todayStr = () => new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────
// EXPORT — full JSON backup of all clinic data
// ─────────────────────────────────────────────────────────────────
export const exportBackup = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertDoctor(context.role);

    const [
      pats, chs, vis, meds, pres, bls, fus, tpls, settings, ccs,
    ] = await Promise.all([
      db.select().from(patients),
      db.select().from(caseHistories),
      db.select().from(visits),
      db.select().from(medicines),
      db.select().from(prescriptions),
      db.select().from(bills),
      db.select().from(followUps),
      db.select().from(templates),
      db.select().from(clinicSettings),
      db.select().from(chiefComplaints),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      clinic: settings[0] ?? null,
      patients: pats,
      caseHistories: chs,
      visits: vis,
      chiefComplaints: ccs,
      medicines: meds,
      prescriptions: pres,
      bills: bls,
      followUps: fus,
      templates: tpls,
    };
  });

// ─────────────────────────────────────────────────────────────────
// IMPORT / RESTORE — full JSON restore from backup
// ─────────────────────────────────────────────────────────────────
export const importBackup = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) =>
    z.object({
      backup: z.object({
        version: z.number(),
        patients: z.array(z.any()).optional(),
        caseHistories: z.array(z.any()).optional(),
        visits: z.array(z.any()).optional(),
        chiefComplaints: z.array(z.any()).optional(),
        medicines: z.array(z.any()).optional(),
        prescriptions: z.array(z.any()).optional(),
        bills: z.array(z.any()).optional(),
        followUps: z.array(z.any()).optional(),
        templates: z.array(z.any()).optional(),
        clinic: z.any().optional(),
      }),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    const b = data.backup;

    // Clear all tables first (order matters for FK constraints)
    await db.delete(bills);
    await db.delete(prescriptions);
    await db.delete(followUps);
    await db.delete(chiefComplaints);
    await db.delete(visits);
    await db.delete(caseHistories);
    await db.delete(templates);
    await db.delete(medicines);
    await db.delete(patients);

    // Re-insert from backup
    if (b.patients?.length)        await db.insert(patients).values(b.patients);
    if (b.caseHistories?.length)   await db.insert(caseHistories).values(b.caseHistories);
    if (b.visits?.length)          await db.insert(visits).values(b.visits);
    if (b.chiefComplaints?.length) await db.insert(chiefComplaints).values(b.chiefComplaints);
    if (b.medicines?.length)       await db.insert(medicines).values(b.medicines);
    if (b.prescriptions?.length)   await db.insert(prescriptions).values(b.prescriptions);
    if (b.bills?.length)           await db.insert(bills).values(b.bills);
    if (b.followUps?.length)       await db.insert(followUps).values(b.followUps);
    if (b.templates?.length)       await db.insert(templates).values(b.templates);

    // Backward compatibility: migrate legacy chiefComplaint from caseHistories if not already present
    if (b.caseHistories?.length && (!b.chiefComplaints || b.chiefComplaints.length === 0)) {
      for (const ch of b.caseHistories) {
        const legacyComplaint = ch?.data?.chiefComplaint;
        if (legacyComplaint && typeof legacyComplaint === "string" && legacyComplaint.trim()) {
          const createdAt = ch.updatedAt || ch.updated_at || nowStr();
          await db.insert(chiefComplaints).values({
            id: uid(),
            patientId: ch.patientId || ch.patient_id,
            visitId: null,
            complaint: legacyComplaint.trim(),
            createdAt,
          }).catch(() => {});
        }
      }
    }

    await logAudit({
      userId: context.userId,
      userName: "Doctor",
      action: "RESTORE_DATABASE_BACKUP",
      entityType: "database",
      details: {
        patients: b.patients?.length ?? 0,
        prescriptions: b.prescriptions?.length ?? 0,
        bills: b.bills?.length ?? 0,
      },
    });

    return {
      ok: true,
      counts: {
        patients: b.patients?.length ?? 0,
        visits: b.visits?.length ?? 0,
        medicines: b.medicines?.length ?? 0,
        prescriptions: b.prescriptions?.length ?? 0,
        bills: b.bills?.length ?? 0,
      },
    };
  });

// ─────────────────────────────────────────────────────────────────
// PATIENT CSV IMPORT
// Accepts an array of patient rows parsed on the client from CSV/Excel
// ─────────────────────────────────────────────────────────────────
const patientRowSchema = z.object({
  name:        z.string().min(1),
  age:         z.coerce.number().min(0).max(150).default(0),
  gender:      z.enum(["Male", "Female", "Other"]).default("Other"),
  phone:       z.string().default(""),
  email:       z.string().default(""),
  address:     z.string().default(""),
  bloodGroup:  z.string().default(""),
  allergies:   z.string().default(""),   // comma-separated
  occupation:  z.string().default(""),
  registeredOn: z.string().optional(),
});

export const importPatientsCSV = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) =>
    z.object({
      rows: z.array(z.any()),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);

    // Determine current max reg number
    const existingPats = await db.select({ regNo: patients.regNo }).from(patients);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const nums = existingPats.map((p) => {
      const parts = p.regNo.split("-");
      const last = parts[parts.length - 1];
      return parseInt(last ?? "0", 10);
    }).filter((n) => !isNaN(n));

    let nextNum = Math.max(0, ...nums) + 1;

    const inserted: string[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      try {
        const parsed = patientRowSchema.parse(data.rows[i]);
        const id = uid();
        const regNo = `${year}-AHH-${month}-${String(nextNum).padStart(4, "0")}`;
        nextNum++;

        await db.insert(patients).values({
          id,
          regNo,
          name: parsed.name,
          age: parsed.age,
          gender: parsed.gender,
          phone: parsed.phone,
          email: parsed.email,
          address: parsed.address,
          bloodGroup: parsed.bloodGroup,
          allergies: parsed.allergies
            ? parsed.allergies.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          occupation: parsed.occupation,
          active: true,
          registeredOn: parsed.registeredOn ?? todayStr(),
          createdAt: nowStr(),
        });

        inserted.push(id);
      } catch (err) {
        errors.push({ row: i + 1, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    if (inserted.length > 0) {
      await logAudit({
        userId: context.userId,
        userName: "Doctor",
        action: "IMPORT_PATIENTS_CSV",
        entityType: "patient",
        details: { count: inserted.length, errorCount: errors.length },
      });
    }

    return { inserted: inserted.length, errors };
  });

// ─────────────────────────────────────────────────────────────────
// MEDICATIONS EXCEL / CSV IMPORT
// Accepts an array of medicine rows parsed on the client from Excel / CSV
// ─────────────────────────────────────────────────────────────────
const medicineImportRowSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required"),
  formType: z.string().trim().default("Bottle"),
  potency: z.string().trim().default(""),
  stock: z.coerce.number().min(0).default(0),
  price: z.coerce.number().min(0).default(0),
});

export const importMedicinesExcel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) =>
    z.object({
      rows: z.array(z.any()),
      updateExisting: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);

    const existingList = await db.select().from(medicines);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      try {
        const row = medicineImportRowSchema.parse(data.rows[i]);
        const cleanedPotency = normalizeMedicinePotency(row.potency);
        const normName = row.name.toLowerCase();
        const normForm = (row.formType || "Bottle").toLowerCase();
        const normPotency = cleanedPotency.toLowerCase();

        const match = existingList.find(
          (m) =>
            m.name.toLowerCase() === normName &&
            (m.formType || "Bottle").toLowerCase() === normForm &&
            (m.potency || "").trim().toLowerCase() === normPotency,
        );

        if (match) {
          if (data.updateExisting) {
            const newStock = Math.max(0, match.stock + Math.round(row.stock));
            const newPrice = row.price > 0 ? String(row.price) : match.price;
            await db
              .update(medicines)
              .set({
                stock: newStock,
                price: newPrice,
              })
              .where(eq(medicines.id, match.id));
            match.stock = newStock;
            match.price = newPrice;
            updated++;
          } else {
            skipped++;
          }
        } else {
          const id = uid();
          const potencies = cleanedPotency ? [cleanedPotency] : [];
          const now = nowStr();
          await db.insert(medicines).values({
            id,
            name: row.name,
            brand: "",
            potency: cleanedPotency,
            formType: row.formType || "Bottle",
            potencies,
            stock: Math.round(row.stock),
            price: String(row.price),
            active: true,
            createdAt: now,
          });
          existingList.push({
            id,
            name: row.name,
            brand: "",
            potency: cleanedPotency,
            formType: row.formType || "Bottle",
            potencies,
            stock: Math.round(row.stock),
            price: String(row.price),
            active: true,
            createdAt: now,
          });
          inserted++;
        }
      } catch (err) {
        errors.push({
          row: i + 1,
          error: err instanceof Error ? err.message : "Invalid medicine data",
        });
      }
    }

    if (inserted > 0 || updated > 0) {
      await logAudit({
        userId: context.userId,
        userName: "Doctor",
        action: "IMPORT_MEDICINES_EXCEL",
        entityType: "medicine",
        details: { inserted, updated, skipped, errorCount: errors.length },
      });
    }

    return { inserted, updated, skipped, errors };
  });
