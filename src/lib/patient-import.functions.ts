/**
 * src/lib/patient-import.functions.ts
 * Server functions for batch importing 3,000+ patient records safely from CSV.
 */
import { createServerFn } from "@tanstack/react-start";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { patients } from "@/lib/schema";
import { requireAuth } from "@/lib/auth-middleware";

const crypto = globalThis.crypto;
const uid = () => crypto.randomUUID();
const nowStr = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const todayStr = () => new Date().toISOString().slice(0, 10);

const rawPatientRowSchema = z.object({
  regNo: z.string().trim().min(1, "Registration No is required"),
  name: z.string().trim().min(1, "Patient name is required"),
  age: z.coerce.number().min(0).max(150).default(0),
  gender: z.string().trim().default("Other"),
  phone: z.string().trim().default(""),
  email: z.string().trim().default(""),
  address: z.string().trim().default(""),
  bloodGroup: z.string().trim().default(""),
  allergies: z.array(z.string()).default([]),
  occupation: z.string().trim().default(""),
  registeredOn: z.string().trim().default(todayStr()),
});

export type RawPatientRow = z.input<typeof rawPatientRowSchema>;

/** Validate raw CSV patient rows and check duplicates against the DB */
export const validatePatientImport = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({ rows: z.array(z.record(z.unknown())) }).parse(d))
  .handler(async ({ data }) => {
    const existingPats = await db.select({ regNo: patients.regNo, phone: patients.phone }).from(patients);
    const existingRegNos = new Set(existingPats.map((p) => p.regNo.toLowerCase()));
    const existingPhones = new Set(existingPats.filter((p) => p.phone).map((p) => p.phone));

    const results = data.rows.map((row, index) => {
      // Map common CSV column headers
      const normalizedRow = {
        regNo: String(row["Reg No"] || row["regNo"] || row["Registration No"] || row["RegNo"] || `REG-${index + 1001}`),
        name: String(row["Name"] || row["name"] || row["Patient Name"] || ""),
        age: row["Age"] !== undefined ? Number(row["Age"] || row["age"]) : 0,
        gender: String(row["Gender"] || row["gender"] || "Other"),
        phone: String(row["Phone"] || row["phone"] || row["Mobile"] || ""),
        email: String(row["Email"] || row["email"] || ""),
        address: String(row["Address"] || row["address"] || ""),
        bloodGroup: String(row["Blood Group"] || row["bloodGroup"] || ""),
        allergies: typeof row["Allergies"] === "string" 
          ? row["Allergies"].split(",").map((s) => s.trim()).filter(Boolean)
          : Array.isArray(row["allergies"]) ? row["allergies"] : [],
        occupation: String(row["Occupation"] || row["occupation"] || ""),
        registeredOn: String(row["Registered On"] || row["registeredOn"] || todayStr()),
      };

      const parsed = rawPatientRowSchema.safeParse(normalizedRow);
      if (!parsed.success) {
        return {
          index: index + 1,
          status: "error" as const,
          row: normalizedRow,
          error: parsed.error.issues.map((i) => i.message).join("; "),
        };
      }

      const isDuplicateReg = existingRegNos.has(parsed.data.regNo.toLowerCase());
      const isDuplicatePhone = parsed.data.phone && existingPhones.has(parsed.data.phone);

      if (isDuplicateReg || isDuplicatePhone) {
        return {
          index: index + 1,
          status: "duplicate" as const,
          row: parsed.data,
          warning: isDuplicateReg ? `Reg No '${parsed.data.regNo}' already exists` : `Phone '${parsed.data.phone}' already exists`,
        };
      }

      return {
        index: index + 1,
        status: "valid" as const,
        row: parsed.data,
      };
    });

    const validRows = results.filter((r) => r.status === "valid");
    const duplicateRows = results.filter((r) => r.status === "duplicate");
    const errorRows = results.filter((r) => r.status === "error");

    return {
      total: data.rows.length,
      validCount: validRows.length,
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
      results,
    };
  });

/** Execute batch patient import */
export const executePatientImport = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    rows: z.array(rawPatientRowSchema),
    skipDuplicates: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data }) => {
    const recordsToInsert = data.rows.map((row) => ({
      id: uid(),
      regNo: row.regNo,
      name: row.name,
      age: row.age,
      gender: row.gender,
      phone: row.phone,
      email: row.email,
      address: row.address,
      bloodGroup: row.bloodGroup,
      allergies: row.allergies,
      occupation: row.occupation,
      active: true,
      registeredOn: row.registeredOn,
      createdAt: nowStr(),
    }));

    if (recordsToInsert.length === 0) {
      return { ok: true, importedCount: 0 };
    }

    // Insert in batches of 100 for maximum MySQL performance
    const BATCH_SIZE = 100;
    let insertedTotal = 0;

    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      await db.insert(patients).values(batch);
      insertedTotal += batch.length;
    }

    return { ok: true, importedCount: insertedTotal };
  });
