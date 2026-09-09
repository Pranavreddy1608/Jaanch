import Link from 'next/link';
import { prisma } from '@/lib/db';
import { importSecretOk } from '@/lib/import/adminGate';
import { listDatasetFiles, downloadDatasetFile, DATASET_BUCKET } from '@/lib/supabaseStorage';
import { readImportFile } from '@/lib/import/readImportFile';
import { committableTenders, recordEntries } from '@/lib/import/commit';
import { REQUIRED_TENDER_FIELDS, type ImportReview, type TenderEntry } from '@/lib/import/types';
import { ImportReviewForm } from './ImportReviewForm';

export const dynamic = 'force-dynamic';

const TENDER_FIELD_ORDER = [
  'referenceNo',
  'title',
  'organization',
  'department',
  'category',
  'documentDated',
  'bidEndsAt',
  'emdRequired',
  'emdNote',
  'miiNote',
  'mseNote',
] as const;

function NotFound() {
  return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">not found in document</span>;
}

function SecretGate({ error }: { error?: string }) {
  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Dataset import — team tool</h1>
        <p className="mb-4 mt-1 text-sm text-slate-600">
          Backstage setup utility. Not part of the demoed app. Enter the shared secret.
        </p>
        <form method="GET" className="space-y-3">
          <input
            type="password"
            name="secret"
            required
            autoFocus
            placeholder="ADMIN_IMPORT_SECRET"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="w-full rounded-md bg-saffron-700 px-3 py-2 text-sm font-medium text-white hover:bg-saffron-800">
            Unlock
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}

