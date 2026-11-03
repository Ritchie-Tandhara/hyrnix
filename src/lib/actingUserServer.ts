// Server-component counterpart to ActingUserContext (which keeps the
// "acting as" selection in localStorage, client-only). ActingUserProvider
// mirrors that selection into a cookie so server components rendered on
// navigation can know who's acting and gate data accordingly. The cookie
// value is only ever used as a lookup key — the employee row it resolves to
// (and its role) is the source of truth, never the cookie itself.
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const ACTING_USER_COOKIE = "hyrnix_acting_user_id";

export async function getActingEmployee() {
  const store = await cookies();
  const id = store.get(ACTING_USER_COOKIE)?.value;
  if (!id) return null;
  return prisma.employee.findUnique({ where: { id } });
}
