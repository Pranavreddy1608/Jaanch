import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default async function DashboardPage() {
  const tenders = await prisma.tender.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { bidders: true } } },
  });

  if (tenders.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold">No tenders loaded</h2>
        <p className="mt-1 text-sm text-slate-600">
          Run <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run seed</code> to load the demo tenders.
        </p>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tenders</h2>
        <p className="text-sm text-slate-500">
          {tenders.length} real, independently verifiable GeM bids. Click a tender to see its bidders and run compliance
          verification. Bidders are synthetic.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {tenders.map((t) => {
          const closed = t.bidEndsAt ? t.bidEndsAt.getTime() < now : false;
          return (
            <Link
              key={t.id}
              href={`/tenders/${t.id}`}
              className="grid w-full gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1.1fr)_auto] sm:items-start"
            >
              {/* Title + reference */}
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 hover:text-chakra">{t.title}</h3>
                <div className="mt-0.5 text-xs text-slate-400">{t.referenceNo}</div>
              </div>

              {/* Organisation + category */}
              <div className="min-w-0 text-xs text-slate-600">
                <div>{t.organization}</div>
                <div className="mt-1 text-slate-400">{t.category}</div>
              </div>

              {/* Dates */}
              <div className="text-xs text-slate-600">
                {t.documentDated && (
                  <div>
                    <span className="text-slate-400">Document dated:</span> {fmtDate(t.documentDated)}
                  </div>
                )}
                {t.bidEndsAt && (
                  <div className="mt-1">
                    <span className="text-slate-400">Bid closes:</span> {fmtDate(t.bidEndsAt)}
                  </div>
                )}
              </div>

              {/* Status + bidder count */}
              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    closed ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {closed ? 'Closed' : 'Open'}
                </span>
                <span className="whitespace-nowrap text-xs text-slate-500">
                  {t._count.bidders} {t._count.bidders === 1 ? 'bidder' : 'bidders'}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
