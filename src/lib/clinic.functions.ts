/**
 * src/lib/clinic.functions.ts
 * Server functions for all clinic data (patients, visits, medicines,
 * prescriptions, bills, follow-ups, templates, settings).
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
  appointments,
} from "@/lib/schema";
import { requireAuth, assertDoctor } from "@/lib/auth-middleware";

const crypto = globalThis.crypto;
const uid = () => crypto.randomUUID();
const nowStr = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const todayStr = () => new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────
// LOAD ALL (called once on login, populates the Zustand store)
// ─────────────────────────────────────────────────────────────────
export const loadClinicData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    // Safely query appointments table in case migration hasn't been executed on DB yet
    let appts: unknown[] = [];
    try {
      appts = await db.select().from(appointments).orderBy(asc(appointments.date));
    } catch {
      appts = [];
    }

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
    
    return { me: { id: me.id, role: me.role, fullName: me.fullName }, pats, chs, vis, meds, pres, bls, fus, tpls, settings: settings[0] ?? null, appts };
  });

// ─────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────
export const insertAppointment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    id: z.string(), patientId: z.string(), doctorId: z.string().nullable().optional(),
    date: z.string(), time: z.string(), status: z.string(), notes: z.string(),
  }).parse(d))
  .handler(async ({ data }) => {
    await db.insert(appointments).values({
      ...data,
      doctorId: data.doctorId ?? undefined,
      createdAt: nowStr(),
    });
    return { ok: true };
  });

export const updateAppointmentStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({ id: z.string(), status: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.update(appointments).set({ status: data.status }).where(eq(appointments.id, data.id));
    return { ok: true };
  });

export const deleteAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.delete(appointments).where(eq(appointments.id, data.id));
    return { ok: true };
  });


// ─────────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────────
export const insertPatient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    id: z.string(), regNo: z.string(), name: z.string(), age: z.number(),
    gender: z.string(), phone: z.string(), email: z.string(), address: z.string(),
    bloodGroup: z.string(), allergies: z.array(z.string()), occupation: z.string(),
    active: z.boolean(), registeredOn: z.string(),
  }).parse(d))
  .handler(async ({ data }) => {
    await db.insert(patients).values({ ...data, createdAt: nowStr() });
    return { ok: true };
  });

export const updatePatient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    id: z.string(),
    patch: z.object({
      name: z.string().optional(), age: z.number().optional(), gender: z.string().optional(),
      phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(),
      bloodGroup: z.string().optional(), allergies: z.array(z.string()).optional(),
      occupation: z.string().optional(), active: z.boolean().optional(),
    }),
  }).parse(d))
  .handler(async ({ data }) => {
    await db.update(patients).set(data.patch).where(eq(patients.id, data.id));
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// CASE HISTORIES
// ─────────────────────────────────────────────────────────────────
export const upsertCaseHistory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    patientId: z.string(),
    data: z.record(z.unknown()),
  }).parse(d))
  .handler(async ({ data }) => {
    await db
      .insert(caseHistories)
      .values({ patientId: data.patientId, data: data.data, updatedAt: nowStr() })
      .onDuplicateKeyUpdate({ set: { data: data.data, updatedAt: nowStr() } });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// VISITS
// ─────────────────────────────────────────────────────────────────
export const insertVisit = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
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
  .inputValidator((d) => z.object({
    id: z.string(), name: z.string(), potencies: z.array(z.string()),
    stock: z.number(), price: z.number(),
  }).parse(d))
  .handler(async ({ data }) => {
    await db.insert(medicines).values({
      ...data,
      price: String(data.price),
      createdAt: nowStr(),
    });
    return { ok: true };
  });

export const updateMedicine = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    id: z.string(),
    patch: z.object({
      name: z.string().optional(), potencies: z.array(z.string()).optional(),
      stock: z.number().optional(), price: z.number().optional(),
    }),
  }).parse(d))
  .handler(async ({ data }) => {
    const patch: Record<string, unknown> = { ...data.patch };
    if (typeof patch.price === "number") patch.price = String(patch.price);
    await db.update(medicines).set(patch).where(eq(medicines.id, data.id));
    return { ok: true };
  });

export const deleteMedicine = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    await db.delete(medicines).where(eq(medicines.id, data.id));
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// PRESCRIPTIONS  (atomic: visit + prescription + bill + stock + follow-up)
// ─────────────────────────────────────────────────────────────────
export const savePrescriptionFull = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
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
    // 1. Insert visit if new
    if (data.visit) {
      await db.insert(visits).values({ ...data.visit, createdAt: nowStr() });
    }
    // 2. Insert prescription
    await db.insert(prescriptions).values({
      ...data.prescription,
      followUpDate: data.prescription.followUpDate ?? undefined,
      createdAt: nowStr(),
    });
    // 3. Insert bill
    await db.insert(bills).values({
      ...data.bill,
      amountReceived: String(data.bill.amountReceived),
      createdAt: nowStr(),
    });
    // 4. Update medicine stock
    await Promise.all(
      data.stockUpdates.map((u) => db.update(medicines).set({ stock: u.stock }).where(eq(medicines.id, u.id))),
    );
    // 5. Insert follow-up if provided
    if (data.followUp) {
      await db.insert(followUps).values({ ...data.followUp, createdAt: nowStr() });
    }
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// BILLS
// ─────────────────────────────────────────────────────────────────
export const insertBill = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    id: z.string(), invoiceNo: z.string(), patientId: z.string(),
    prescriptionId: z.string().nullable(), date: z.string(), items: z.array(z.unknown()),
    status: z.string(), paymentMode: z.string().nullable(),
    amountReceived: z.number(), readyForPayment: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => {
    await db.insert(bills).values({
      ...data,
      prescriptionId: data.prescriptionId ?? undefined,
      amountReceived: String(data.amountReceived),
      createdAt: nowStr(),
    });
    return { ok: true };
  });

export const updateBill = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    id: z.string(),
    patch: z.object({
      status: z.string().optional(), paymentMode: z.string().nullable().optional(),
      amountReceived: z.number().optional(), readyForPayment: z.boolean().optional(),
      items: z.array(z.unknown()).optional(),
    }),
  }).parse(d))
  .handler(async ({ data }) => {
    const patch: Record<string, unknown> = { ...data.patch };
    if (typeof patch.amountReceived === "number") patch.amountReceived = String(patch.amountReceived);
    await db.update(bills).set(patch).where(eq(bills.id, data.id));
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// FOLLOW-UPS
// ─────────────────────────────────────────────────────────────────
export const insertFollowUp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
    id: z.string(), patientId: z.string(), dueDate: z.string(),
    reason: z.string(), status: z.string(),
  }).parse(d))
  .handler(async ({ data }) => {
    await db.insert(followUps).values({ ...data, createdAt: nowStr() });
    return { ok: true };
  });

export const setFollowUpStatusFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({ id: z.string(), status: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.update(followUps).set({ status: data.status }).where(eq(followUps.id, data.id));
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────
export const insertTemplate = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({
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
  .inputValidator((d) => z.object({
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
    if (data.consultationFee   !== undefined) patch.consultationFee   = String(data.consultationFee);
    if (data.followUpFee       !== undefined) patch.followUpFee       = String(data.followUpFee);
    if (data.registrationFee   !== undefined) patch.registrationFee   = String(data.registrationFee);
    if (data.lowStockThreshold !== undefined) patch.lowStockThreshold = data.lowStockThreshold;
    if (data.clinicName        !== undefined) patch.clinicName        = data.clinicName;
    if (data.address           !== undefined) patch.address           = data.address;
    if (data.phone             !== undefined) patch.phone             = data.phone;
    if (data.doctorName        !== undefined) patch.doctorName        = data.doctorName;
    if (data.logoDataUrl       !== undefined) patch.logoDataUrl       = data.logoDataUrl;
    await db.update(clinicSettings).set(patch).where(eq(clinicSettings.id, 1));
    return { ok: true };
  });
