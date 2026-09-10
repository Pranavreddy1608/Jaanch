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
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    saffron: 'bg-saffron-700/10 text-saffron-700',
  };
  return (
    <div className="card flex flex-col gap-2.5">
      <div className="flex items-start justify-between">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-chakra/10 text-chakra">
          {icon}
        </span>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeStyles[badgeTone]}`}>{badge}</span>
        )}
      </div>
      <div>
        <div className="text-2xl font-semibold leading-none text-slate-900">{value}</div>
        <div className="mt-1.5 text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
