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

  const bidClosed = tender?.bidEndsAt ? tender.bidEndsAt.getTime() < Date.now() : false;

  return (
    <div className="space-y-6">
      {tender && (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tender.referenceNo}</p>
              <h2 className="text-lg font-semibold">{tender.title}</h2>
              <p className="text-xs text-slate-500">
                {tender.organization} · {tender.department}
              </p>
            </div>
            {tender.bidEndsAt && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  bidClosed ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-800'
                }`}
              >
                {bidClosed ? 'Bid closed' : 'Bid open'} · closes{' '}
                {tender.bidEndsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 border-t pt-3 text-xs text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-400">Category</dt>
              <dd>{tender.category}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-400">EMD</dt>
              <dd>{tender.emdRequired ? 'Required' : 'Not required for this tender'}</dd>
            </div>
            {tender.mseNote && (
              <div className="sm:col-span-2">
                <dt className="font-medium text-slate-400">MSE / Startup</dt>
                <dd>{tender.mseNote}</dd>
              </div>
            )}
            {tender.miiNote && (
              <div className="sm:col-span-2">
                <dt className="font-medium text-slate-400">Make in India</dt>
                <dd>{tender.miiNote}</dd>
              </div>
            )}
          </dl>
          <p className="mt-2 text-[11px] text-slate-400">
            Real, independently verifiable GeM bid. Bidders below are synthetic.
          </p>
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
