import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import { getActingEmployee } from "@/lib/actingUserServer";
import { isAdminOrHr } from "@/lib/roles";
import { listAvailableLeaveTypesForEmployee } from "@/lib/policyService";
import { calculateBalance } from "@/lib/balance";
import { toEmployeeLite, toLeaveRequestLite } from "@/lib/mappers";
import type { Employee } from "@prisma/client";
import {
  Users,
  CheckCircle2,
  GitBranch,
  Clock,
  CalendarDays,
  FlaskConical,
  Wallet,
  CalendarCheck2,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [employeeCount, policyCount, publishedPolicyCount, leaveRequestCount, pendingApprovalCount, simulationCount] =
    await Promise.all([
      prisma.employee.count(),
      prisma.leavePolicy.count(),
      prisma.leavePolicy.count({ where: { status: "PUBLISHED" } }),
      prisma.leaveRequest.count(),
      prisma.leavePolicy.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.simulationRun.count(),
    ]);

  const recentRequests = await prisma.leaveRequest.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { employee: true, policyVersion: true },
  });

  return {
    employeeCount,
    policyCount,
    publishedPolicyCount,
    leaveRequestCount,
    pendingApprovalCount,
    simulationCount,
    recentRequests,
  };
}

async function getMyOverview(employeeRow: Employee) {
  const asOfDate = new Date();
  const [leaveTypePolicies, myRequestRows, allMyRequestRows] = await Promise.all([
    listAvailableLeaveTypesForEmployee(employeeRow.id, asOfDate),
    prisma.leaveRequest.findMany({
      where: { employeeId: employeeRow.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { policyVersion: true },
    }),
    prisma.leaveRequest.findMany({ where: { employeeId: employeeRow.id } }),
  ]);

  const employee = toEmployeeLite(employeeRow);
  const leaveRequests = allMyRequestRows.map(toLeaveRequestLite);

  const leaveTypes = leaveTypePolicies.map((policy) => ({
    policy,
    balance: calculateBalance(employee, policy, leaveRequests, asOfDate),
  }));

  const [pendingCount, approvedCount] = await Promise.all([
    prisma.leaveRequest.count({ where: { employeeId: employeeRow.id, status: "PENDING" } }),
    prisma.leaveRequest.count({ where: { employeeId: employeeRow.id, status: "APPROVED" } }),
  ]);

  return { leaveTypes, myRequests: myRequestRows, pendingCount, approvedCount };
}

type Accent = "primary" | "accent" | "success" | "warning" | "danger";

const ACCENT_CLASSES: Record<Accent, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  href: string;
  icon: LucideIcon;
  accent: Accent;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}>
        <Icon size={20} strokeWidth={2} />
      </span>
      <div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}

export default async function OverviewPage() {
  const actingEmployee = await getActingEmployee();

  // Non-admin/HR actors get a personalized "my leave" view instead of
  // company-wide numbers (headcount, aggregate policy/simulation counts,
  // everyone's recent requests), which aren't theirs to see.
  if (actingEmployee && !isAdminOrHr(actingEmployee.role)) {
    const my = await getMyOverview(actingEmployee);
    const totalRemaining = my.leaveTypes.reduce((sum, t) => sum + t.balance.remainingDays, 0);

    const myCards: Array<{ label: string; value: string; href: string; icon: LucideIcon; accent: Accent }> = [
      {
        label: "Total leave remaining",
        value: my.leaveTypes.length > 0 ? `${totalRemaining}d` : "—",
        href: "/process-xray",
        icon: Wallet,
        accent: "primary",
      },
      {
        label: "Approved this year",
        value: String(my.approvedCount),
        href: "/process-xray",
        icon: CheckCircle2,
        accent: "success",
      },
      {
        label: "Pending requests",
        value: String(my.pendingCount),
        href: "/process-xray",
        icon: Clock,
        accent: "warning",
      },
    ];

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Welcome, {actingEmployee.name.split(" ")[0]}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Your leave balance and recent requests. Ask HYRNIX IQ why a request was decided, or submit a new one
            from Process X-Ray.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {myCards.map((c) => (
            <StatCard key={c.label} label={c.label} value={c.value} href={c.href} icon={c.icon} accent={c.accent} />
          ))}
        </div>

        {my.leaveTypes.length > 0 && (
          <div className="space-y-4">
            {my.leaveTypes.map(({ policy, balance }) => (
              <div key={policy.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-foreground">
                  <CalendarCheck2 size={18} className="text-primary" /> {policy.name} v{policy.version}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Entitlement" value={`${balance.entitlementDays}d`} />
                  <Field label="Accrued so far" value={`${balance.accruedDays}d`} />
                  <Field label="Used" value={`${balance.usedDays}d`} />
                  <Field label="Remaining" value={`${balance.remainingDays}d`} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-foreground">Your recent leave requests</h2>
          {my.myRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t submitted a leave request yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Dates</th>
                    <th className="py-2 pr-4 font-medium">Days</th>
                    <th className="py-2 pr-4 font-medium">Policy version</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {my.myRequests.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {r.startDate.toISOString().slice(0, 10)} → {r.endDate.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3 pr-4">
                        {r.daysRequested}
                        {r.halfDay && <span className="ml-1 text-xs text-muted-foreground">(half day)</span>}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {r.policyVersion.name} v{r.policyVersion.version}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4">
            <Link href="/process-xray" className="text-sm font-medium text-primary hover:underline">
              Open Process X-Ray →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stats = await getStats();

  const cards: Array<{ label: string; value: number; href: string; icon: LucideIcon; accent: Accent }> = [
    { label: "Employees", value: stats.employeeCount, href: "/people", icon: Users, accent: "primary" },
    {
      label: "Published policies",
      value: stats.publishedPolicyCount,
      href: "/policy-lab",
      icon: CheckCircle2,
      accent: "success",
    },
    { label: "Policy versions (all)", value: stats.policyCount, href: "/policy-lab", icon: GitBranch, accent: "accent" },
    { label: "Pending approval", value: stats.pendingApprovalCount, href: "/policy-lab", icon: Clock, accent: "warning" },
    { label: "Leave requests", value: stats.leaveRequestCount, href: "/process-xray", icon: CalendarDays, accent: "danger" },
    { label: "Simulation runs", value: stats.simulationCount, href: "/policy-lab", icon: FlaskConical, accent: "primary" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Overview</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          HYRNIX is an AI-native People Operations decision and automation platform. This is the P0 slice:
          leave policy simulation (Policy Lab), decision traceability (Process X-Ray), and a deterministic
          natural-language assistant (HYRNIX IQ) — all backed by the same live data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-foreground">Recent leave requests</h2>
        {stats.recentRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Employee</th>
                  <th className="py-2 pr-4 font-medium">Dates</th>
                  <th className="py-2 pr-4 font-medium">Days</th>
                  <th className="py-2 pr-4 font-medium">Policy version</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRequests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{r.employee.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {r.startDate.toISOString().slice(0, 10)} → {r.endDate.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 pr-4">
                      {r.daysRequested}
                      {r.halfDay && <span className="ml-1 text-xs text-muted-foreground">(half day)</span>}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {r.policyVersion.name} v{r.policyVersion.version}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <Link href="/process-xray" className="text-sm font-medium text-primary hover:underline">
            Open Process X-Ray →
          </Link>
        </div>
      </div>
    </div>
  );
}
