/**
 * src/lib/clinic.functions.ts
 * Server functions for all clinic data (patients, visits, medicines,
 * prescriptions, bills, follow-ups, templates, settings, audit logs).
 * Called from the Zustand store (src/store/clinic.ts).
 */
import { createServerFn } from "@tanstack/react-start";
import { eq, desc, asc } from "drizzle-orm";
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
  users,
  auditLogs,
} from "@/lib/schema";
import { requireAuth, assertDoctor } from "@/lib/auth-middleware";
import { logAudit } from "@/lib/audit";
import { ensureDailyBackup } from "@/lib/auto-backup";

const crypto = globalThis.crypto;
const uid = () => crypto.randomUUID();
const nowStr = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// ─────────────────────────────────────────────────────────────────
// LOAD ALL (called once on login, populates the Zustand store)
// ─────────────────────────────────────────────────────────────────
export const loadClinicData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    // Trigger daily auto-backup non-blockingly
    ensureDailyBackup().catch((err) => console.error("[AutoBackup] error:", err));

    const [
      meArray, pats, chs, vis, meds, pres, bls, fus, tpls, settings,
    ] = await Promise.all([
      db.select().from(users).where(eq(users.id, context.userId)).limit(1),
      db.select().from(patients).orderBy(desc(patients.createdAt)),
      db.select().from(caseHistories),
      db.select().from(visits).orderBy(desc(visits.date)),
      db.select().from(medicines).orderBy(asc(medicines.name)),
      db.select().from(prescriptions).orderBy(desc(prescriptions.createdAt)),
      db.select().from(bills).orderBy(desc(bills.createdAt)),
      db.select().from(followUps).orderBy(asc(followUps.dueDate)),
      db.select().from(templates).orderBy(asc(templates.name)),
      db.select().from(clinicSettings).where(eq(clinicSettings.id, 1)).limit(1),
    ]);
    const me = meArray[0];
    if (!me) throw new Error("User not found");
    
    return {
      me: { id: me.id, role: me.role, fullName: me.fullName },
      pats,
      chs,
      vis,
      meds,
      pres,
      bls,
      fus,
      tpls,
      settings: settings[0] ?? null,
    };
  });

// ─────────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────────
export const insertPatient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(), regNo: z.string(), name: z.string(), age: z.number(),
    gender: z.string(), phone: z.string(), email: z.string(), address: z.string(),
    bloodGroup: z.string(), allergies: z.array(z.string()), occupation: z.string(),
    active: z.boolean(), registeredOn: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await db.insert(patients).values({ ...data, createdAt: nowStr() });
    await logAudit({
      userId: context.userId,
      userName: context.role === "doctor" ? "Doctor" : "Receptionist",
      action: "REGISTER_PATIENT",
      entityType: "patient",
      entityId: data.id,
      details: { regNo: data.regNo, name: data.name },
    });
    return { ok: true };
  });

