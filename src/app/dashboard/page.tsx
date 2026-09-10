import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { StatCard } from '@/components/StatCard';
import { RiskDonut } from '@/components/RiskDonut';
import { TenderList, type TenderRow } from '@/components/TenderList';
import { GridIcon, UsersIcon, ShieldCheckIcon, FileIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default async function DashboardPage() {
  const session = getSession();
  const isBidder = session?.role === 'bidder';
  const companySlug = isBidder ? session!.companySlug : undefined;

  // A bidder only ever sees tenders they are actually registered on - filter
  // on the query itself, not a UI hide.
  const tenders = await prisma.tender.findMany({
    where: isBidder ? { bidders: { some: { companySlug } } } : undefined,
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { bidders: true } } },
  });

  const companyName = isBidder
    ? (await prisma.bidder.findFirst({ where: { companySlug }, select: { name: true } }))?.name ?? 'Your company'
    : null;

  // "Real, independently verifiable" is asserted only of the GEM/-prefixed
  // tenders. QA-TEST/ fixtures are synthetic and must not be counted into that
  // claim (KPI counts below still use the full tenders array - they're "how
  // much is loaded", not a realness claim).
  const realTenders = tenders.filter((t) => t.referenceNo.startsWith('GEM/'));
  const qaTenders = tenders.filter((t) => !t.referenceNo.startsWith('GEM/'));

  // --- KPI numbers, all straight from Prisma ---
  // Latest Score per bidder (scoped for a bidder). One row per bidderId, newest first.
  const scoreRows = await prisma.score.findMany({
    where: isBidder ? { bidder: { companySlug } } : undefined,
    orderBy: { computedAt: 'desc' },
    select: { bidderId: true, riskLevel: true },
  });
  const latestRiskByBidder = new Map<string, string>();
  for (const s of scoreRows) if (!latestRiskByBidder.has(s.bidderId)) latestRiskByBidder.set(s.bidderId, s.riskLevel);
  const verifiedCount = latestRiskByBidder.size;
  const dist = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const r of latestRiskByBidder.values()) if (r === 'LOW' || r === 'MEDIUM' || r === 'HIGH') dist[r]++;

  const totalBidders = tenders.reduce((s, t) => s + t._count.bidders, 0); // officer only - includes competitors
  const myDocs = isBidder ? await prisma.document.count({ where: { bidder: { companySlug } } }) : 0;

  if (tenders.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold">{isBidder ? 'No tenders' : 'No tenders loaded'}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {isBidder ? (
            'Your company is not currently registered as a bidder on any tender.'
          ) : (
            <>
              Run <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run seed</code> to load the demo tenders.
            </>
          )}
        </p>
      </div>
    );
  }

  const rows: TenderRow[] = tenders.map((t) => {
    const closed = t.bidEndsAt ? t.bidEndsAt.getTime() < Date.now() : false;
    return {
      id: t.id,
      title: t.title,
      referenceNo: t.referenceNo,
      organization: t.organization,
      category: t.category,
      documentDated: t.documentDated ? fmtDate(t.documentDated) : null,
      bidEndsAt: t.bidEndsAt ? fmtDate(t.bidEndsAt) : null,
      // Days until the bid window shuts - drives the urgency colour on the
      // close date. null when there's no date or the tender is already closed.
      daysUntilClose:
        t.bidEndsAt && !closed ? Math.ceil((t.bidEndsAt.getTime() - Date.now()) / 86400000) : null,
      closed,
      bidderCount: t._count.bidders,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{isBidder ? 'Your tenders' : 'Tenders'}</h2>
        <p className="text-sm text-slate-500">
          {isBidder ? (
            <>
              The {tenders.length} GeM {tenders.length === 1 ? 'bid' : 'bids'} {companyName} is registered on. Click one to
              see your compliance status and upload documents.
            </>
          ) : (
            <>
              {realTenders.length} real, independently verifiable GeM {realTenders.length === 1 ? 'bid' : 'bids'}
              {qaTenders.length > 0 && (
                <>
                  {' '}
                  plus {qaTenders.length} internal QA test {qaTenders.length === 1 ? 'fixture' : 'fixtures'}
                </>
              )}
              . Click a tender to see its bidders and run compliance verification. Bidders are synthetic.
            </>
          )}
        </p>
      </div>

      {/* KPI row - every number computed from Prisma above */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<GridIcon />}
          value={tenders.length}
          label={isBidder ? 'Tenders you are registered on' : 'GeM tenders loaded'}
        />
        {isBidder ? (
          <>
            <StatCard
              icon={<ShieldCheckIcon />}
              value={verifiedCount}
              label={`of ${tenders.length} verified by the officer`}
              badge={verifiedCount === tenders.length ? 'all done' : 'in progress'}
              badgeTone={verifiedCount === tenders.length ? 'green' : 'amber'}
            />
            <StatCard icon={<FileIcon />} value={myDocs} label="Documents you have uploaded" />
          </>
        ) : (
          <>
            <StatCard icon={<UsersIcon />} value={totalBidders} label="Bidders across all tenders" />
            <StatCard
              icon={<ShieldCheckIcon />}
              value={verifiedCount}
              label={`of ${totalBidders} bidders verified so far`}
              badge={dist.HIGH > 0 ? `${dist.HIGH} high-risk` : undefined}
              badgeTone="amber"
            />
          </>
        )}
      </div>

      {!isBidder && (
        <div className="card w-full lg:max-w-lg">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Risk distribution — latest verification per bidder
          </h3>
          <RiskDonut low={dist.LOW} medium={dist.MEDIUM} high={dist.HIGH} />
        </div>
      )}

      <TenderList tenders={rows} isBidder={isBidder} />
    </div>
  );
}
