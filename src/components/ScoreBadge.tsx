export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">Not yet verified</span>;
  }
  return <span className="rounded-full bg-chakra px-2.5 py-0.5 text-xs font-semibold text-white">{score}/100</span>;
}
