export default function BidderLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-28 animate-pulse rounded-lg border bg-white" />
      <div className="h-24 animate-pulse rounded-lg border bg-white" />
      <div className="space-y-2 rounded-lg border bg-white p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
      <p className="text-xs text-slate-400">Loading bidder…</p>
    </div>
  );
}
