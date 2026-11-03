import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import { Users, CheckCircle2, GitBranch, Clock, CalendarDays, FlaskConical, type LucideIcon } from "lucide-react";

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

type Accent = "primary" | "accent" | "success" | "warning" | "danger";

const ACCENT_CLASSES: Record<Accent, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
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
                    <td className="py-3 pr-4">{r.daysRequested}</td>
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
