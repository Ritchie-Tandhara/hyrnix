import { prisma } from "./prisma";
import { recordAuditLog } from "./auditLog";
import { runSimulation } from "./simulation";
import { toEmployeeLite, toLeaveRequestLite, toPolicyLite } from "./mappers";
import { selectPolicyVersionForDate } from "./policyVersion";
import type { PolicyLite } from "./types";

export async function listPolicies() {
  return prisma.leavePolicy.findMany({
    orderBy: [{ policyKey: "asc" }, { version: "asc" }],
    include: { createdBy: true, approvedBy: true },
  });
}

export async function getPolicy(id: string) {
  return prisma.leavePolicy.findUnique({
    where: { id },
    include: { createdBy: true, approvedBy: true },
  });
}

export async function createDraftPolicy(input: {
  policyKey?: string;
  name: string;
  description?: string;
  entitlementDays: number;
  eligibleGroup: string;
  accrualRule: "ANNUAL_UPFRONT" | "MONTHLY_ACCRUAL";
  carryForwardDays: number;
  effectiveDate: Date;
  createdById: string;
}) {
  const policyKey = input.policyKey ?? `policy-${Date.now()}`;

  const latest = await prisma.leavePolicy.findFirst({
    where: { policyKey },
    orderBy: { version: "desc" },
  });
  const version = latest ? latest.version + 1 : 1;

  const policy = await prisma.leavePolicy.create({
    data: {
      policyKey,
      name: input.name,
      description: input.description,
      version,
      entitlementDays: input.entitlementDays,
      eligibleGroup: input.eligibleGroup,
      accrualRule: input.accrualRule,
      carryForwardDays: input.carryForwardDays,
      effectiveDate: input.effectiveDate,
      status: "DRAFT",
      createdById: input.createdById,
    },
  });

  await recordAuditLog({
    entityType: "LeavePolicy",
    entityId: policy.id,
    action: "CREATED",
    actorId: input.createdById,
    details: { policyKey, version, status: "DRAFT", input },
  });

  return policy;
}

/**
 * Runs the deterministic simulation engine for a proposed (not-yet-published)
 * policy version, persists a SimulationRun record, and moves the policy from
 * DRAFT (or back from any prior state) to SIMULATED.
 */
export async function simulatePolicy(policyId: string, runById: string) {
  const proposedRow = await prisma.leavePolicy.findUniqueOrThrow({ where: { id: policyId } });
  const proposedPolicy = toPolicyLite(proposedRow);

  const [employeeRows, leaveRequestRows, otherPolicyRows] = await Promise.all([
    prisma.employee.findMany(),
    prisma.leaveRequest.findMany(),
    prisma.leavePolicy.findMany({ where: { id: { not: policyId } } }),
  ]);

  const employees = employeeRows.map(toEmployeeLite);
  const leaveRequests = leaveRequestRows.map(toLeaveRequestLite);
  const otherPolicies = otherPolicyRows.map(toPolicyLite);
  const publishedOtherPolicies = otherPolicies.filter((p) => p.status === "PUBLISHED");

  const asOfDate = new Date();

  const result = runSimulation({
    proposedPolicy,
    allEmployees: employees,
    allLeaveRequests: leaveRequests,
    baselinePolicyByEmployee: (employee) =>
      selectPolicyVersionForDate(publishedOtherPolicies, employee, proposedPolicy.effectiveDate),
    otherPolicies,
    asOfDate,
  });

  const simulationRun = await prisma.simulationRun.create({
    data: {
      policyId,
      runById,
      inputSnapshot: JSON.stringify({
        proposedPolicy,
        asOfDate,
        employeeCount: employees.length,
      }),
      outputSnapshot: JSON.stringify(result),
      affectedEmployeeCount: result.affectedEmployeeCount,
      totalDaysDelta: result.totalEntitlementDelta,
      conflictCount: result.conflicts.length,
    },
  });

  await prisma.leavePolicy.update({ where: { id: policyId }, data: { status: "SIMULATED" } });

  await recordAuditLog({
    entityType: "LeavePolicy",
    entityId: policyId,
    action: "SIMULATION_RUN",
    actorId: runById,
    details: {
      simulationRunId: simulationRun.id,
      affectedEmployeeCount: result.affectedEmployeeCount,
      totalEntitlementDelta: result.totalEntitlementDelta,
      conflictCount: result.conflicts.length,
    },
  });

  return { simulationRun, result };
}

export async function submitForApproval(policyId: string, actorId: string) {
  const policy = await prisma.leavePolicy.findUniqueOrThrow({ where: { id: policyId } });
  if (policy.status !== "SIMULATED") {
    throw new Error(`Policy must be SIMULATED before it can be submitted for approval (current: ${policy.status}).`);
  }

  const updated = await prisma.leavePolicy.update({
    where: { id: policyId },
    data: { status: "PENDING_APPROVAL" },
  });

  await recordAuditLog({
    entityType: "LeavePolicy",
    entityId: policyId,
    action: "STATUS_CHANGE",
    actorId,
    details: { from: "SIMULATED", to: "PENDING_APPROVAL" },
  });

  return updated;
}

export async function publishPolicy(policyId: string, approverId: string) {
  const policy = await prisma.leavePolicy.findUniqueOrThrow({ where: { id: policyId } });
  if (policy.status !== "PENDING_APPROVAL") {
    throw new Error(`Policy must be PENDING_APPROVAL before it can be published (current: ${policy.status}).`);
  }

  const updated = await prisma.leavePolicy.update({
    where: { id: policyId },
    data: { status: "PUBLISHED", approvedById: approverId },
  });

  await recordAuditLog({
    entityType: "LeavePolicy",
    entityId: policyId,
    action: "STATUS_CHANGE",
    actorId: approverId,
    details: { from: "PENDING_APPROVAL", to: "PUBLISHED", approvedById: approverId },
  });

  return updated;
}

export async function archivePolicy(policyId: string, actorId: string) {
  const policy = await prisma.leavePolicy.findUniqueOrThrow({ where: { id: policyId } });
  const updated = await prisma.leavePolicy.update({ where: { id: policyId }, data: { status: "ARCHIVED" } });

  await recordAuditLog({
    entityType: "LeavePolicy",
    entityId: policyId,
    action: "STATUS_CHANGE",
    actorId,
    details: { from: policy.status, to: "ARCHIVED" },
  });

  return updated;
}

/** Resolves the published policy version that governs an employee on a given date. Used by leaveService. */
export async function resolvePublishedPolicyForEmployee(employeeId: string, date: Date): Promise<PolicyLite | null> {
  const employeeRow = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
  const policyRows = await prisma.leavePolicy.findMany({ where: { status: "PUBLISHED" } });
  return selectPolicyVersionForDate(policyRows.map(toPolicyLite), toEmployeeLite(employeeRow), date);
}
