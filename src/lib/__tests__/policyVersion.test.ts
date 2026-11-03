import { describe, expect, it } from "vitest";
import { selectPolicyVersionForDate } from "../policyVersion";
import type { EmployeeLite, PolicyLite } from "../types";

const employee: EmployeeLite = {
  id: "e1",
  name: "Ava",
  department: "Engineering",
  hireDate: new Date("2020-01-01"),
};

const v1: PolicyLite = {
  id: "p1",
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

const v2: PolicyLite = {
  ...v1,
  id: "p2",
  version: 2,
  entitlementDays: 24,
  eligibleGroup: "Engineering",
  effectiveDate: new Date("2025-01-01"),
};

describe("selectPolicyVersionForDate", () => {
  it("selects the only published policy in effect before any newer version exists", () => {
    const selected = selectPolicyVersionForDate([v1], employee, new Date("2024-06-01"));
    expect(selected?.id).toBe("p1");
  });

  it("selects v1 for a request dated before v2's effective date", () => {
    const selected = selectPolicyVersionForDate([v1, v2], employee, new Date("2024-12-31"));
    expect(selected?.id).toBe("p1");
  });

  it("selects v2 for a request dated on/after v2's effective date, preferring the more specific group", () => {
    const selected = selectPolicyVersionForDate([v1, v2], employee, new Date("2025-02-01"));
    expect(selected?.id).toBe("p2");
  });

  it("ignores non-published (draft/pending) versions", () => {
    const draftV3: PolicyLite = { ...v2, id: "p3", version: 3, status: "DRAFT", entitlementDays: 30 };
    const selected = selectPolicyVersionForDate([v1, v2, draftV3], employee, new Date("2026-01-01"));
    expect(selected?.id).toBe("p2");
  });

  it("returns null when no published policy covers the employee's group yet", () => {
    const salesOnly: PolicyLite = { ...v1, id: "p-sales", eligibleGroup: "Sales" };
    const selected = selectPolicyVersionForDate([salesOnly], employee, new Date("2024-01-01"));
    expect(selected).toBeNull();
  });
});
