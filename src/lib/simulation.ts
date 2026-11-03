import { calculateBalance } from "./balance";
import { isEligible, groupsOverlap } from "./eligibility";
import type {
  EmployeeImpact,
  EmployeeLite,
  LeaveRequestLite,
  PolicyLite,
  SimulationConflict,
  SimulationResult,
} from "./types";

/**
 * Runs a deterministic "what if we published this policy" simulation.
 *
 * - `proposedPolicy` is the policy version being proposed (not yet published).
 * - `baselinePolicyByEmployee` resolves, for each eligible employee, the
 *   policy version currently governing them (their "before" state) — or
 *   null if none exists yet (brand new policy for that group).
 * - `allEmployees` is the full employee roster (eligibility is derived).
 * - `allLeaveRequests` is used to compute "used days" under both the
 *   baseline and proposed version.
 * - `otherPolicies` is every other non-archived policy version in the
 *   system, used for conflict detection.
 */
export function runSimulation(params: {
  proposedPolicy: PolicyLite;
  allEmployees: EmployeeLite[];
  allLeaveRequests: LeaveRequestLite[];
  baselinePolicyByEmployee: (employee: EmployeeLite) => PolicyLite | null;
  otherPolicies: PolicyLite[];
  asOfDate: Date;
}): SimulationResult {
  const { proposedPolicy, allEmployees, allLeaveRequests, baselinePolicyByEmployee, otherPolicies, asOfDate } =
    params;

  const eligibleEmployees = allEmployees.filter((e) => isEligible(e, proposedPolicy));

  const perEmployee: EmployeeImpact[] = eligibleEmployees.map((employee) => {
    const baselinePolicy = baselinePolicyByEmployee(employee);

    const before = baselinePolicy
      ? calculateBalance(employee, baselinePolicy, allLeaveRequests, asOfDate)
      : {
          entitlementDays: 0,
          accruedDays: 0,
          usedDays: 0,
          remainingDays: 0,
          carryForwardDays: 0,
        };

    const after = calculateBalance(employee, proposedPolicy, allLeaveRequests, asOfDate);

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      before,
      after,
      deltaRemaining: Math.round((after.remainingDays - before.remainingDays) * 100) / 100,
    };
  });

  const totalEntitlementDelta =
    Math.round(
      perEmployee.reduce((sum, e) => sum + (e.after.entitlementDays - e.before.entitlementDays), 0) * 100
    ) / 100;

  const conflicts: SimulationConflict[] = otherPolicies
    .filter((p) => p.policyKey !== proposedPolicy.policyKey)
    .filter((p) => ["PENDING_APPROVAL", "PUBLISHED", "SIMULATED"].includes(p.status))
    .filter((p) => groupsOverlap(p.eligibleGroup, proposedPolicy.eligibleGroup))
    .filter((p) => p.effectiveDate.getTime() === proposedPolicy.effectiveDate.getTime())
    .map((p) => ({
      conflictingPolicyId: p.id,
      conflictingPolicyName: p.name,
      conflictingPolicyVersion: p.version,
      reason: `"${p.name}" v${p.version} targets an overlapping group ("${p.eligibleGroup}") with the same effective date (${p.effectiveDate.toISOString().slice(0, 10)}).`,
    }));

  return {
    proposedPolicyId: proposedPolicy.id,
    affectedEmployeeCount: eligibleEmployees.length,
    totalEntitlementDelta,
    perEmployee,
    conflicts,
  };
}
