/**
 * src/lib/auth.ts
 * JWT + bcrypt helpers that replace Supabase Auth.
 * SERVER-SIDE ONLY — never import this in client code.
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env["JWT_SECRET"] ?? "change-this-secret";
const EXPIRES_IN = (process.env["JWT_EXPIRES_IN"] ?? "30d") as jwt.SignOptions["expiresIn"];

export interface JwtPayload {
  userId: string;
  role: "doctor" | "receptionist";
}

/** Hash a plain-text password with bcrypt (cost factor 12). */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/** Compare a plain-text password against a stored bcrypt hash. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Sign a JWT token containing userId and role. */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/** Verify a JWT token and return the payload, or throw if invalid/expired. */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    throw new Error("Unauthorized: invalid or expired token");
  }
}
