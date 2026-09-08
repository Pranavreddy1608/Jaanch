import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const tenders = await prisma.tender.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { bidders: true } } },
  });

  if (tenders.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6">
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

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Tender</th>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Bidders</th>
            </tr>
          </thead>
          <tbody>
            {tenders.map((t) => {
              const closed = t.bidEndsAt ? t.bidEndsAt.getTime() < now : false;
              return (
                <tr key={t.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <Link href={`/tenders/${t.id}`} className="font-medium text-slate-900 hover:text-chakra hover:underline">
                      {t.title}
                    </Link>
                    <div className="text-xs text-slate-400">{t.referenceNo}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.organization}</td>
                  <td className="px-4 py-3 text-slate-600">{t.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        closed ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {closed ? 'Closed' : 'Open'}
                      {t.bidEndsAt &&
                        ` · ${t.bidEndsAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t._count.bidders}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
