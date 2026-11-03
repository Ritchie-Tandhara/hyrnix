export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: "bg-emerald-100 text-emerald-700",
    PUBLISHED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-rose-100 text-rose-700",
    PENDING: "bg-amber-100 text-amber-700",
    PENDING_APPROVAL: "bg-amber-100 text-amber-700",
    DRAFT: "bg-slate-100 text-slate-600",
    SIMULATED: "bg-sky-100 text-sky-700",
    ARCHIVED: "bg-slate-200 text-slate-500",
  };
  const color = map[status] ?? "bg-slate-100 text-slate-600";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
}
