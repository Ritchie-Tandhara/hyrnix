export function isAdminOrHr(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "HR";
}
