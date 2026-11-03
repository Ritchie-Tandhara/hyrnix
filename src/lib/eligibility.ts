import type { EmployeeLite, PolicyLite } from "./types";

/** An employee is eligible for a policy if the policy targets "all" employees
 * or targets the employee's exact department. */
export function isEligible(employee: EmployeeLite, policy: Pick<PolicyLite, "eligibleGroup">): boolean {
  return policy.eligibleGroup === "all" || policy.eligibleGroup === employee.department;
}

/** Two eligible groups "overlap" if either is "all", or they name the same department. */
export function groupsOverlap(groupA: string, groupB: string): boolean {
  if (groupA === "all" || groupB === "all") return true;
  return groupA === groupB;
}
