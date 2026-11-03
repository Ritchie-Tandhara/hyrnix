// Shared plain-object types used by the pure business logic modules.
// Kept independent of Prisma's generated types so the core logic
// (balance calc, simulation, trace generation) can be unit tested
// without touching the database.

export type EmployeeLite = {
  id: string;
  name: string;
  department: string;
  hireDate: Date;
};

export type PolicyLite = {
  id: string;
  policyKey: string;
  name: string;
  version: number;
  entitlementDays: number;
  eligibleGroup: string; // department name, or "all"
  accrualRule: "ANNUAL_UPFRONT" | "MONTHLY_ACCRUAL";
  carryForwardDays: number;
  effectiveDate: Date;
  status: "DRAFT" | "SIMULATED" | "PENDING_APPROVAL" | "PUBLISHED" | "ARCHIVED";
};

export type LeaveRequestLite = {
  id: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  daysRequested: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  policyVersionId: string;
};

export type BalanceResult = {
  entitlementDays: number;
  accruedDays: number;
  usedDays: number;
  remainingDays: number;
  carryForwardDays: number;
};

export type EmployeeImpact = {
  employeeId: string;
  employeeName: string;
  department: string;
  before: BalanceResult;
  after: BalanceResult;
  deltaRemaining: number;
};

export type SimulationConflict = {
  conflictingPolicyId: string;
  conflictingPolicyName: string;
  conflictingPolicyVersion: number;
  reason: string;
};

export type SimulationResult = {
  proposedPolicyId: string;
  affectedEmployeeCount: number;
  totalEntitlementDelta: number;
  perEmployee: EmployeeImpact[];
  conflicts: SimulationConflict[];
};
