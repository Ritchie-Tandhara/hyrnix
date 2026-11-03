import { describe, expect, it } from "vitest";
import { selectAvailableLeaveTypes } from "../policyVersion";
import type { EmployeeLite, PolicyLite } from "../types";

const employee: EmployeeLite = {
  id: "e1",
  name: "Ava",
  department: "Engineering",
  hireDate: new Date("2020-01-01"),
};

const annual: PolicyLite = {
  id: "p-annual",
  policyKey: "standard-annual-leave",
  name: "Standard Annual Leave",
  version: 1,
  entitlementDays: 18,
  eligibleGroup: "all",
  accrualRule: "ANNUAL_UPFRONT",
  carryForwardDays: 5,
  effectiveDate: new Date("2023-01-01"),
  status: "PUBLISHED",
};

const sick: PolicyLite = {
  id: "p-sick",
  policyKey: "sick-leave",
  name: "Sick Leave",
  version: 1,
  entitlementDays: 10,
  eligibleGroup: "all",
  accrualRule: "ANNUAL_UPFRONT",
  carryForwardDays: 0,
  effectiveDate: new Date("2023-01-01"),
  status: "PUBLISHED",
};

const casual: PolicyLite = {
  id: "p-casual",
  policyKey: "casual-leave",
  name: "Casual Leave",
  version: 1,
  entitlementDays: 6,
  eligibleGroup: "Sales", // employee is in Engineering, so not eligible
  accrualRule: "ANNUAL_UPFRONT",
  carryForwardDays: 0,
  effectiveDate: new Date("2023-01-01"),
  status: "PUBLISHED",
};

describe("selectAvailableLeaveTypes", () => {
  it("returns one policy per distinct leave type the employee is eligible for", () => {
    const types = selectAvailableLeaveTypes([annual, sick, casual], employee, new Date("2024-01-01"));
    expect(types.map((t) => t.policyKey).sort()).toEqual(["sick-leave", "standard-annual-leave"]);
  });

  it("excludes types the employee isn't eligible for", () => {
    const types = selectAvailableLeaveTypes([annual, sick, casual], employee, new Date("2024-01-01"));
    expect(types.some((t) => t.policyKey === "casual-leave")).toBe(false);
  });

  it("picks the latest/most specific version per type, same as selectPolicyVersionForDate", () => {
    const annualV2: PolicyLite = {
      ...annual,
      id: "p-annual-v2",
      version: 2,
      entitlementDays: 24,
      eligibleGroup: "Engineering",
      effectiveDate: new Date("2025-01-01"),
    };
    const types = selectAvailableLeaveTypes([annual, annualV2, sick], employee, new Date("2025-06-01"));
    const annualResolved = types.find((t) => t.policyKey === "standard-annual-leave");
    expect(annualResolved?.id).toBe("p-annual-v2");
  });

  it("returns an empty array when no published policy covers the employee yet", () => {
    const types = selectAvailableLeaveTypes([casual], employee, new Date("2024-01-01"));
    expect(types).toEqual([]);
  });
});
