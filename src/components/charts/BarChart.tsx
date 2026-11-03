type Datum = { label: string; value: number };

/**
 * Simple single-hue magnitude bar chart (ranking/comparison across one
 * dimension, no extra categorical meaning per bar — so one consistent hue,
 * not a rainbow). Direct value labels since category counts here are small.
 */
export function BarChart({ data, height = 176 }: { data: Datum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3" style={{ height }}>
        {data.map((d) => {
          const pct = Math.round((d.value / max) * 100);
          return (
            <div
              key={d.label}
              title={`${d.label}: ${d.value}`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="text-xs font-medium text-foreground">{d.value}</span>
              <div
                className="w-full max-w-12 rounded-t-md bg-primary transition-[height]"
                style={{ height: `${d.value > 0 ? Math.max(pct, 3) : 0}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-3">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center text-xs text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
