import { CheckCircle2, XCircle, Clock, type LucideIcon } from "lucide-react";

type Row = { status: "APPROVED" | "REJECTED" | "PENDING"; count: number };

const CONFIG: Record<Row["status"], { label: string; icon: LucideIcon; bar: string; chip: string }> = {
  APPROVED: { label: "Approved", icon: CheckCircle2, bar: "bg-success", chip: "bg-success-soft text-success" },
  REJECTED: { label: "Rejected", icon: XCircle, bar: "bg-danger", chip: "bg-danger-soft text-danger" },
  PENDING: { label: "Pending", icon: Clock, bar: "bg-warning", chip: "bg-warning-soft text-warning" },
};

/** Status colors are reserved and always shipped with an icon + label, never color alone. */
export function StatusBreakdown({ data }: { data: Row[] }) {
  const total = Math.max(1, data.reduce((sum, r) => sum + r.count, 0));

  return (
    <div className="space-y-3">
      {data.map((r) => {
        const cfg = CONFIG[r.status];
        const Icon = cfg.icon;
        const pct = Math.round((r.count / total) * 100);
        return (
          <div key={r.status} className="flex items-center gap-3">
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${cfg.chip}`}>
              <Icon size={14} strokeWidth={2.5} />
            </span>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{cfg.label}</span>
                <span className="text-muted-foreground">{r.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
