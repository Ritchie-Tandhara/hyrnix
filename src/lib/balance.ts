import type { BalanceResult, EmployeeLite, LeaveRequestLite, PolicyLite } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function monthsBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Deterministic entitlement/accrual calculation for one employee under one
 * policy version, as of a given date.
 *
 * - ANNUAL_UPFRONT: the full entitlement is accrued as soon as the policy is
 *   in effect for the employee (max of policy effective date and the
 *   employee's hire date has passed).
 * - MONTHLY_ACCRUAL: 1/12th of the entitlement accrues per full month elapsed
 *   since that same start point, capped at the full entitlement.
 */
export function calculateAccrued(
  employee: EmployeeLite,
  policy: Pick<PolicyLite, "entitlementDays" | "accrualRule" | "effectiveDate">,
  asOfDate: Date
): number {
  const start = policy.effectiveDate > employee.hireDate ? policy.effectiveDate : employee.hireDate;
  if (asOfDate < start) return 0;

  if (policy.accrualRule === "MONTHLY_ACCRUAL") {
    const months = monthsBetween(start, asOfDate);
    const accrued = (policy.entitlementDays / 12) * months;
    return Math.min(policy.entitlementDays, Math.round(accrued * 100) / 100);
  }

  // ANNUAL_UPFRONT
  return policy.entitlementDays;
}

/** Sum of days used by APPROVED leave requests evaluated against this exact policy version. */
export function calculateUsedDays(
  employeeId: string,
  policyVersionId: string,
  leaveRequests: LeaveRequestLite[]
): number {
  return leaveRequests
    .filter(
      (r) =>
        r.employeeId === employeeId &&
        r.policyVersionId === policyVersionId &&
        r.status === "APPROVED"
    )
    .reduce((sum, r) => sum + r.daysRequested, 0);
}

/**
 * Full balance computation: entitlement, accrued, used, remaining.
 * `carryForwardDays` is added on top of accrued days (bounded by the
 * policy's carryForwardDays cap), matching the versioned LeavePolicy's
 * carry-forward rule.
 */
export function calculateBalance(
  employee: EmployeeLite,
  policy: PolicyLite,
  leaveRequests: LeaveRequestLite[],
  asOfDate: Date,
  priorCarryForwardDays = 0
): BalanceResult {
  const accruedDays = calculateAccrued(employee, policy, asOfDate);
  const usedDays = calculateUsedDays(employee.id, policy.id, leaveRequests);
  const carryForwardDays = Math.min(priorCarryForwardDays, policy.carryForwardDays);
  const remainingDays = accruedDays + carryForwardDays - usedDays;

  return {
    entitlementDays: policy.entitlementDays,
    accruedDays,
    usedDays,
    remainingDays,
    carryForwardDays,
  };
}

export function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}
