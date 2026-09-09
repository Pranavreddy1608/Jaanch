import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { VerifyButton } from '@/components/VerifyButton';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function TenderDetailPage({ params }: { params: { id: string } }) {
  const tender = await prisma.tender.findUnique({
    where: { id: params.id },
    include: {
      bidders: {
        orderBy: { createdAt: 'asc' },
        include: {
          scores: { orderBy: { computedAt: 'desc' }, take: 1 },
          decisions: { orderBy: { decidedAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  if (!tender) notFound();

  const bidClosed = tender.bidEndsAt ? tender.bidEndsAt.getTime() < Date.now() : false;

  // Running verification is Procurement Officer only (enforced server-side in
  // src/lib/actions.ts); a Viewer sees the bidder table read-only.
  const canAct = getSession()?.role === 'officer';
  const viewerNote = 'Read-only — only a Procurement Officer can run verification.';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-chakra hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="card">
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
            <dt className="font-medium text-slate-400">EMD / ePBG</dt>
            <dd>{tender.emdNote ?? (tender.emdRequired ? 'Required' : 'Not required for this tender')}</dd>
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
          Real, independently verifiable GeM bid ({tender.referenceNo}). Bidders below are synthetic.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
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
            {tender.bidders.map((bidder) => {
              const latestScore = bidder.scores[0];
              const latestDecision = bidder.decisions[0];
              return (
                <tr key={bidder.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/bidders/${bidder.id}`} className="font-medium text-slate-900 hover:text-chakra hover:underline">
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
                      <VerifyButton
                        bidderId={bidder.id}
                        label={latestScore ? 'Re-verify' : 'Run Verification'}
                        disabledReason={canAct ? undefined : viewerNote}
                        compact
                      />
                      <Link href={`/bidders/${bidder.id}`} className="text-sm font-medium text-slate-600 hover:text-chakra hover:underline">
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
