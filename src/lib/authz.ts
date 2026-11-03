// Server-side authorization checks. Never trust a client-supplied role —
// always look the caller up by id and read their role from the database.
import { prisma } from "./prisma";
import { isAdminOrHr } from "./roles";

export class ForbiddenError extends Error {}

/** Throws ForbiddenError unless the given employee id belongs to an ADMIN/HR user. */
export async function requireAdminOrHr(callerId: string | null | undefined) {
  if (!callerId) {
    throw new ForbiddenError("Sign in as an Admin or HR user to do this.");
  }
  const caller = await prisma.employee.findUnique({ where: { id: callerId } });
  if (!caller || !isAdminOrHr(caller.role)) {
    throw new ForbiddenError("Only Admin or HR users can do this.");
  }
  return caller;
}

/** Looks the caller up by id (no throw) — used for read-side filtering decisions. */
export async function lookupCaller(callerId: string | null | undefined) {
  if (!callerId) return null;
  return prisma.employee.findUnique({ where: { id: callerId } });
}
