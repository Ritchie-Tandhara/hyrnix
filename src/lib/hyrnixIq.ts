// Deterministic, rule-based "NLU" for HYRNIX IQ. No external AI calls.
//
// This is intentionally simple keyword + regex entity extraction over a
// FIXED set of supported question patterns. Anything that doesn't match one
// of these patterns gets an explicit "I can't answer that" fallback that
// lists what IS supported — never a fabricated answer.
import { prisma } from "./prisma";
import { explainLeaveDecisionTool, simulatePolicyChangeTool } from "./iqTools";
import { lookupCaller } from "./authz";
import { isAdminOrHr } from "./roles";

export type HyrnixIqAnswer = {
  intent: "WHY_LEAVE_DECISION" | "SIMULATE_POLICY_CHANGE" | "UNRECOGNIZED" | "ACCESS_DENIED";
  toolUsed: string;
  message: string;
  data?: unknown;
};

const SUPPORTED_QUESTIONS = [
  `"Why was <employee name>'s leave request rejected/approved?"`,
  `"What would happen if I increased <policy name>'s annual leave from <X> to <Y>?"`,
];

function fallback(): HyrnixIqAnswer {
  return {
    intent: "UNRECOGNIZED",
    toolUsed: "none",
    message:
      "I don't have a way to answer that yet. Right now I can only answer:\n" +
      SUPPORTED_QUESTIONS.map((q) => `- ${q}`).join("\n"),
  };
}

const WHY_DECISION_RE =
  /why\s+was\s+(.+?)'?s?\s+leave\s+request\s+(?:rejected|approved|denied)/i;
const REQUEST_ID_RE = /\b(?:request\s*(?:id)?\s*[:#]?\s*)?([a-z0-9]{10,})\b/i;
const STATUS_RE = /(rejected|denied|approved)/i;

const SIMULATE_RE =
  /what\s+would\s+happen\s+if\s+(?:i\s+)?(?:increase[d]?|change[d]?|set)\s+(.+?)'?s?\s+annual\s+leave\s+from\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i;

export async function askHyrnixIq(question: string, askedById?: string): Promise<HyrnixIqAnswer> {
  const trimmed = question.trim();
  let answer: HyrnixIqAnswer;

  const caller = await lookupCaller(askedById);
  const callerIsAdmin = isAdminOrHr(caller?.role);

  const simulateMatch = trimmed.match(SIMULATE_RE);
  const whyMatch = trimmed.match(WHY_DECISION_RE);

  if (simulateMatch) {
    if (caller && !callerIsAdmin) {
      answer = {
        intent: "ACCESS_DENIED",
        toolUsed: "none",
        message:
          "Policy simulations show company-wide, cross-employee data, so they're only available to Admin and HR users. Ask me about your own leave requests instead.",
      };
    } else {
      const [, policyNameQuery, , toDays] = simulateMatch;
      const toolResult = await simulatePolicyChangeTool.run({
        policyNameQuery: policyNameQuery.trim(),
        newEntitlementDays: Number(toDays),
      });

      const message = !toolResult.found
        ? toolResult.reason
        : `If "${toolResult.policyName}" changed from ${toolResult.fromEntitlementDays} to ${toolResult.toEntitlementDays} days/year: ${toolResult.result.affectedEmployeeCount} employee(s) would be affected, with a total entitlement change of ${toolResult.result.totalEntitlementDelta >= 0 ? "+" : ""}${toolResult.result.totalEntitlementDelta} day(s) across them.${toolResult.result.conflicts.length > 0 ? ` Warning: ${toolResult.result.conflicts.length} conflict(s) detected with other active policies.` : ""}`;

      answer = {
        intent: "SIMULATE_POLICY_CHANGE",
        toolUsed: simulatePolicyChangeTool.name,
        message,
        data: toolResult,
      };
    }
  } else if (whyMatch) {
    const subject = whyMatch[1].trim();
    const statusMatch = trimmed.match(STATUS_RE);
    const statusFilter = statusMatch
      ? (statusMatch[1].toUpperCase() === "APPROVED" ? "APPROVED" : "REJECTED")
      : undefined;

    // If the "subject" looks like a leave request id rather than a name, look it up directly.
    const looksLikeId = /^[a-z0-9]{15,}$/i.test(subject.replace(/\s/g, ""));
    const idGuess = looksLikeId ? subject.replace(/\s/g, "") : trimmed.match(REQUEST_ID_RE)?.[1];

    const toolResult = await explainLeaveDecisionTool.run(
      looksLikeId
        ? { leaveRequestId: idGuess, statusFilter }
        : { employeeNameQuery: subject, statusFilter }
    );

    if (toolResult.found && caller && !callerIsAdmin && toolResult.employeeId !== caller.id) {
      answer = {
        intent: "ACCESS_DENIED",
        toolUsed: explainLeaveDecisionTool.name,
        message: "You can only ask about your own leave requests, not a colleague's.",
      };
    } else {
      const message = !toolResult.found
        ? toolResult.reason
        : `${toolResult.employeeName}'s leave request (${toolResult.leaveRequestId}) was ${toolResult.status} under policy "${toolResult.policyName}" v${toolResult.policyVersion}. ${toolResult.reasoning}`;

      answer = {
        intent: "WHY_LEAVE_DECISION",
        toolUsed: explainLeaveDecisionTool.name,
        message,
        data: toolResult,
      };
    }
  } else {
    answer = fallback();
  }

  await prisma.hyrnixQuery.create({
    data: {
      question: trimmed,
      matchedIntent: answer.intent,
      toolUsed: answer.toolUsed,
      resultSummary: JSON.stringify(answer.data ?? { message: answer.message }),
      askedById,
    },
  });

  return answer;
}

export function supportedQuestionPatterns(): string[] {
  return SUPPORTED_QUESTIONS;
}
