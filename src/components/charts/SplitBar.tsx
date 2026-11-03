type Segment = { label: string; value: number; className: string };

/** Part-to-whole share for a small, fixed set of categories. Always legended. */
export function SplitBar({ segments }: { segments: Segment[] }) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + s.value, 0));

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-muted">
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={s.label}
              title={`${s.label}: ${s.value}`}
              className={`${s.className} ${i > 0 ? "ml-0.5" : ""} h-full`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${s.className}`} />
            <span className="text-foreground">{s.label}</span>
            <span className="text-muted-foreground">({s.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