function TenderReview({ entry }: { entry: TenderEntry }) {
  const x = entry.extraction as unknown as Record<string, unknown>;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{entry.filename}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">tender document</span>
        {entry.blockers.length > 0 ? (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800">
            cannot import — missing: {entry.blockers.join(', ')}
          </span>
        ) : (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-800">ready to import</span>
        )}
      </div>
      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {TENDER_FIELD_ORDER.map((f) => {
          const v = x[f];
          const req = (REQUIRED_TENDER_FIELDS as readonly string[]).includes(f);
          return (
            <div key={f} className="border-b border-slate-100 py-1">
              <dt className="text-xs font-medium text-slate-400">
                {f}
                {req && <span className="text-red-500"> *</span>}
              </dt>
              <dd className="text-slate-800">
                {v === null || v === undefined ? <NotFound /> : String(v)}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-2 text-[11px] text-slate-400">
        * required. A field not clearly stated in the source PDF is left as &quot;not found&quot; — never guessed. An imported
        tender gets the baseline GST / PAN / blacklist / EPFO / DigiLocker requirement set; tender-specific rows (OEM,
        Udyam %, MII %) are added later by an officer.
      </p>
    </div>
  );
}

async function FileReview({ path, secret }: { path: string; secret: string }) {
  let review: ImportReview;
  try {
    const buf = await downloadDatasetFile(path);
    review = await readImportFile(path, buf);
  } catch (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Could not read <strong>{path}</strong>: {err instanceof Error ? err.message : String(err)}
      </div>
    );
  }

  const tenders = committableTenders(review);
  const records = recordEntries(review);
  const anyRecords = records.some((r) => r.extraction.records.length > 0);
  const canCommit = tenders.length > 0 || anyRecords;
  const canReplaceAll = tenders.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Review: {review.sourceFilename}</h2>
        <Link href={`/admin/import?secret=${encodeURIComponent(secret)}`} className="text-sm text-slate-500 hover:text-chakra hover:underline">
          ← back to file list
        </Link>
      </div>

      {review.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 rounded-md border border-amber-200 bg-amber-50 p-3 pl-8 text-xs text-amber-900">
          {review.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {review.entries.map((entry, i) => {
        if (entry.kind === 'tender') return <TenderReview key={i} entry={entry} />;
        if (entry.kind === 'skipped')
          return (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <span className="font-medium">{entry.filename}</span> — skipped: {entry.reason}
            </div>
          );
        // records
        const rec = entry.extraction;
        return (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{entry.filename}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                bidder records · {rec.records.length} row(s)
              </span>
            </div>
            {rec.matchedColumns.length > 0 && (
              <p className="mb-2 text-[11px] text-slate-500">Matched columns: {rec.matchedColumns.join(' · ')}</p>
            )}
            {rec.records.length === 0 ? (
              <p className="text-sm text-slate-500">No usable rows.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="text-slate-400">
                    <tr>
                      {['name', 'companySlug', 'tenderReferenceNo', 'gstin', 'pan', 'udyamNumber', 'claimedTurnoverInrLakh', 'claimedEmployeeCount'].map((h) => (
                        <th key={h} className="px-2 py-1 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rec.records.map((r, j) => (
                      <tr key={j} className="border-t border-slate-100">
                        {(['name', 'companySlug', 'tenderReferenceNo', 'gstin', 'pan', 'udyamNumber', 'claimedTurnoverInrLakh', 'claimedEmployeeCount'] as const).map((k) => (
                          <td key={k} className="px-2 py-1 text-slate-800">
                            {r[k] === null ? <NotFound /> : String(r[k])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <ImportReviewForm
        secret={secret}
        reviewJson={JSON.stringify(review)}
        canCommit={canCommit}
        canReplaceAll={canReplaceAll}
      />
    </div>
  );
}

export default async function AdminImportPage({
  searchParams,
}: {
  searchParams: { secret?: string; file?: string };
}) {
  const secret = searchParams.secret ?? '';
  if (!importSecretOk(secret)) {
    return <SecretGate error={secret ? 'Wrong secret.' : undefined} />;
  }

  if (searchParams.file) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100">
          Backstage tool — not part of the demoed app flow.
        </p>
        <FileReview path={searchParams.file} secret={secret} />
      </div>
    );
  }

  let files: Awaited<ReturnType<typeof listDatasetFiles>> = [];
  let listError: string | null = null;
  try {
    files = await listDatasetFiles();
  } catch (err) {
    listError = err instanceof Error ? err.message : String(err);
  }

  const batches = await prisma.importBatch.findMany({
    orderBy: { processedAt: 'desc' },
    include: { _count: { select: { tenders: true } } },
  });
  const byPath = new Map(batches.map((b) => [b.storagePath, b]));

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 inline-block rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100">
          Backstage tool — not part of the demoed app flow.
        </p>
        <h1 className="text-lg font-semibold">Dataset import</h1>
        <p className="text-sm text-slate-500">
          Files a team member dropped into the <code className="rounded bg-slate-100 px-1 text-xs">{DATASET_BUCKET}</code>{' '}
          Supabase Storage bucket. The app only reads this bucket — uploads happen through the Supabase dashboard.
        </p>
      </div>

      {listError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not list the bucket: {listError}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {files.length === 0 && !listError && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-slate-500">
                  The bucket is empty. Add a dataset file through the Supabase dashboard, then reload.
                </td>
              </tr>
            )}
            {files.map((f) => {
              const done = byPath.get(f.path);
              return (
                <tr key={f.path} className="border-t align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{f.name}</div>
                    <div className="text-xs text-slate-400">{f.mimeType}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{f.sizeBytes != null ? `${Math.round(f.sizeBytes / 1024)} KB` : '—'}</td>
                  <td className="px-4 py-3">
                    {done ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        processed · {done.recordsCreated} record(s) · {new Date(done.processedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">new</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/import?secret=${encodeURIComponent(secret)}&file=${encodeURIComponent(f.path)}`}
                      className="text-sm font-medium text-slate-600 hover:text-chakra hover:underline"
                    >
                      {done ? 'Re-review →' : 'Review →'}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {batches.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Import history</h2>
          <ul className="space-y-2 text-xs text-slate-600">
            {batches.map((b) => (
              <li key={b.id} className="rounded-md border border-slate-100 bg-white p-3">
                <span className="font-medium">{b.filename}</span> · {b.mode} · {b.recordsCreated} record(s) ·{' '}
                {b._count.tenders} tender(s) · {new Date(b.processedAt).toLocaleString()} · by {b.processedBy}
                {b.summary && <div className="mt-1 text-slate-500">{b.summary}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
