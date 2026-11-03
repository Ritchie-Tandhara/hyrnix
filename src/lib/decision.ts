import { calculateBalance } from "./balance";
import { isEligible } from "./eligibility";
import { daysBetweenInclusive } from "./balance";
import type { EmployeeLite, LeaveRequestLite, PolicyLite } from "./types";

export type RuleResult = {
  rule: string;
  passed: boolean;
  detail: string;
};

export type DecisionTrace = {
  triggerEvent: string;
  policyVersionId: string;
  rulesEvaluated: RuleResult[];
  inputs: Record<string, unknown>;
  outcome: "APPROVED" | "REJECTED";
  reasoning: string;
};

/**
 * Deterministically evaluates a leave request against a specific policy
 * version and produces a structured decision trace (the data Process X-Ray
 * renders, and the data HYRNIX IQ reads when explaining a decision).
 *
 * Rules evaluated, in order:
 *   1. Eligibility check — is the employee in the policy's eligible group?
 *   2. Sufficient balance check — does remaining balance cover the request?
 */
export function evaluateLeaveRequest(params: {
  employee: EmployeeLite;
  policy: PolicyLite;
  requestStartDate: Date;
  requestEndDate: Date;
  daysRequested: number;
  existingLeaveRequests: LeaveRequestLite[];
}): DecisionTrace {
  const { employee, policy, requestStartDate, requestEndDate, daysRequested, existingLeaveRequests } = params;

  const rules: RuleResult[] = [];

  const eligible = isEligible(employee, policy);
  rules.push({
    rule: "eligibility_check",
    passed: eligible,
    detail: eligible
      ? `${employee.name} (department: ${employee.department}) is covered by policy "${policy.name}" v${policy.version} (eligible group: ${policy.eligibleGroup}).`
      : `${employee.name} (department: ${employee.department}) is NOT covered by policy "${policy.name}" v${policy.version} (eligible group: ${policy.eligibleGroup}).`,
  });

  const balance = calculateBalance(employee, policy, existingLeaveRequests, requestStartDate);
  const sufficientBalance = eligible && balance.remainingDays >= daysRequested;
  rules.push({
    rule: "sufficient_balance_check",
    passed: sufficientBalance,
    detail: eligible
      ? `Remaining balance as of ${requestStartDate.toISOString().slice(0, 10)} is ${balance.remainingDays} day(s) (accrued ${balance.accruedDays} + carry-forward ${balance.carryForwardDays} - used ${balance.usedDays}); request is for ${daysRequested} day(s).`
      : `Balance check skipped because the employee is not eligible under this policy.`,
  });

  const outcome: "APPROVED" | "REJECTED" = eligible && sufficientBalance ? "APPROVED" : "REJECTED";

  const reasoning = eligible
    ? sufficientBalance
      ? `Approved: sufficient balance (${balance.remainingDays} remaining day(s)) under policy "${policy.name}" v${policy.version} for the ${daysRequested}-day request.`
      : `Rejected: insufficient balance (${balance.remainingDays} remaining day(s)) under policy "${policy.name}" v${policy.version} for the ${daysRequested}-day request.`
    : `Rejected: employee is not eligible under policy "${policy.name}" v${policy.version} (eligible group: ${policy.eligibleGroup}).`;

  return {
    triggerEvent: "LEAVE_REQUEST_EVALUATED",
    policyVersionId: policy.id,
    rulesEvaluated: rules,
    inputs: {
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      policyId: policy.id,
      policyName: policy.name,
      policyVersion: policy.version,
      requestStartDate: requestStartDate.toISOString(),
      requestEndDate: requestEndDate.toISOString(),
      daysRequested,
      computedDaySpan: daysBetweenInclusive(requestStartDate, requestEndDate),
      balanceBeforeDecision: balance,
    },
    outcome,
    reasoning,
  };
}
