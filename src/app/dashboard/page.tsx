import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { VerifyButton } from '@/components/VerifyButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const bidders = await prisma.bidder.findMany({
    include: {
      tender: true,
      scores: { orderBy: { computedAt: 'desc' }, take: 1 },
      decisions: { orderBy: { decidedAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  });

  const tender = bidders[0]?.tender;

  if (bidders.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold">No bidders loaded</h2>
        <p className="mt-1 text-sm text-slate-600">
          Run <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run seed</code> to load the demo tender and
          bidders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tender && (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tender.referenceNo}</p>
          <h2 className="text-lg font-semibold">{tender.title}</h2>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Bidder</th>
              <th className="px-4 py-3">Compliance Score</th>
              <th className="px-4 py-3">Risk Level</th>
              <th className="px-4 py-3">PO Decision</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {bidders.map((bidder) => {
              const latestScore = bidder.scores[0];
              const latestDecision = bidder.decisions[0];
              return (
                <tr key={bidder.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/bidders/${bidder.id}`} className="font-medium text-slate-900 hover:underline">
                      {bidder.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={latestScore?.complianceScore ?? null} />
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={latestScore?.riskLevel ?? null} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{latestDecision ? latestDecision.outcome : 'Pending'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <VerifyButton bidderId={bidder.id} label={latestScore ? 'Re-verify' : 'Run Verification'} />
                      <Link href={`/bidders/${bidder.id}`} className="text-sm font-medium text-slate-600 hover:underline">
                        Details →
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
