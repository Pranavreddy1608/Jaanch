const styles: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-red-100 text-red-800',
};

export function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">-</span>;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[level] ?? 'bg-slate-200 text-slate-700'}`}>{level} RISK</span>;
}
