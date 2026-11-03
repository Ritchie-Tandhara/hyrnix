// HYRNIX IQ's "tool" layer.
//
// Each tool is a structured, typed function over the SAME backend data and
// services that Policy Lab and Process X-Ray use — there is no separate
// "AI" data path. Today these tools are called by a deterministic,
// rule-based NL matcher (see hyrnixIq.ts). The schema/separation here is
// deliberately shaped so a real LLM could later be given this same tool
// list (e.g. via function-calling) without changing the underlying logic:
// read-only tools are safe to expose broadly, mutating tools are not.
import { prisma } from "./prisma";
import { runSimulation } from "./simulation";
import { toEmployeeLite, toLeaveRequestLite, toPolicyLite } from "./mappers";
import { selectPolicyVersionForDate } from "./policyVersion";
import type { SimulationResult } from "./types";

export type ToolDefinition<Input, Output> = {
  name: string;
  description: string;
  mutating: boolean; // false = safe/read-only, true = would change persisted state
  run: (input: Input) => Promise<Output>;
};

// ---------------------------------------------------------------------------
// Tool: explainLeaveDecision (read-only)
// ---------------------------------------------------------------------------

export type ExplainLeaveDecisionInput = {
  leaveRequestId?: string;
  employeeNameQuery?: string;
  statusFilter?: "APPROVED" | "REJECTED";
};

export type ExplainLeaveDecisionOutput =
  | {
      found: true;
      leaveRequestId: string;
      employeeName: string;
      status: string;
      policyName: string;
      policyVersion: number;
      reasoning: string;
      rulesEvaluated: { rule: string; passed: boolean; detail: string }[];
    }
  | { found: false; reason: string };

export const explainLeaveDecisionTool: ToolDefinition<
  ExplainLeaveDecisionInput,
  ExplainLeaveDecisionOutput
> = {
  name: "explainLeaveDecision",
  description:
    "Looks up a leave request (by id, or the most recent one for a named employee, optionally filtered by outcome) and returns its Process X-Ray decision trace in plain structured form.",
  mutating: false,
  async run(input) {
    let request = null;

    if (input.leaveRequestId) {
      request = await prisma.leaveRequest.findUnique({
        where: { id: input.leaveRequestId },
        include: { employee: true, policyVersion: true, processTraces: true },
      });
    } else if (input.employeeNameQuery) {
      const employees = await prisma.employee.findMany({
        where: { name: { contains: input.employeeNameQuery } },
      });
      if (employees.length === 0) {
        return { found: false, reason: `No employee found matching "${input.employeeNameQuery}".` };
      }
      const employeeIds = employees.map((e) => e.id);
      request = await prisma.leaveRequest.findFirst({
        where: {
          employeeId: { in: employeeIds },
          ...(input.statusFilter ? { status: input.statusFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { employee: true, policyVersion: true, processTraces: true },
      });
    }

    if (!request) {
      return { found: false, reason: "No matching leave request was found." };
    }

    const trace = request.processTraces[request.processTraces.length - 1];
    const rulesEvaluated = trace ? JSON.parse(trace.rulesEvaluated) : [];

    return {
      found: true,
      leaveRequestId: request.id,
      employeeName: request.employee.name,
      status: request.status,
      policyName: request.policyVersion.name,
      policyVersion: request.policyVersion.version,
      reasoning: request.decisionReasoning ?? "No reasoning recorded.",
      rulesEvaluated,
    };
  },
};

// ---------------------------------------------------------------------------
// Tool: simulatePolicyChange (read-only: computes, does not persist)
// ---------------------------------------------------------------------------

export type SimulatePolicyChangeInput = {
  policyNameQuery: string;
  newEntitlementDays: number;
};

export type SimulatePolicyChangeOutput =
  | { found: true; policyName: string; fromEntitlementDays: number; toEntitlementDays: number; result: SimulationResult }
  | { found: false; reason: string };

export const simulatePolicyChangeTool: ToolDefinition<SimulatePolicyChangeInput, SimulatePolicyChangeOutput> = {
  name: "simulatePolicyChange",
  description:
    "Runs the real Policy Lab simulation engine against a hypothetical entitlement change to an existing published policy, without persisting anything. Reuses the exact same runSimulation() function Policy Lab uses.",
  mutating: false,
  async run(input) {
    const basePolicyRow = await prisma.leavePolicy.findFirst({
      where: { name: { contains: input.policyNameQuery }, status: "PUBLISHED" },
      orderBy: { version: "desc" },
    });

    if (!basePolicyRow) {
      return { found: false, reason: `No published policy found matching "${input.policyNameQuery}".` };
    }

    const basePolicy = toPolicyLite(basePolicyRow);

    const hypotheticalPolicy = {
      ...basePolicy,
      id: `hypothetical:${basePolicy.id}`,
      entitlementDays: input.newEntitlementDays,
    };

    const [employeeRows, leaveRequestRows, otherPolicyRows] = await Promise.all([
      prisma.employee.findMany(),
      prisma.leaveRequest.findMany(),
      prisma.leavePolicy.findMany(),
    ]);

    const employees = employeeRows.map(toEmployeeLite);
    const leaveRequests = leaveRequestRows.map(toLeaveRequestLite);
    const otherPolicies = otherPolicyRows.map(toPolicyLite);
    const publishedPolicies = otherPolicies.filter((p) => p.status === "PUBLISHED");

    const result = runSimulation({
      proposedPolicy: hypotheticalPolicy,
      allEmployees: employees,
      allLeaveRequests: leaveRequests,
      baselinePolicyByEmployee: (employee) =>
        selectPolicyVersionForDate(publishedPolicies, employee, hypotheticalPolicy.effectiveDate),
      otherPolicies,
      asOfDate: new Date(),
    });

    return {
      found: true,
      policyName: basePolicy.name,
      fromEntitlementDays: basePolicy.entitlementDays,
      toEntitlementDays: input.newEntitlementDays,
      result,
    };
  },
};
