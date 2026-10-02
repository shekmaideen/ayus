/**
 * src/lib/auth-middleware.ts
 * TanStack Start middleware that verifies JWT authentication.
 *
 * Usage in server functions:
 *   .middleware([requireAuth])
 *
 * Context injected:
 *   context.userId  — string UUID
 *   context.role    — "doctor" | "receptionist"
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { verifyToken } from "@/lib/auth";

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Error("Unauthorized: no request available");
    }

    const authHeader = request.headers.get("authorization") || request.headers.get("x-authorization");
    let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    if (!token) {
      token = request.headers.get("x-hc-token");
    }

    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      const match = cookieHeader?.match(/hc_token=([^;]+)/);
      token = match ? decodeURIComponent(match[1]) : null;
    }

    if (!token) {
      throw new Error("Unauthorized: missing Bearer token or cookie");
    }

    const payload = verifyToken(token); // throws if invalid

    return next({
      context: {
        userId: payload.userId,
        role: payload.role,
      },
    });
  },
);

/** Helper — throws if the caller is not a doctor. */
export function assertDoctor(role: string): void {
  if (role !== "doctor") throw new Error("Only the doctor can perform this action");
}
