import { isEligible } from "./eligibility";
import type { EmployeeLite, PolicyLite } from "./types";

/**
 * Selects which PUBLISHED policy version applies to a given employee on a
 * given date: the published version for the employee's eligible group with
 * the latest effectiveDate that is <= the given date. Existing leave
 * requests keep referencing whatever version they were originally evaluated
 * under (that reference is stored on the LeaveRequest row, not recomputed),
 * so this function is only used to decide which version a *new* request
 * should be evaluated against.
 */
export function selectPolicyVersionForDate(
  policies: PolicyLite[],
  employee: EmployeeLite,
  date: Date
): PolicyLite | null {
  const candidates = policies.filter(
    (p) => p.status === "PUBLISHED" && p.effectiveDate <= date && isEligible(employee, p)
  );

  if (candidates.length === 0) return null;

  // Prefer the most specific group match (exact department over "all"),
  // then the latest effective date, then the highest version number.
  candidates.sort((a, b) => {
    const aSpecific = a.eligibleGroup !== "all" ? 1 : 0;
    const bSpecific = b.eligibleGroup !== "all" ? 1 : 0;
    if (aSpecific !== bSpecific) return bSpecific - aSpecific;

    const dateDiff = b.effectiveDate.getTime() - a.effectiveDate.getTime();
    if (dateDiff !== 0) return dateDiff;

    return b.version - a.version;
  });

  return candidates[0];
}
