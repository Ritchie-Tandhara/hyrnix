import { describe, expect, it } from "vitest";
import { calculateAccrued, calculateBalance, calculateUsedDays } from "../balance";
import type { EmployeeLite, LeaveRequestLite, PolicyLite } from "../types";

const employee: EmployeeLite = {
  id: "emp-1",
  name: "Jamie Lee",
  department: "Engineering",
  hireDate: new Date("2023-01-01"),
};

const annualPolicy: PolicyLite = {
  id: "policy-1",
  policyKey: "standard-annual-leave",
  name: "Standard Annual Leave",
  version: 1,
  entitlementDays: 18,
  eligibleGroup: "all",
  accrualRule: "ANNUAL_UPFRONT",
  carryForwardDays: 5,
  effectiveDate: new Date("2024-01-01"),
  status: "PUBLISHED",
};

const monthlyPolicy: PolicyLite = {
  ...annualPolicy,
  id: "policy-2",
  accrualRule: "MONTHLY_ACCRUAL",
  entitlementDays: 24,
};

describe("calculateAccrued", () => {
  it("grants the full entitlement upfront once the policy is in effect for ANNUAL_UPFRONT", () => {
    expect(calculateAccrued(employee, annualPolicy, new Date("2024-06-01"))).toBe(18);
  });

  it("grants nothing before the policy's effective date / hire date", () => {
    const futureEmployee = { ...employee, hireDate: new Date("2025-01-01") };
    expect(calculateAccrued(futureEmployee, annualPolicy, new Date("2024-06-01"))).toBe(0);
  });

  it("accrues proportionally per elapsed month for MONTHLY_ACCRUAL", () => {
    // start = max(effectiveDate 2024-01-01, hireDate 2023-01-01) = 2024-01-01
    // 6 full months elapsed by 2024-07-01 => 24/12 * 6 = 12
    expect(calculateAccrued(employee, monthlyPolicy, new Date("2024-07-01"))).toBe(12);
  });

  it("caps monthly accrual at the full entitlement", () => {
    expect(calculateAccrued(employee, monthlyPolicy, new Date("2030-01-01"))).toBe(24);
  });
});

describe("calculateUsedDays", () => {
  const requests: LeaveRequestLite[] = [
    {
      id: "req-1",
      employeeId: "emp-1",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-02-03"),
      daysRequested: 3,
      status: "APPROVED",
      policyVersionId: "policy-1",
    },
    {
      id: "req-2",
      employeeId: "emp-1",
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-03-01"),
      daysRequested: 1,
      status: "REJECTED",
      policyVersionId: "policy-1",
    },
    {
      id: "req-3",
      employeeId: "emp-1",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2024-04-02"),
      daysRequested: 2,
      status: "APPROVED",
      policyVersionId: "policy-2",
    },
  ];

  it("only sums APPROVED requests against the given policy version", () => {
    expect(calculateUsedDays("emp-1", "policy-1", requests)).toBe(3);
    expect(calculateUsedDays("emp-1", "policy-2", requests)).toBe(2);
  });
});

describe("calculateBalance", () => {
  it("computes entitlement/accrued/used/remaining with carry-forward applied and capped", () => {
    const requests: LeaveRequestLite[] = [
      {
        id: "req-1",
        employeeId: "emp-1",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-02-05"),
        daysRequested: 5,
        status: "APPROVED",
        policyVersionId: "policy-1",
      },
    ];

    const balance = calculateBalance(employee, annualPolicy, requests, new Date("2024-06-01"), 10);

    expect(balance.entitlementDays).toBe(18);
    expect(balance.accruedDays).toBe(18);
    expect(balance.usedDays).toBe(5);
    // carry-forward capped at policy.carryForwardDays (5), not the raw 10 passed in
    expect(balance.carryForwardDays).toBe(5);
    expect(balance.remainingDays).toBe(18 + 5 - 5);
  });
});
