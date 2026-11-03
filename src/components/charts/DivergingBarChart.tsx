type Datum = { label: string; value: number };

/**
 * Polarity chart (increase vs. decrease around a zero baseline) — a
 * diverging pair of hues, not a rainbow, with a neutral baseline and a
 * legend since there are two series (positive / negative).
 */
export function DivergingBarChart({ data, height = 160 }: { data: Datum[]; height?: number }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No simulations run yet.</p>;
  }

  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const half = height / 2;

  return (
    <div>
      <div className="relative flex items-stretch justify-between gap-2" style={{ height }}>
        <div className="pointer-events-none absolute left-0 right-0 border-t border-border" style={{ top: half }} />
        {data.map((d, i) => {
          const barHeight = d.value === 0 ? 0 : Math.max(3, Math.round((Math.abs(d.value) / maxAbs) * (half - 8)));
          const positive = d.value >= 0;
          return (
            <div key={`${d.label}-${i}`} className="relative flex-1" title={`${d.label}: ${d.value > 0 ? "+" : ""}${d.value} days`}>
              <div
                className={`absolute left-1/2 w-full max-w-9 -translate-x-1/2 ${
                  positive ? "rounded-t-md bg-success" : "rounded-b-md bg-danger"
                }`}
                style={{ height: barHeight, top: positive ? half - barHeight : half }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {data.map((d, i) => (
          <span key={`${d.label}-${i}`} className="flex-1 truncate text-center text-xs text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          <span className="text-foreground">Increase</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" />
          <span className="text-foreground">Decrease</span>
        </div>
      </div>
    </div>
  );
}
