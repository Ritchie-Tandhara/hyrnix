import { prisma } from "./prisma";
import { evaluateLeaveRequest } from "./decision";
import { toEmployeeLite, toLeaveRequestLite } from "./mappers";
import { resolvePublishedPolicyForEmployee } from "./policyService";
import { daysBetweenInclusive } from "./balance";
import { recordAuditLog } from "./auditLog";
import { isAdminOrHr } from "./roles";
import { ForbiddenError, lookupCaller } from "./authz";

export async function listLeaveRequests(filter?: { employeeId?: string }) {
  return prisma.leaveRequest.findMany({
    where: filter?.employeeId ? { employeeId: filter.employeeId } : undefined,
    include: { employee: true, policyVersion: true, decidedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLeaveRequest(id: string) {
  return prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true, policyVersion: true, decidedBy: true, processTraces: true },
  });
}

/**
 * Submits a new leave request for an employee and immediately evaluates it
 * (this demo auto-decides every request deterministically rather than
 * requiring a separate human-approval step, so Process X-Ray always has a
 * trace to show). The request is evaluated against whichever PUBLISHED
 * policy version is in effect for the employee's group on the request's
 * start date.
 */
export async function submitLeaveRequest(input: {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  daysRequested?: number;
  actorId?: string; // defaults to the employee themself
}) {
  const employeeRow = await prisma.employee.findUniqueOrThrow({ where: { id: input.employeeId } });

  // Submitting leave for someone other than yourself requires Admin/HR.
  if (input.actorId && input.actorId !== input.employeeId) {
    const caller = await lookupCaller(input.actorId);
    if (!caller || !isAdminOrHr(caller.role)) {
      throw new ForbiddenError("Only Admin or HR users can submit a leave request on someone else's behalf.");
    }
  }

  const policy = await resolvePublishedPolicyForEmployee(input.employeeId, input.startDate);

  if (!policy) {
    throw new Error(
      `No published leave policy covers ${employeeRow.name} (department: ${employeeRow.department}) as of ${input.startDate.toISOString().slice(0, 10)}.`
    );
  }

  const daysRequested = input.daysRequested ?? daysBetweenInclusive(input.startDate, input.endDate);

  const existingRequestRows = await prisma.leaveRequest.findMany({ where: { employeeId: input.employeeId } });

  const trace = evaluateLeaveRequest({
    employee: toEmployeeLite(employeeRow),
    policy,
    requestStartDate: input.startDate,
    requestEndDate: input.endDate,
    daysRequested,
    existingLeaveRequests: existingRequestRows.map(toLeaveRequestLite),
  });

  const actorId = input.actorId ?? input.employeeId;

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId: input.employeeId,
      startDate: input.startDate,
      endDate: input.endDate,
      daysRequested,
      status: trace.outcome,
      policyVersionId: policy.id,
      decisionReasoning: trace.reasoning,
      decidedById: actorId,
      decidedAt: new Date(),
    },
  });

  await prisma.processTrace.create({
    data: {
      leaveRequestId: leaveRequest.id,
      triggerEvent: trace.triggerEvent,
      policyVersionId: trace.policyVersionId,
      rulesEvaluated: JSON.stringify(trace.rulesEvaluated),
      inputs: JSON.stringify(trace.inputs),
      outcome: trace.outcome,
      actorId,
    },
  });

  await recordAuditLog({
    entityType: "LeaveRequest",
    entityId: leaveRequest.id,
    action: "EVALUATED",
    actorId,
    details: { outcome: trace.outcome, policyVersionId: policy.id, reasoning: trace.reasoning },
  });

  return leaveRequest;
}

export async function getProcessTracesForRequest(leaveRequestId: string) {
  return prisma.processTrace.findMany({
    where: { leaveRequestId },
    orderBy: { timestamp: "asc" },
    include: { actor: true },
  });
}
