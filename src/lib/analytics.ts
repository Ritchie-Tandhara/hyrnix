import { prisma } from "./prisma";
import { toEmployeeLite, toLeaveRequestLite, toPolicyLite } from "./mappers";
import { selectPolicyVersionForDate } from "./policyVersion";
import { calculateBalance } from "./balance";

export type AnalyticsData = {
  kpis: {
    headcount: number;
    approvalRatePct: number | null;
    avgDaysRequested: number | null;
    avgRemainingBalance: number | null;
    publishedPolicies: number;
    pendingApprovalPolicies: number;
    iqResolutionRatePct: number | null;
  };
  requestsByStatus: { status: "APPROVED" | "REJECTED" | "PENDING"; count: number }[];
  headcountByDepartment: { department: string; count: number }[];
  requestsByMonth: { label: string; count: number }[];
  iqIntentBreakdown: { intent: string; count: number }[];
};

const MONTH_LABEL = new Intl.DateTimeFormat("en", { month: "short" });

export async function getAnalytics(): Promise<AnalyticsData> {
  const [employeeRows, leaveRequestRows, policyRows, hyrnixQueries] = await Promise.all([
    prisma.employee.findMany(),
    prisma.leaveRequest.findMany(),
    prisma.leavePolicy.findMany(),
    prisma.hyrnixQuery.findMany(),
  ]);

  const employees = employeeRows.map(toEmployeeLite);
  const leaveRequests = leaveRequestRows.map(toLeaveRequestLite);
  const policies = policyRows.map(toPolicyLite);
  const publishedPolicies = policies.filter((p) => p.status === "PUBLISHED");

  // --- KPIs ---
  const approved = leaveRequests.filter((r) => r.status === "APPROVED").length;
  const rejected = leaveRequests.filter((r) => r.status === "REJECTED").length;
  const decided = approved + rejected;
  const approvalRatePct = decided > 0 ? (approved / decided) * 100 : null;

  const avgDaysRequested =
    leaveRequests.length > 0
      ? leaveRequests.reduce((sum, r) => sum + r.daysRequested, 0) / leaveRequests.length
      : null;

  const asOfDate = new Date();
  const remainingBalances: number[] = [];
  for (const employee of employees) {
    const policy = selectPolicyVersionForDate(publishedPolicies, employee, asOfDate);
    if (!policy) continue;
    const balance = calculateBalance(employee, policy, leaveRequests, asOfDate);
    remainingBalances.push(balance.remainingDays);
  }
  const avgRemainingBalance =
    remainingBalances.length > 0
      ? remainingBalances.reduce((sum, v) => sum + v, 0) / remainingBalances.length
      : null;

  const recognizedQueries = hyrnixQueries.filter((q) => q.matchedIntent !== "UNRECOGNIZED").length;
  const iqResolutionRatePct =
    hyrnixQueries.length > 0 ? (recognizedQueries / hyrnixQueries.length) * 100 : null;

  // --- Requests by status ---
  const requestsByStatus = (["APPROVED", "REJECTED", "PENDING"] as const).map((status) => ({
    status,
    count: leaveRequests.filter((r) => r.status === status).length,
  }));

  // --- Headcount by department ---
  const deptCounts = new Map<string, number>();
  for (const e of employees) {
    deptCounts.set(e.department, (deptCounts.get(e.department) ?? 0) + 1);
  }
  const headcountByDepartment = [...deptCounts.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  // --- Requests by month (last 6 months, oldest first) ---
  const months: { year: number; month: number; label: string }[] = [];
  const cursor = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABEL.format(d) });
  }
  const requestsByMonth = months.map(({ year, month, label }) => ({
    label,
    count: leaveRequests.filter((r) => r.startDate.getFullYear() === year && r.startDate.getMonth() === month)
      .length,
  }));

  // --- HYRNIX IQ intent breakdown ---
  const intentCounts = new Map<string, number>();
  for (const q of hyrnixQueries) {
    intentCounts.set(q.matchedIntent, (intentCounts.get(q.matchedIntent) ?? 0) + 1);
  }
  const iqIntentBreakdown = [...intentCounts.entries()]
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count);

  return {
    kpis: {
      headcount: employees.length,
      approvalRatePct,
      avgDaysRequested,
      avgRemainingBalance,
      publishedPolicies: publishedPolicies.length,
      pendingApprovalPolicies: policies.filter((p) => p.status === "PENDING_APPROVAL").length,
      iqResolutionRatePct,
    },
    requestsByStatus,
    headcountByDepartment,
    requestsByMonth,
    iqIntentBreakdown,
  };
}
