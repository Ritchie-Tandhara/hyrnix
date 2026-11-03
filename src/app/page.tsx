import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";

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

export default async function OverviewPage() {
  const stats = await getStats();

  const cards = [
    { label: "Employees", value: stats.employeeCount, href: "/people" },
    { label: "Published policies", value: stats.publishedPolicyCount, href: "/policy-lab" },
    { label: "Policy versions (all)", value: stats.policyCount, href: "/policy-lab" },
    { label: "Pending approval", value: stats.pendingApprovalCount, href: "/policy-lab" },
    { label: "Leave requests", value: stats.leaveRequestCount, href: "/process-xray" },
    { label: "Simulation runs", value: stats.simulationCount, href: "/policy-lab" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          HYRNIX is an AI-native People Operations decision and automation platform. This is the P0 slice:
          leave policy simulation (Policy Lab), decision traceability (Process X-Ray), and a deterministic
          natural-language assistant (HYRNIX IQ) — all backed by the same live data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="text-2xl font-semibold text-slate-900">{c.value}</div>
            <div className="text-sm text-slate-500">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Recent leave requests</h2>
        {stats.recentRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No leave requests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Dates</th>
                <th className="py-2 pr-4">Days</th>
                <th className="py-2 pr-4">Policy version</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentRequests.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{r.employee.name}</td>
                  <td className="py-2 pr-4 text-slate-500">
                    {r.startDate.toISOString().slice(0, 10)} → {r.endDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2 pr-4">{r.daysRequested}</td>
                  <td className="py-2 pr-4">
                    {r.policyVersion.name} v{r.policyVersion.version}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3">
          <Link href="/process-xray" className="text-sm font-medium text-slate-900 underline">
            Open Process X-Ray →
          </Link>
        </div>
      </div>
    </div>
  );
}
