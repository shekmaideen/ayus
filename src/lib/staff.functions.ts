/**
 * src/lib/staff.functions.ts
 * Server functions for auth and staff management (MySQL + JWT + bcrypt).
 */
import { createServerFn } from "@tanstack/react-start";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, clinicSettings } from "@/lib/schema";
import { hashPassword, verifyPassword, signToken } from "@/lib/auth";
import { requireAuth, assertDoctor } from "@/lib/auth-middleware";

const crypto = globalThis.crypto;
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString().slice(0, 19).replace("T", " "); // MySQL DATETIME format

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9._-]+$/, "Use letters, numbers, dots, dashes or underscores");

// ─────────────────────────────────────────────────────────────────
/** Does the clinic need its first doctor account? */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const [userRow] = await db.select({ total: count() }).from(users);
  const needsSetup = (userRow?.total ?? 0) === 0;

  const [settingsRow] = await db
    .select({ clinicName: clinicSettings.clinicName, logoDataUrl: clinicSettings.logoDataUrl })
    .from(clinicSettings)
    .limit(1);

  return { 
    needsSetup, 
    clinicName: settingsRow?.clinicName ?? null, 
    logoDataUrl: settingsRow?.logoDataUrl ?? null 
  };
});
// ─────────────────────────────────────────────────────────────────
/** Create the first doctor account (only works when no users exist). */
export const createFirstDoctor = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(100),
        email:    z.string().trim().email().max(255),
        username: usernameSchema,
        password: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const [row] = await db.select({ total: count() }).from(users);
    if ((row?.total ?? 0) > 0) throw new Error("The clinic is already set up. Please sign in.");

    const hashed = await hashPassword(data.password);
    const id = uid();
    await db.insert(users).values({
      id,
      email:     data.email,
      username:  data.username,
      fullName:  data.fullName,
      password:  hashed,
      role:      "doctor",
      active:    true,
      createdAt: now(),
    });

    // Seed the doctor name into clinic settings
    await db
      .update(clinicSettings)
      .set({ doctorName: data.fullName })
      .where(eq(clinicSettings.id, 1));

    const token = signToken({ userId: id, role: "doctor" });
    return { ok: true, token, userId: id, role: "doctor" as const, userName: data.fullName };
  });

// ─────────────────────────────────────────────────────────────────
/** Sign in with email or username. Returns a JWT token. */
export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ identifier: z.string().trim().min(1), password: z.string().min(1).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    const fail = new Error("Wrong email/username or password");

    // Look up by email or username
    const isEmail = data.identifier.includes("@");
    const rows = await db
      .select()
      .from(users)
      .where(isEmail ? eq(users.email, data.identifier) : eq(users.username, data.identifier))
      .limit(1);

    const user = rows[0];
    if (!user) throw fail;
    if (!user.active) throw new Error("This account has been deactivated.");

    const ok = await verifyPassword(data.password, user.password);
    if (!ok) throw fail;

    const token = signToken({ userId: user.id, role: user.role });
    return {
      token,
      userId: user.id,
      role:   user.role,
      userName: user.fullName || user.email,
    };
  });

// ─────────────────────────────────────────────────────────────────
/** List all staff members (doctor only). */
export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertDoctor(context.role);
    const rows = await db
      .select({ id: users.id, fullName: users.fullName, username: users.username, email: users.email, role: users.role, active: users.active })
      .from(users)
      .orderBy(users.createdAt);
    return rows.map((r) => ({
      id:       r.id,
      name:     r.fullName,
      username: r.username ?? "",
      email:    r.email,
      role:     r.role,
      active:   r.active,
    }));
  });

// ─────────────────────────────────────────────────────────────────
/** Add a new receptionist (doctor only). */
export const addStaff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(100),
        username: usernameSchema,
        email:    z.string().trim().email().max(255).optional().or(z.literal("")),
        password: z.string().min(8).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);

    // Check username uniqueness
    const taken = await db.select({ id: users.id }).from(users).where(eq(users.username, data.username)).limit(1);
    if (taken.length > 0) throw new Error("That username is already taken.");

    const email = data.email || `${data.username}@staff.homeocare.local`;
    const hashed = await hashPassword(data.password);
    await db.insert(users).values({
      id:        uid(),
      email,
      username:  data.username,
      fullName:  data.fullName,
      password:  hashed,
      role:      "receptionist",
      active:    true,
      createdAt: now(),
    });
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
/** Reset a staff member's password (doctor only). */
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    const hashed = await hashPassword(data.password);
    await db.update(users).set({ password: hashed }).where(eq(users.id, data.userId));
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
/** Remove a staff member (doctor only, cannot remove self). */
export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    assertDoctor(context.role);
    if (data.userId === context.userId) throw new Error("You cannot remove your own account.");
    await db.delete(users).where(eq(users.id, data.userId));
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────────
/** Verify a token and return the session info (used on page load). */
export const getSession = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const rows = await db
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1);
    const user = rows[0];
    return {
      userId:   context.userId,
      role:     context.role,
      userName: user?.fullName || user?.email || "",
    };
  });

// ─────────────────────────────────────────────────────────────────
/** Change current user's own password (any authenticated user). */
export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const rows = await db.select({ password: users.password }).from(users).where(eq(users.id, context.userId)).limit(1);
    const user = rows[0];
    if (!user) throw new Error("User not found.");
    const valid = await verifyPassword(data.currentPassword, user.password);
    if (!valid) throw new Error("Current password is incorrect.");
    const hashed = await hashPassword(data.newPassword);
    await db.update(users).set({ password: hashed }).where(eq(users.id, context.userId));
    return { ok: true };
  });
