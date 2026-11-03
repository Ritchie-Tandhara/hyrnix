import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getData() {
  const [auditLogs, hyrnixQueries] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 100, include: { actor: true } }),
    prisma.hyrnixQuery.findMany({ orderBy: { timestamp: "desc" }, take: 100, include: { askedBy: true } }),
  ]);
  return { auditLogs, hyrnixQueries };
}

export default async function AdministrationPage() {
  const { auditLogs, hyrnixQueries } = await getData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <p className="mt-1 text-slate-600">Full system audit trail: policy lifecycle events and HYRNIX IQ queries.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ComingSoon title="PeopleOps Radar" />
        <ComingSoon title="Payroll / Recruitment / Performance" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Audit log</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Entity</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Actor</th>
              <th className="py-2 pr-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-4 text-slate-400">{a.timestamp.toLocaleString()}</td>
                <td className="py-2 pr-4">
                  {a.entityType} <span className="text-slate-400">#{a.entityId.slice(0, 8)}</span>
                </td>
                <td className="py-2 pr-4 font-medium">{a.action}</td>
                <td className="py-2 pr-4">{a.actor.name}</td>
                <td className="max-w-md truncate py-2 pr-4 font-mono text-xs text-slate-500">{a.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium text-slate-900">HYRNIX IQ query log</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Asked by</th>
              <th className="py-2 pr-4">Question</th>
              <th className="py-2 pr-4">Intent</th>
              <th className="py-2 pr-4">Tool used</th>
            </tr>
          </thead>
          <tbody>
            {hyrnixQueries.map((q) => (
              <tr key={q.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-4 text-slate-400">{q.timestamp.toLocaleString()}</td>
                <td className="py-2 pr-4">{q.askedBy?.name ?? "—"}</td>
                <td className="max-w-sm py-2 pr-4">{q.question}</td>
                <td className="py-2 pr-4">{q.matchedIntent}</td>
                <td className="py-2 pr-4 font-mono text-xs">{q.toolUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-slate-400">
      <div className="font-medium">{title}</div>
      <div className="text-sm">Coming soon — see ROADMAP.md for planned phases.</div>
    </div>
  );
}
