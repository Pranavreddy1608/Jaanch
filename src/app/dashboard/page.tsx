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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tenders.map((t) => {
          const closed = t.bidEndsAt ? t.bidEndsAt.getTime() < now : false;
          return (
            <Link
              key={t.id}
              href={`/tenders/${t.id}`}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900 hover:text-chakra">{t.title}</h3>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    closed ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {closed ? 'Closed' : 'Open'}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{t.referenceNo}</div>

              <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div>
                  <dt className="font-medium text-slate-400">Organisation</dt>
                  <dd>{t.organization}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-400">Category</dt>
                  <dd>{t.category}</dd>
                </div>
              </dl>

              <div className="mt-3 space-y-0.5 border-t pt-3 text-xs text-slate-600">
                {t.bidStartsAt && (
                  <div>
                    <span className="text-slate-400">Bid opens:</span> {fmtDate(t.bidStartsAt)}
                  </div>
                )}
                {t.bidEndsAt && (
                  <div>
                    <span className="text-slate-400">Bid closes:</span> {fmtDate(t.bidEndsAt)}
                  </div>
                )}
              </div>

              <div className="mt-3 text-xs text-slate-500">
                {t._count.bidders} {t._count.bidders === 1 ? 'bidder' : 'bidders'}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
