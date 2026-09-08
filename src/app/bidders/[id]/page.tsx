import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { VerifyButton } from '@/components/VerifyButton';
import { RequirementRow } from '@/components/RequirementRow';
import { DecisionForm } from '@/components/DecisionForm';
import { DocumentUpload } from '@/components/DocumentUpload';
import type { RequirementEvaluation } from '@/lib/rulesEngine';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function BidderDetailPage({ params }: { params: { id: string } }) {
  const bidder = await prisma.bidder.findUnique({
    where: { id: params.id },
    include: {
      tender: { include: { requirements: true } },
      // Exclude fileData (raw bytes) - the page only needs metadata + extracted fields.
      documents: {
        select: { id: true, docType: true, fileName: true, mimeType: true, rawText: true, extractedData: true },
      },
      verificationResults: { orderBy: { checkedAt: 'desc' } },
      scores: { orderBy: { computedAt: 'desc' }, take: 1 },
      decisions: { orderBy: { decidedAt: 'desc' } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!bidder) notFound();

  const session = getSession();
  const latestScore = bidder.scores[0];
  const evaluations: RequirementEvaluation[] = latestScore ? JSON.parse(latestScore.breakdown) : [];

  // Verification method per requirement, for the honesty tag ("real
  // algorithm" vs "simulated") - taken from the most recent
  // VerificationResult for that requirement code.
  const methodByCode = new Map<string, string>();
  for (const vr of bidder.verificationResults) {
    if (!methodByCode.has(vr.requirementCode)) methodByCode.set(vr.requirementCode, vr.method);
  }

  // Is the Make-in-India local-content requirement waived for this tender?
  // If so, uploading a local-content certificate here is a dead end.
  const miiReq = bidder.tender.requirements.find((r) => r.code === 'MAKE_IN_INDIA_LOCAL_CONTENT');
  let miiWaived = false;
  try {
    miiWaived = miiReq ? JSON.parse(miiReq.ruleConfig)?.notApplicable === true : false;
  } catch {
    /* keep false */
  }
  const oemRequired = bidder.tender.requirements.some((r) => r.code === 'OEM_AUTHORIZATION' && r.mandatory);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-white p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {bidder.tender.referenceNo} · {bidder.tender.title}
          </p>
          <h2 className="text-xl font-semibold">{bidder.name}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-4">
            <div><dt className="text-xs text-slate-400">Udyam No.</dt><dd>{bidder.udyamNumber ?? '—'}</dd></div>
            <div><dt className="text-xs text-slate-400">GSTIN</dt><dd>{bidder.gstin ?? '—'}</dd></div>
            <div><dt className="text-xs text-slate-400">PAN</dt><dd>{bidder.pan ?? '—'}</dd></div>
            <div><dt className="text-xs text-slate-400">Claimed Turnover</dt><dd>₹{bidder.claimedTurnoverInrLakh ?? '—'} L</dd></div>
          </dl>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <ScoreBadge score={latestScore?.complianceScore ?? null} />
            <RiskBadge level={latestScore?.riskLevel ?? null} />
          </div>
          <VerifyButton bidderId={bidder.id} label={latestScore ? 'Re-run Verification' : 'Run Verification'} />
        </div>
      </div>

      {latestScore && (
        <div className="rounded-lg border bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">AI Recommendation</h3>
          <p className="whitespace-pre-line text-sm text-slate-800">{latestScore.aiRecommendation}</p>
          <p className="mt-2 text-xs text-slate-400">
            Decision support only — final qualification/disqualification is the Procurement Officer&apos;s decision.
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Requirement-by-Requirement Status</h3>
        {evaluations.length === 0 ? (
          <p className="text-sm text-slate-500">No verification run yet — click &quot;Run Verification&quot; above.</p>
        ) : (
          <table className="w-full text-left">
            <tbody>
              {evaluations.map((e) => (
                <RequirementRow
                  key={e.code}
                  label={e.label}
                  mandatory={e.mandatory}
                  outcome={e.outcome}
                  reason={e.reason}
                  method={methodByCode.get(e.code)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Documents</h3>
        <div className="mb-4 space-y-3">
          {oemRequired && (
            <DocumentUpload
              bidderId={bidder.id}
              docType="OEM_AUTHORIZATION_CERTIFICATE"
              label="OEM Authorization Certificate"
            />
          )}
          <DocumentUpload
            bidderId={bidder.id}
            docType="LOCAL_CONTENT_CERTIFICATE"
            label="Local Content Certificate"
            disabled={miiWaived}
            disabledNote="Make in India certification is waived for this tender (competent-authority approval on file) — uploads here won't affect this bidder's evaluation."
          />
        </div>
        {bidder.documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents on file yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {bidder.documents.map((doc) => (
              <li key={doc.id} className="rounded-md border border-slate-100 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{doc.fileName}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{doc.docType}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                    {doc.mimeType ? `uploaded file · ${doc.mimeType}` : 'simulated OCR text'}
                  </span>
                </div>
                {doc.rawText && <p className="mt-2 text-xs text-slate-500">{doc.rawText}</p>}
                {doc.extractedData && (
                  <div className="mt-2">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">AI-extracted fields</div>
                    <pre className="mt-1 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
                      {JSON.stringify(JSON.parse(doc.extractedData), null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <DecisionForm
          bidderId={bidder.id}
          officerName={session?.name ?? ''}
          canRecord={session?.role === 'officer'}
        />

        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Decision History</h3>
          {bidder.decisions.length === 0 ? (
            <p className="text-sm text-slate-500">No decision recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {bidder.decisions.map((d) => (
                <li key={d.id} className="rounded-md border border-slate-100 p-2">
                  <div className="font-medium">{d.outcome}</div>
                  <div className="text-xs text-slate-500">
                    {d.officerName} · {new Date(d.decidedAt).toLocaleString()}
                  </div>
                  {d.remarks && <div className="mt-1 text-slate-600">{d.remarks}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Audit Trail (most recent 20)</h3>
        <ul className="space-y-1 text-xs text-slate-500">
          {bidder.auditLogs.map((log) => (
            <li key={log.id} className="border-b border-slate-100 py-1.5">
              <span className="font-mono">{new Date(log.createdAt).toLocaleString()}</span> — <span className="font-medium">{log.actor}</span>: {log.action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
