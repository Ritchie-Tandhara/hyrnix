export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: "bg-success-soft text-success",
    PUBLISHED: "bg-success-soft text-success",
    REJECTED: "bg-danger-soft text-danger",
    PENDING: "bg-warning-soft text-warning",
    PENDING_APPROVAL: "bg-warning-soft text-warning",
    DRAFT: "bg-surface-muted text-muted-foreground",
    SIMULATED: "bg-accent-soft text-accent",
    ARCHIVED: "bg-surface-muted text-muted-foreground",
  };
  const color = map[status] ?? "bg-surface-muted text-muted-foreground";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{status}</span>;
}
