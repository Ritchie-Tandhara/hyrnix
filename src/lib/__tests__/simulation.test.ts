import { describe, expect, it } from "vitest";
import { runSimulation } from "../simulation";
import type { EmployeeLite, LeaveRequestLite, PolicyLite } from "../types";

const employees: EmployeeLite[] = [
  { id: "e1", name: "Ava", department: "Engineering", hireDate: new Date("2022-01-01") },
  { id: "e2", name: "Ben", department: "Engineering", hireDate: new Date("2022-01-01") },
  { id: "e3", name: "Cho", department: "Sales", hireDate: new Date("2022-01-01") },
];

const currentPolicy: PolicyLite = {
  id: "policy-v1",
  policyKey: "standard-annual-leave",
  name: "Standard Annual Leave",
  version: 1,
  entitlementDays: 18,
  eligibleGroup: "all",
  accrualRule: "ANNUAL_UPFRONT",
  carryForwardDays: 0,
  effectiveDate: new Date("2023-01-01"),
  status: "PUBLISHED",
};

const proposedPolicy: PolicyLite = {
  ...currentPolicy,
  id: "policy-v2",
  version: 2,
  entitlementDays: 24,
  eligibleGroup: "Engineering",
  status: "DRAFT",
  effectiveDate: new Date("2025-01-01"),
};

describe("runSimulation", () => {
  it("computes per-employee before/after impact only for the eligible group", () => {
    const result = runSimulation({
      proposedPolicy,
      allEmployees: employees,
      allLeaveRequests: [],
      baselinePolicyByEmployee: () => currentPolicy,
      otherPolicies: [currentPolicy],
      asOfDate: new Date("2025-02-01"),
    });

    expect(result.affectedEmployeeCount).toBe(2); // Ava + Ben, not Cho (Sales)
    const ava = result.perEmployee.find((e) => e.employeeId === "e1")!;
    expect(ava.before.entitlementDays).toBe(18);
    expect(ava.after.entitlementDays).toBe(24);
    expect(ava.deltaRemaining).toBe(6);
    expect(result.totalEntitlementDelta).toBe(12); // 2 employees * +6 days
  });

  it("accounts for used days already consumed under the baseline policy version", () => {
    const requests: LeaveRequestLite[] = [
      {
        id: "r1",
        employeeId: "e1",
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-03-05"),
        daysRequested: 5,
        status: "APPROVED",
        policyVersionId: "policy-v1",
      },
    ];

    const result = runSimulation({
      proposedPolicy,
      allEmployees: employees,
      allLeaveRequests: requests,
      baselinePolicyByEmployee: () => currentPolicy,
      otherPolicies: [currentPolicy],
      asOfDate: new Date("2025-02-01"),
    });

    const ava = result.perEmployee.find((e) => e.employeeId === "e1")!;
    // before: 18 - 5 used = 13 remaining; after: 24 - 0 used (different policy version id) = 24
    expect(ava.before.remainingDays).toBe(13);
    expect(ava.after.remainingDays).toBe(24);
  });

  it("flags a conflict when another active policy targets an overlapping group with the same effective date", () => {
    const conflictingPolicy: PolicyLite = {
      ...currentPolicy,
      id: "policy-conflict",
      policyKey: "engineering-special-leave",
      version: 1,
      eligibleGroup: "Engineering",
      status: "PENDING_APPROVAL",
      effectiveDate: proposedPolicy.effectiveDate,
    };

    const result = runSimulation({
      proposedPolicy,
      allEmployees: employees,
      allLeaveRequests: [],
      baselinePolicyByEmployee: () => currentPolicy,
      otherPolicies: [currentPolicy, conflictingPolicy],
      asOfDate: new Date("2025-02-01"),
    });

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].conflictingPolicyId).toBe("policy-conflict");
  });

  it("produces no conflict when effective dates differ", () => {
    const laterPolicy: PolicyLite = {
      ...currentPolicy,
      id: "policy-later",
      policyKey: "engineering-special-leave",
      eligibleGroup: "Engineering",
      status: "PENDING_APPROVAL",
      effectiveDate: new Date("2026-01-01"),
    };

    const result = runSimulation({
      proposedPolicy,
      allEmployees: employees,
      allLeaveRequests: [],
      baselinePolicyByEmployee: () => currentPolicy,
      otherPolicies: [currentPolicy, laterPolicy],
      asOfDate: new Date("2025-02-01"),
    });

    expect(result.conflicts).toHaveLength(0);
  });
});
