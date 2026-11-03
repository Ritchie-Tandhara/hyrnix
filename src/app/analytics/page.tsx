import { getAnalytics } from "@/lib/analytics";
import { BarChart } from "@/components/charts/BarChart";
import { StatusBreakdown } from "@/components/charts/StatusBreakdown";
import { SplitBar } from "@/components/charts/SplitBar";
import { Users, CheckCircle2, CalendarRange, Wallet, FileCheck2, Sparkles, type LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

type Accent = "primary" | "accent" | "success" | "warning" | "danger";

const ACCENT_CLASSES: Record<Accent, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: Accent;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}>
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function fmtPct(v: number | null) {
  return v === null ? "—" : `${Math.round(v)}%`;
}

function fmtDays(v: number | null) {
  return v === null ? "—" : `${v.toFixed(1)}d`;
}

export default async function AnalyticsPage() {
  const data = await getAnalytics();
  const { kpis } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Workforce and leave-program health at a glance — computed live from the same data Policy Lab and
          Process X-Ray use.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Headcount" value={String(kpis.headcount)} icon={Users} accent="primary" />
        <KpiCard
          label="Approval rate"
          value={fmtPct(kpis.approvalRatePct)}
          icon={CheckCircle2}
          accent="success"
          hint="Approved ÷ (approved + rejected)"
        />
        <KpiCard
          label="Avg. days requested"
          value={fmtDays(kpis.avgDaysRequested)}
          icon={CalendarRange}
          accent="accent"
          hint="Per leave request"
        />
        <KpiCard
          label="Avg. remaining balance"
          value={fmtDays(kpis.avgRemainingBalance)}
          icon={Wallet}
          accent="warning"
          hint="Across employees with a published policy"
        />
        <KpiCard
          label="Published / pending policies"
          value={`${kpis.publishedPolicies} / ${kpis.pendingApprovalPolicies}`}
          icon={FileCheck2}
          accent="primary"
        />
        <KpiCard
          label="HYRNIX IQ resolution rate"
          value={fmtPct(kpis.iqResolutionRatePct)}
          icon={Sparkles}
          accent="accent"
          hint="Questions matched to a real answer"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-foreground">Headcount by department</h2>
          <BarChart data={data.headcountByDepartment.map((d) => ({ label: d.department, value: d.count }))} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-foreground">Leave requests — last 6 months</h2>
          <BarChart data={data.requestsByMonth.map((d) => ({ label: d.label, value: d.count }))} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-foreground">Leave requests by status</h2>
          <StatusBreakdown data={data.requestsByStatus} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-medium text-foreground">HYRNIX IQ — questions handled</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Recognized questions are answered from live Policy Lab / Process X-Ray data; unrecognized ones get an
            explicit fallback, never a guess.
          </p>
          {data.iqIntentBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No HYRNIX IQ questions asked yet.</p>
          ) : (
            <SplitBar
              segments={data.iqIntentBreakdown.map((i) => ({
                label: i.intent === "UNRECOGNIZED" ? "Unrecognized" : i.intent.replace(/_/g, " "),
                value: i.count,
                className: i.intent === "UNRECOGNIZED" ? "bg-warning" : "bg-success",
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