export const updatePatient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(),
    patch: z.object({
      name: z.string().optional(), age: z.number().optional(), gender: z.string().optional(),
      phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(),
      bloodGroup: z.string().optional(), allergies: z.array(z.string()).optional(),
      occupation: z.string().optional(), active: z.boolean().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await db.update(patients).set(data.patch).where(eq(patients.id, data.id));
    await logAudit({
      userId: context.userId,
      userName: context.role === "doctor" ? "Doctor" : "Receptionist",
      action: "UPDATE_PATIENT",
      entityType: "patient",
      entityId: data.id,
      details: data.patch,
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// CASE HISTORIES
// ─────────────────────────────────────────────────────────────────
export const upsertCaseHistory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    patientId: z.string(),
    data: z.record(z.any()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await db
      .insert(caseHistories)
      .values({ patientId: data.patientId, data: data.data, updatedAt: nowStr() })
      .onDuplicateKeyUpdate({ set: { data: data.data, updatedAt: nowStr() } });

    await logAudit({
      userId: context.userId,
      userName: context.role === "doctor" ? "Doctor" : "Receptionist",
      action: "UPDATE_CASE_HISTORY",
      entityType: "patient",
      entityId: data.patientId,
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// VISITS
// ─────────────────────────────────────────────────────────────────
export const insertVisit = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(), patientId: z.string(), date: z.string(),
    type: z.string(), complaint: z.string(), notes: z.string(),
  }).parse(d))
  .handler(async ({ data }) => {
    await db.insert(visits).values({ ...data, createdAt: nowStr() });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// MEDICINES
// ─────────────────────────────────────────────────────────────────
export const insertMedicine = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(),
    name: z.string().trim().min(1, "Medicine name is required"),
    brand: z.string().trim().min(1, "Brand name is required"),
    potency: z.string().optional().default(""),
    formType: z.string().trim().min(1, "Form/Type is required"),
    potencies: z.array(z.string()).optional(),
    stock: z.number().min(0, "Stock cannot be negative"),
    price: z.number().min(0, "Price cannot be negative"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    await db.insert(medicines).values({
      id: data.id,
      name: data.name,
      brand: data.brand,
      potency: data.potency || "",
      formType: data.formType,
      potencies: data.potencies && data.potencies.length > 0 ? data.potencies : (data.potency ? [data.potency] : []),
      stock: data.stock,
      price: String(data.price),
      active: true,
      createdAt: nowStr(),
    });
    await logAudit({
      userId: context.userId,
      userName: "Doctor",
      action: "ADD_MEDICINE",
      entityType: "medicine",
      entityId: data.id,
      details: {
        name: data.name,
        brand: data.brand,
        potency: data.potency,
        formType: data.formType,
        stock: data.stock,
        price: data.price,
      },
    });
    return { ok: true };
  });

export const updateMedicine = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(),
    patch: z.object({
      name: z.string().optional(),
      brand: z.string().optional(),
      potency: z.string().optional(),
      formType: z.string().optional(),
      potencies: z.array(z.string()).optional(),
      stock: z.number().min(0).optional(),
      price: z.number().min(0).optional(),
      active: z.boolean().optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    const patch: Record<string, unknown> = { ...data.patch };
    if (typeof patch["price"] === "number") patch["price"] = String(patch["price"]);
    await db.update(medicines).set(patch).where(eq(medicines.id, data.id));
    await logAudit({
      userId: context.userId,
      userName: "Doctor",
      action: "UPDATE_MEDICINE",
      entityType: "medicine",
      entityId: data.id,
      details: data.patch,
    });
    return { ok: true };
  });

export const adjustMedicineStock = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(),
    newStock: z.number().min(0, "Stock cannot be negative"),
    delta: z.number(),
    reason: z.string().trim().min(1, "Adjustment reason is required"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    await db.update(medicines).set({ stock: data.newStock }).where(eq(medicines.id, data.id));
    await logAudit({
      userId: context.userId,
      userName: "Doctor",
      action: "ADJUST_STOCK",
      entityType: "medicine",
      entityId: data.id,
      details: {
        newStock: data.newStock,
        delta: data.delta,
        reason: data.reason,
      },
    });
    return { ok: true };
  });

export const deleteMedicine = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    // Soft delete: archive medicine so historical prescriptions remain valid
    await db.update(medicines).set({ active: false }).where(eq(medicines.id, data.id));
    await logAudit({
      userId: context.userId,
      userName: "Doctor",
      action: "ARCHIVE_MEDICINE",
      entityType: "medicine",
      entityId: data.id,
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// PRESCRIPTIONS (ATOMIC TRANSACTION: visit + prescription + bill + stock + follow-up)
// ─────────────────────────────────────────────────────────────────
export const savePrescriptionFull = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    visit: z.object({
      id: z.string(), patientId: z.string(), date: z.string(),
      type: z.string(), complaint: z.string(), notes: z.string(),
    }).optional(),
    prescription: z.object({
      id: z.string(), patientId: z.string(), visitId: z.string(), date: z.string(),
      items: z.array(z.unknown()), followUpDate: z.string().nullable(),
      isRefill: z.boolean(), notes: z.string(),
    }),
    bill: z.object({
      id: z.string(), invoiceNo: z.string(), patientId: z.string(),
      prescriptionId: z.string(), date: z.string(), items: z.array(z.unknown()),
      status: z.string(), paymentMode: z.string().nullable(),
      amountReceived: z.number(), readyForPayment: z.boolean(),
    }),
    stockUpdates: z.array(z.object({ id: z.string(), stock: z.number() })),
    followUp: z.object({
      id: z.string(), patientId: z.string(), dueDate: z.string(),
      reason: z.string(), status: z.string(),
    }).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);

    // Run all database operations inside a single ACID transaction
    await db.transaction(async (tx) => {
      // 1. Insert visit if new
      if (data.visit) {
        await tx.insert(visits).values({ ...data.visit, createdAt: nowStr() });
      }
      // 2. Insert prescription
      await tx.insert(prescriptions).values({
        ...data.prescription,
        followUpDate: data.prescription.followUpDate ?? undefined,
        createdAt: nowStr(),
      });
      // 3. Insert bill
      await tx.insert(bills).values({
        ...data.bill,
        amountReceived: String(data.bill.amountReceived),
        createdAt: nowStr(),
      });
      // 4. Update medicine stock
      await Promise.all(
        data.stockUpdates.map((u) => tx.update(medicines).set({ stock: u.stock }).where(eq(medicines.id, u.id))),
      );
      // 5. Insert follow-up if provided
      if (data.followUp) {
        await tx.insert(followUps).values({ ...data.followUp, createdAt: nowStr() });
      }
      // 6. Log audit event
      await logAudit(
        {
          userId: context.userId,
          userName: "Doctor",
          action: "CREATE_PRESCRIPTION",
          entityType: "prescription",
          entityId: data.prescription.id,
          details: {
            patientId: data.prescription.patientId,
            invoiceNo: data.bill.invoiceNo,
            itemCount: data.prescription.items.length,
          },
        },
        tx,
      );
    });

    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// BILLS
// ─────────────────────────────────────────────────────────────────
export const insertBill = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(), invoiceNo: z.string(), patientId: z.string(),
    prescriptionId: z.string().nullable(), date: z.string(), items: z.array(z.unknown()),
    status: z.string(), paymentMode: z.string().nullable(),
    amountReceived: z.number(), readyForPayment: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await db.insert(bills).values({
      ...data,
      prescriptionId: data.prescriptionId ?? undefined,
      amountReceived: String(data.amountReceived),
      createdAt: nowStr(),
    });
    await logAudit({
      userId: context.userId,
      userName: context.role === "doctor" ? "Doctor" : "Receptionist",
      action: "CREATE_BILL",
      entityType: "bill",
      entityId: data.id,
      details: { invoiceNo: data.invoiceNo, amount: data.amountReceived },
    });
    return { ok: true };
  });

export const updateBill = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(),
    patch: z.object({
      status: z.string().optional(), paymentMode: z.string().nullable().optional(),
      amountReceived: z.number().optional(), readyForPayment: z.boolean().optional(),
      items: z.array(z.unknown()).optional(),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { ...data.patch };
    if (typeof patch["amountReceived"] === "number") patch["amountReceived"] = String(patch["amountReceived"]);
    await db.update(bills).set(patch).where(eq(bills.id, data.id));

    await logAudit({
      userId: context.userId,
      userName: context.role === "doctor" ? "Doctor" : "Receptionist",
      action: "UPDATE_BILL",
      entityType: "bill",
      entityId: data.id,
      details: data.patch,
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// FOLLOW-UPS
// ─────────────────────────────────────────────────────────────────
export const insertFollowUp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(), patientId: z.string(), dueDate: z.string(),
    reason: z.string(), status: z.string(),
  }).parse(d))
  .handler(async ({ data }) => {
    await db.insert(followUps).values({ ...data, createdAt: nowStr() });
    return { ok: true };
  });

export const setFollowUpStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({ id: z.string(), status: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.update(followUps).set({ status: data.status }).where(eq(followUps.id, data.id));
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────
export const insertTemplate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    id: z.string(), name: z.string(), items: z.array(z.unknown()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    await db.insert(templates).values({ ...data, createdAt: nowStr() });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────
export const updateSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d) => z.object({
    consultationFee:    z.number().optional(),
    followUpFee:        z.number().optional(),
    registrationFee:    z.number().optional(),
    lowStockThreshold:  z.number().optional(),
    clinicName:         z.string().optional(),
    address:            z.string().optional(),
    phone:              z.string().optional(),
    doctorName:         z.string().optional(),
    logoDataUrl:        z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    const patch: Record<string, unknown> = {};
    const d = data as Record<string, unknown>;
    if (d["consultationFee"]   !== undefined) patch["consultationFee"]   = String(d["consultationFee"]);
    if (d["followUpFee"]       !== undefined) patch["followUpFee"]       = String(d["followUpFee"]);
    if (d["registrationFee"]   !== undefined) patch["registrationFee"]   = String(d["registrationFee"]);
    if (d["lowStockThreshold"] !== undefined) patch["lowStockThreshold"] = d["lowStockThreshold"];
    if (d["clinicName"]        !== undefined) patch["clinicName"]        = d["clinicName"];
    if (d["address"]           !== undefined) patch["address"]           = d["address"];
    if (d["phone"]             !== undefined) patch["phone"]             = d["phone"];
    if (d["doctorName"]        !== undefined) patch["doctorName"]        = d["doctorName"];
    if (d["logoDataUrl"]       !== undefined) patch["logoDataUrl"]       = d["logoDataUrl"];
    await db.update(clinicSettings).set(patch).where(eq(clinicSettings.id, 1));

    await logAudit({
      userId: context.userId,
      userName: "Doctor",
      action: "UPDATE_SETTINGS",
      entityType: "clinic_settings",
      entityId: "1",
      details: Object.keys(patch),
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// AUDIT LOGS (Doctor only)
// ─────────────────────────────────────────────────────────────────
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertDoctor(context.role);
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
    return rows;
  });
