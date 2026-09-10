/**
 * Hand-rolled SVG ring (stroke-dasharray, no chart library) showing the real
 * LOW / MEDIUM / HIGH split of the latest Score per bidder. Colours are the
 * `risk.*` theme tokens. Degrades to a "nothing verified yet" state.
 */
export function RiskDonut({ low, medium, high }: { low: number; medium: number; high: number }) {
  const total = low + medium + high;
  const r = 16;
  const C = 2 * Math.PI * r;

  const segments =
    total === 0
      ? []
      : ([
          { v: low, cls: 'stroke-risk-low' },
          { v: medium, cls: 'stroke-risk-medium' },
          { v: high, cls: 'stroke-risk-high' },
        ] as const);

  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 40 40" className="h-24 w-24 -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" className="stroke-slate-200" strokeWidth="6" />
          {segments.map((s, i) => {
            const len = total === 0 ? 0 : (s.v / total) * C;
            const node = (
              <circle
                key={i}
                cx="20"
                cy="20"
                r={r}
                fill="none"
                className={s.cls}
                strokeWidth="6"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return node;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold leading-none text-slate-900">{total}</span>
          <span className="text-[10px] text-slate-400">scored</span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        {(
          [
            ['LOW', low, 'bg-risk-low'],
            ['MEDIUM', medium, 'bg-risk-medium'],
            ['HIGH', high, 'bg-risk-high'],
          ] as const
        ).map(([label, v, dot]) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
            <span className="w-16 font-medium text-slate-600">{label}</span>
            <span className="tabular-nums text-slate-900">{v}</span>
            <span className="text-slate-400">{total === 0 ? '' : `(${Math.round((v / total) * 100)}%)`}</span>
          </div>
        ))}
        {total === 0 && <p className="pt-1 text-slate-400">No bidders verified yet — run verification on a tender.</p>}
      </div>
    </div>
  );
}
