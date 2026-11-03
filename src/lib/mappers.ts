// Converts Prisma model rows into the plain "Lite" types the pure business
// logic functions in balance.ts / simulation.ts / decision.ts / policyVersion.ts expect.
import type { Employee, LeavePolicy, LeaveRequest } from "@prisma/client";
import type { EmployeeLite, LeaveRequestLite, PolicyLite } from "./types";

export function toEmployeeLite(e: Employee): EmployeeLite {
  return {
    id: e.id,
    name: e.name,
    department: e.department,
    hireDate: e.hireDate,
  };
}

export function toPolicyLite(p: LeavePolicy): PolicyLite {
  return {
    id: p.id,
    policyKey: p.policyKey,
    name: p.name,
    version: p.version,
    entitlementDays: p.entitlementDays,
    eligibleGroup: p.eligibleGroup,
    accrualRule: p.accrualRule as PolicyLite["accrualRule"],
    carryForwardDays: p.carryForwardDays,
    effectiveDate: p.effectiveDate,
    status: p.status as PolicyLite["status"],
  };
}

export function toLeaveRequestLite(r: LeaveRequest): LeaveRequestLite {
  return {
    id: r.id,
    employeeId: r.employeeId,
    startDate: r.startDate,
    endDate: r.endDate,
    daysRequested: r.daysRequested,
    status: r.status as LeaveRequestLite["status"],
    policyVersionId: r.policyVersionId,
  };
}
