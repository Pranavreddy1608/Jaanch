/**
 * KPI stat card — icon chip top-left, optional small badge top-right, big
 * number, label below. Pure presentational; every number passed in is
 * computed from Prisma in the page that renders this (see dashboard/page.tsx).
 */
export function StatCard({
  icon,
  value,
  label,
  badge,
  badgeTone = 'slate',
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  badge?: string;
  badgeTone?: 'slate' | 'green' | 'amber' | 'saffron';
}) {
  const badgeStyles: Record<string, string> = {
    slate: 'badge-neutral',
    green: 'badge-success',
    amber: 'badge-warning',
    saffron: 'badge-warning',
  };
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-navy/10 text-navy">{icon}</span>
        {badge && <span className={`badge ${badgeStyles[badgeTone]}`}>{badge}</span>}
      </div>
      <div>
        <div className="font-heading text-h2 font-semibold leading-none text-navy">{value}</div>
        <div className="mt-1.5 text-xs text-ink-muted">{label}</div>
      </div>
    </div>
  );
}
