import { describe, expect, it } from "vitest";
import { evaluateLeaveRequest } from "../decision";
import type { EmployeeLite, LeaveRequestLite, PolicyLite } from "../types";

const employee: EmployeeLite = {
  id: "e1",
  name: "Ava Chen",
  department: "Engineering",
  hireDate: new Date("2020-01-01"),
};

const policy: PolicyLite = {
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

describe("evaluateLeaveRequest", () => {
  it("approves when the employee is eligible and has sufficient balance, with a full rule trace", () => {
    const trace = evaluateLeaveRequest({
      employee,
      policy,
      requestStartDate: new Date("2024-06-01"),
      requestEndDate: new Date("2024-06-03"),
      daysRequested: 3,
      existingLeaveRequests: [],
    });

    expect(trace.outcome).toBe("APPROVED");
    expect(trace.rulesEvaluated).toHaveLength(2);
    expect(trace.rulesEvaluated[0]).toMatchObject({ rule: "eligibility_check", passed: true });
    expect(trace.rulesEvaluated[1]).toMatchObject({ rule: "sufficient_balance_check", passed: true });
    expect(trace.policyVersionId).toBe("p1");
    expect(trace.reasoning).toContain("Approved");
  });

  it("rejects when the request exceeds the remaining balance", () => {
    const priorRequests: LeaveRequestLite[] = [
      {
        id: "r1",
        employeeId: "e1",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-02-14"),
        daysRequested: 14,
        status: "APPROVED",
        policyVersionId: "p1",
      },
    ];

    const trace = evaluateLeaveRequest({
      employee,
      policy,
      requestStartDate: new Date("2024-06-01"),
      requestEndDate: new Date("2024-06-10"),
      daysRequested: 10,
      existingLeaveRequests: priorRequests,
    });

    expect(trace.outcome).toBe("REJECTED");
    expect(trace.rulesEvaluated[1].passed).toBe(false);
    expect(trace.reasoning).toContain("Rejected");
    expect(trace.reasoning).toContain("insufficient balance");
  });

  it("approves a 0.5-day (half-day) request and deducts exactly half a day", () => {
    const trace = evaluateLeaveRequest({
      employee,
      policy,
      requestStartDate: new Date("2024-06-01"),
      requestEndDate: new Date("2024-06-01"),
      daysRequested: 0.5,
      existingLeaveRequests: [],
    });

    expect(trace.outcome).toBe("APPROVED");
    expect(trace.inputs).toMatchObject({ daysRequested: 0.5 });
    expect(trace.reasoning).toContain("0.5-day request");
  });

  it("rejects on ineligibility before even checking balance semantics", () => {
    const salesOnlyPolicy: PolicyLite = { ...policy, eligibleGroup: "Sales" };

    const trace = evaluateLeaveRequest({
      employee, // Engineering
      policy: salesOnlyPolicy,
      requestStartDate: new Date("2024-06-01"),
      requestEndDate: new Date("2024-06-01"),
      daysRequested: 1,
      existingLeaveRequests: [],
    });

    expect(trace.outcome).toBe("REJECTED");
    expect(trace.rulesEvaluated[0].passed).toBe(false);
    expect(trace.reasoning).toContain("not eligible");
  });
});
