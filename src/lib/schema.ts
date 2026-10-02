/**
 * src/lib/schema.ts
 * Drizzle ORM table definitions for MySQL.
 * Mirrors the homeocare.sql schema exactly.
 */
import {
  boolean,
  char,
  date,
  datetime,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id:        char("id", { length: 36 }).primaryKey(),
  email:     varchar("email", { length: 255 }).notNull().unique(),
  username:  varchar("username", { length: 50 }).unique(),
  fullName:  varchar("full_name", { length: 100 }).notNull().default(""),
  password:  varchar("password", { length: 255 }).notNull(),
  role:      mysqlEnum("role", ["doctor", "receptionist"]).notNull().default("receptionist"),
  active:    boolean("active").notNull().default(true),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
});

// ─── Clinic Settings ─────────────────────────────────────────────
export const clinicSettings = mysqlTable("clinic_settings", {
  id:                 int("id").primaryKey(),
  consultationFee:    decimal("consultation_fee", { precision: 10, scale: 2 }).notNull().default("400"),
  followUpFee:        decimal("follow_up_fee", { precision: 10, scale: 2 }).notNull().default("250"),
  registrationFee:    decimal("registration_fee", { precision: 10, scale: 2 }).notNull().default("100"),
  lowStockThreshold:  int("low_stock_threshold").notNull().default(10),
  clinicName:         varchar("clinic_name", { length: 200 }).notNull().default("HomeoCare Clinic"),
  address:            varchar("address", { length: 500 }).notNull().default(""),
  phone:              varchar("phone", { length: 20 }).notNull().default(""),
  doctorName:         varchar("doctor_name", { length: 100 }).notNull().default(""),
  logoDataUrl:        text("logo_data_url"),
});

// ─── Patients ────────────────────────────────────────────────────
export const patients = mysqlTable("patients", {
  id:           char("id", { length: 36 }).primaryKey(),
  regNo:        varchar("reg_no", { length: 20 }).notNull().unique(),
  name:         varchar("name", { length: 150 }).notNull(),
  age:          int("age").notNull().default(0),
  gender:       varchar("gender", { length: 20 }).notNull().default("Other"),
  phone:        varchar("phone", { length: 20 }).notNull().default(""),
  email:        varchar("email", { length: 255 }).notNull().default(""),
  address:      varchar("address", { length: 500 }).notNull().default(""),
  bloodGroup:   varchar("blood_group", { length: 10 }).notNull().default(""),
  allergies:    json("allergies").$type<string[]>().notNull(),
  occupation:   varchar("occupation", { length: 100 }).notNull().default(""),
  active:       boolean("active").notNull().default(true),
  registeredOn: date("registered_on", { mode: "string" }).notNull(),
  createdAt:    datetime("created_at", { mode: "string" }).notNull(),
});

// ─── Case Histories ──────────────────────────────────────────────
export const caseHistories = mysqlTable("case_histories", {
  patientId: char("patient_id", { length: 36 }).primaryKey(),
  data:      json("data").$type<Record<string, any>>().notNull(),
  updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
});

// ─── Visits ──────────────────────────────────────────────────────
export const visits = mysqlTable("visits", {
  id:        char("id", { length: 36 }).primaryKey(),
  patientId: char("patient_id", { length: 36 }).notNull(),
  date:      date("date", { mode: "string" }).notNull(),
  type:      varchar("type", { length: 30 }).notNull().default("New"),
  complaint: varchar("complaint", { length: 500 }).notNull().default(""),
  notes:     varchar("notes", { length: 1000 }).notNull().default(""),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
});

// ─── Medicines ───────────────────────────────────────────────────
export const medicines = mysqlTable("medicines", {
  id:        char("id", { length: 36 }).primaryKey(),
  name:      varchar("name", { length: 200 }).notNull(),
  brand:     varchar("brand", { length: 150 }).notNull().default("Standard"),
  potency:   varchar("potency", { length: 50 }).notNull().default("30CH"),
  formType:  varchar("form_type", { length: 50 }).notNull().default("Globules"),
  potencies: json("potencies").$type<string[]>().notNull(),
  stock:     int("stock").notNull().default(0),
  price:     decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  active:    boolean("active").notNull().default(true),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
});

// ─── Prescriptions ───────────────────────────────────────────────
export const prescriptions = mysqlTable("prescriptions", {
  id:            char("id", { length: 36 }).primaryKey(),
  patientId:     char("patient_id", { length: 36 }).notNull(),
  visitId:       char("visit_id", { length: 36 }),
  date:          date("date", { mode: "string" }).notNull(),
  items:         json("items").$type<any[]>().notNull(),
  followUpDate:  date("follow_up_date", { mode: "string" }),
  isRefill:      boolean("is_refill").notNull().default(false),
  notes:         varchar("notes", { length: 1000 }).notNull().default(""),
  createdAt:     datetime("created_at", { mode: "string" }).notNull(),
});

// ─── Bills ───────────────────────────────────────────────────────
export const bills = mysqlTable("bills", {
  id:               char("id", { length: 36 }).primaryKey(),
  invoiceNo:        varchar("invoice_no", { length: 30 }).notNull().unique(),
  patientId:        char("patient_id", { length: 36 }).notNull(),
  prescriptionId:   char("prescription_id", { length: 36 }),
  date:             date("date", { mode: "string" }).notNull(),
  items:            json("items").$type<any[]>().notNull(),
  status:           varchar("status", { length: 20 }).notNull().default("Pending"),
  paymentMode:      varchar("payment_mode", { length: 20 }),
  amountReceived:   decimal("amount_received", { precision: 10, scale: 2 }).notNull().default("0"),
  readyForPayment:  boolean("ready_for_payment").notNull().default(true),
  createdAt:        datetime("created_at", { mode: "string" }).notNull(),
});

// ─── Follow-ups ──────────────────────────────────────────────────
export const followUps = mysqlTable("follow_ups", {
  id:        char("id", { length: 36 }).primaryKey(),
  patientId: char("patient_id", { length: 36 }).notNull(),
  dueDate:   date("due_date", { mode: "string" }).notNull(),
  reason:    varchar("reason", { length: 500 }).notNull().default(""),
  status:    varchar("status", { length: 20 }).notNull().default("Pending"),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
});

// ─── Prescription Templates ───────────────────────────────────────
export const templates = mysqlTable("templates", {
  id:        char("id", { length: 36 }).primaryKey(),
  name:      varchar("name", { length: 200 }).notNull(),
  items:     json("items").$type<any[]>().notNull(),
  createdAt: datetime("created_at", { mode: "string" }).notNull(),
});

// ─── Login Attempts (Rate Limiting & Lockout) ────────────────────
export const loginAttempts = mysqlTable("login_attempts", {
  id:          int("id").autoincrement().primaryKey(),
  identifier:  varchar("identifier", { length: 255 }).notNull(),
  ip:          varchar("ip", { length: 45 }),
  attemptedAt: datetime("attempted_at", { mode: "string" }).notNull(),
  succeeded:   boolean("succeeded").notNull().default(false),
});

// ─── Audit Logs (Activity & Compliance) ──────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id:         int("id").autoincrement().primaryKey(),
  userId:     char("user_id", { length: 36 }),
  userName:   varchar("user_name", { length: 100 }).notNull().default(""),
  action:     varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId:   varchar("entity_id", { length: 100 }),
  details:    text("details"),
  createdAt:  datetime("created_at", { mode: "string" }).notNull(),
});


