export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="h-10 bg-slate-100" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t px-4 py-3.5">
            <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
            <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-8 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Loading tenders…</p>
    </div>
  );
}
