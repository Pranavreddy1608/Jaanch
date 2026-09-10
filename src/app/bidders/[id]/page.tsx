import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ScoreBadge } from '@/components/ScoreBadge';
import { RiskBadge } from '@/components/RiskBadge';
import { ScoreDonut } from '@/components/ScoreDonut';
import { VerifyButton } from '@/components/VerifyButton';
import { RequirementRow } from '@/components/RequirementRow';
import { DecisionForm } from '@/components/DecisionForm';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentPreviewButton } from '@/components/DocumentPreviewButton';
import { StatCard } from '@/components/StatCard';
import { ShieldCheckIcon, ClipboardIcon, LinkIcon, BankIcon, TimelineIcon, SparkIcon } from '@/components/icons';
import type { RequirementEvaluation } from '@/lib/rulesEngine';
import { getSession } from '@/lib/session';
import { canViewBidder, canRunVerification, canUploadDocumentFor } from '@/lib/access';

export const dynamic = 'force-dynamic';

// Real VerificationResult.status → shared status-badge class.
function statusBadge(status: string): string {
  if (status === 'VERIFIED_OK') return 'badge-success';
  if (status === 'VERIFIED_FAIL') return 'badge-critical';
  return 'badge-warning'; // INCONSISTENT / MISSING / ERROR
}
const statusText: Record<string, string> = {
  VERIFIED_OK: 'Verified',
  VERIFIED_FAIL: 'Failed',
  INCONSISTENT: 'Inconsistent',
  MISSING: 'Missing',
  ERROR: 'Error',
};

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

  // The critical access check: a bidder may only ever open their own company's
  // page. Anything else - a guessed/edited URL for another company - is a 404,
  // server-side, before any of this bidder's data is rendered.
  if (!canViewBidder(session, bidder.companySlug)) notFound();

  const latestScore = bidder.scores[0];
  const evaluations: RequirementEvaluation[] = latestScore ? JSON.parse(latestScore.breakdown) : [];

  // Same filter generateRecommendation() uses (recommendation.ts) - a
  // requirement "needs attention" unless it's MET or waived (NOT_APPLICABLE).
  const gapCount = evaluations.filter((e) => e.outcome !== 'MET' && e.outcome !== 'NOT_APPLICABLE').length;

  // docType -> document, for wiring the evidence filename onto the two
  // genuinely document-backed requirement rows below.
  const documentsByType = new Map(bidder.documents.map((d) => [d.docType, d]));

  // Latest VerificationResult per requirement code (results are ordered desc).
  const latestVr = new Map<string, (typeof bidder.verificationResults)[number]>();
  for (const vr of bidder.verificationResults) {
    if (!latestVr.has(vr.requirementCode)) latestVr.set(vr.requirementCode, vr);
  }
  const methodByCode = new Map<string, string>();
  for (const [code, vr] of latestVr) methodByCode.set(code, vr.method);

  // The statutory-integration bento: real VerificationResult rows for the
  // pan / gst / udyam / blacklist / makeInIndia providers, badge colour from
  // the real status. Only shown once verification has produced a result.
  const integrations = (
    [
      { code: 'PAN_IT_COMPLIANCE', label: 'Income Tax (PAN)', id: bidder.pan },
      { code: 'GST_FILING', label: 'GST Network', id: bidder.gstin },
      { code: 'UDYAM_STATUS', label: 'Udyam / MSME Registration', id: bidder.udyamNumber },
      { code: 'BLACKLIST_CHECK', label: 'Blacklisting / Debarment', id: bidder.pan ?? bidder.gstin },
      { code: 'MAKE_IN_INDIA_LOCAL_CONTENT', label: 'Make in India — Local Content', id: null },
    ] as const
  )
    .map((x) => ({ ...x, vr: latestVr.get(x.code) }))
    .filter((x) => x.vr);

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

  // Who can do what on this page (all also enforced server-side in
  // src/lib/actions.ts - the UI state here is a courtesy, not the guard).
  const canVerify = canRunVerification(session);
  const canUpload = canUploadDocumentFor(session, bidder.companySlug);
  const viewerNote = 'Read-only — only a Procurement Officer can do this. You are signed in as a Viewer.';

  const idField = (label: string, value: string | number | null | undefined) => (
    <div>
      <dt className="text-label uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-ink">{value ?? '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href={`/tenders/${bidder.tenderId}`} className="text-sm text-ink-muted transition-colors hover:text-navy">
        ← Back to tender
      </Link>

      {/* Header */}
      <div className="card flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="mono-chip">{bidder.tender.referenceNo}</span>
            {latestScore && (
              <span className={`badge ${latestScore.riskLevel === 'HIGH' ? 'badge-critical' : latestScore.riskLevel === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`}>
                {latestScore.riskLevel} risk
              </span>
            )}
          </div>
          <h1 className="font-heading text-h1 text-ink">{bidder.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">{bidder.tender.title}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {idField('Udyam No.', bidder.udyamNumber)}
            {idField('GSTIN', bidder.gstin)}
            {idField('PAN', bidder.pan)}
            {idField('Claimed turnover', bidder.claimedTurnoverInrLakh != null ? `₹${bidder.claimedTurnoverInrLakh} L` : null)}
          </dl>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <ScoreBadge score={latestScore?.complianceScore ?? null} />
            <RiskBadge level={latestScore?.riskLevel ?? null} />
          </div>
          {session?.role === 'bidder' ? (
            <span className="text-[11px] text-ink-faint">Verification is run by the Procurement Officer.</span>
          ) : (
            <VerifyButton
              bidderId={bidder.id}
              label={latestScore ? 'Re-run Verification' : 'Run Verification'}
              disabledReason={canVerify ? undefined : viewerNote}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---- Main column ---- */}
        <div className="min-w-0 space-y-6">
          {/* Bento: Statutory Integrations + Financials */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h3 className="section-title">
                <LinkIcon className="h-5 w-5" /> Statutory Integrations
              </h3>
              {integrations.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No verification run yet — the pan / GST / Udyam / blacklist / Make-in-India checks appear here once
                  verification has run.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {integrations.map(({ code, label, id, vr }) => (
                    <div key={code} className="flex items-start justify-between gap-3 rounded border border-line bg-surface p-4">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-ink">{label}</h4>
                        <p className="mt-0.5 truncate font-mono text-data text-ink-muted">{id ?? 'declared field / registry'}</p>
                      </div>
                      <span className={`badge shrink-0 ${statusBadge(vr!.status)}`}>{statusText[vr!.status] ?? vr!.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card flex flex-col">
              <h3 className="section-title">
                <BankIcon className="h-5 w-5" /> Financials
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <dt className="text-ink-muted">Claimed annual turnover</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {bidder.claimedTurnoverInrLakh != null ? `₹ ${bidder.claimedTurnoverInrLakh} L` : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <dt className="text-ink-muted">Claimed employee count</dt>
                  <dd className="font-mono font-semibold text-ink">{bidder.claimedEmployeeCount ?? '—'}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-faint">
                Self-declared by the bidder; not independently verified in this build.
              </p>
            </div>
          </div>

          {latestScore && (
            <div className="card">
              <h3 className="section-title">
                <SparkIcon className="h-5 w-5" /> AI Recommendation
              </h3>
              <p className="whitespace-pre-line text-sm text-ink">{latestScore.aiRecommendation}</p>
              <p className="mt-3 text-xs text-ink-faint">
                Decision support only — final qualification / disqualification is the Procurement Officer&apos;s decision.
              </p>
            </div>
          )}

          <div className="card">
            <h3 className="section-title">
              <ClipboardIcon className="h-5 w-5" /> Requirement-by-Requirement Status
            </h3>
            {evaluations.length === 0 ? (
              <p className="text-sm text-ink-muted">
                {session?.role === 'bidder'
                  ? 'No verification run yet — the Procurement Officer runs the compliance checks once your documents are in.'
                  : 'No verification run yet — click "Run Verification" above.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <tbody>
                    {evaluations.map((e) => {
                      const evidenceDoc =
                        e.code === 'OEM_AUTHORIZATION'
                          ? documentsByType.get('OEM_AUTHORIZATION_CERTIFICATE')
                          : e.code === 'MAKE_IN_INDIA_LOCAL_CONTENT'
                            ? documentsByType.get('LOCAL_CONTENT_CERTIFICATE')
                            : e.code === 'GST_FILING'
                              ? documentsByType.get('GST_CERTIFICATE')
                              : e.code === 'PAN_IT_COMPLIANCE'
                                ? documentsByType.get('PAN_CARD')
                                : e.code === 'UDYAM_STATUS'
                                  ? documentsByType.get('UDYAM_CERTIFICATE')
                                  : undefined;
                      return (
                        <RequirementRow
                          key={e.code}
                          label={e.label}
                          mandatory={e.mandatory}
                          outcome={e.outcome}
                          reason={e.reason}
                          method={methodByCode.get(e.code)}
                          evidenceFileName={evidenceDoc?.fileName}
                          evidenceDocId={evidenceDoc?.id}
                          evidenceMimeType={evidenceDoc?.mimeType}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="section-title">Documents</h3>
            <div className="mb-4 space-y-3">
              {oemRequired && (
                <DocumentUpload
                  bidderId={bidder.id}
                  docType="OEM_AUTHORIZATION_CERTIFICATE"
                  label="OEM Authorization Certificate"
                  disabled={!canUpload}
                  disabledTitle="Upload OEM Authorization Certificate"
                  disabledNote={viewerNote}
                />
              )}
              <DocumentUpload
                bidderId={bidder.id}
                docType="LOCAL_CONTENT_CERTIFICATE"
                label="Local Content Certificate"
                disabled={miiWaived || !canUpload}
                disabledTitle={miiWaived ? undefined : 'Upload Local Content Certificate'}
                disabledNote={
                  miiWaived
                    ? "Make in India certification is waived for this tender (competent-authority approval on file) — uploads here won't affect this bidder's evaluation."
                    : viewerNote
                }
              />
              <DocumentUpload
                bidderId={bidder.id}
                docType="PAN_CARD"
                label="PAN Card"
                disabled={!canUpload}
                disabledTitle="Upload PAN Card"
                disabledNote={viewerNote}
              />
              <DocumentUpload
                bidderId={bidder.id}
                docType="GST_CERTIFICATE"
                label="GST Registration Certificate"
                disabled={!canUpload}
                disabledTitle="Upload GST Registration Certificate"
                disabledNote={viewerNote}
              />
              <DocumentUpload
                bidderId={bidder.id}
                docType="UDYAM_CERTIFICATE"
                label="Udyam Registration Certificate"
                disabled={!canUpload}
                disabledTitle="Upload Udyam Registration Certificate"
                disabledNote={viewerNote}
              />
              <p className="text-xs text-ink-faint">
                PAN Card / GST Certificate / Udyam Certificate are optional — GST, PAN and Udyam already verify against the
                declared field either way. Uploading one adds a real document-read cross-check on top (catches a wrong or
                mismatched file); it never removes or replaces the existing check.
              </p>
            </div>
            {bidder.documents.length === 0 ? (
              <p className="text-sm text-ink-muted">No documents on file yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {bidder.documents.map((doc) => (
                  <li key={doc.id} className="rounded border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{doc.fileName}</span>
                      <span className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">{doc.docType}</span>
                      <span className="rounded bg-surface-container px-1.5 py-0.5 text-[11px] text-ink-muted">
                        {doc.mimeType ? `uploaded file · ${doc.mimeType}` : 'simulated OCR text'}
                      </span>
                      {doc.mimeType && (
                        <DocumentPreviewButton documentId={doc.id} fileName={doc.fileName} mimeType={doc.mimeType} />
                      )}
                    </div>
                    {doc.rawText && <p className="mt-2 text-xs text-ink-muted">{doc.rawText}</p>}
                    {doc.extractedData && (
                      <div className="mt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">AI-extracted fields</div>
                        <pre className="mt-1 overflow-x-auto rounded bg-surface p-2 font-mono text-xs text-ink-muted">
                          {JSON.stringify(JSON.parse(doc.extractedData), null, 2)}
                        </pre>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={session?.role === 'bidder' ? '' : 'grid gap-6 sm:grid-cols-2'}>
            {/* The decision-input panel is officer tooling; a bidder sees only the
                outcome (Decision History below), which is their own data. */}
            {session?.role !== 'bidder' && (
              <DecisionForm bidderId={bidder.id} officerName={session?.name ?? ''} canRecord={session?.role === 'officer'} />
            )}

            <div className="card">
              <h3 className="section-title">Decision History</h3>
              {bidder.decisions.length === 0 ? (
                <p className="text-sm text-ink-muted">No decision recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {bidder.decisions.map((d) => (
                    <li key={d.id} className="rounded border border-line p-3">
                      <div className="font-semibold text-ink">{d.outcome}</div>
                      <div className="text-xs text-ink-faint">
                        {d.officerName} · {new Date(d.decidedAt).toLocaleString()}
                      </div>
                      {d.remarks && <div className="mt-1 text-ink-muted">{d.remarks}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">
              <TimelineIcon className="h-5 w-5" /> Verification Audit Trail
            </h3>
            {bidder.auditLogs.length === 0 ? (
              <p className="text-sm text-ink-muted">No audit entries yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-navy/25 pl-6">
                {bidder.auditLogs.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-surface-lowest bg-navy" aria-hidden="true" />
                    <div className="rounded border border-line bg-surface p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-navy">{log.action}</span>
                        <span className="font-mono text-data text-ink-faint">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">{log.actor}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ---- Right rail: compliance score panel ---- */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="card border-line/80 bg-surface-lowest/80 shadow-rail backdrop-blur-sm">
            {latestScore ? (
              <>
                <ScoreDonut score={latestScore.complianceScore} riskLevel={latestScore.riskLevel} />
                <div className="mt-5 grid gap-3">
                  <StatCard icon={<ClipboardIcon />} value={gapCount} label={gapCount === 1 ? 'requirement needs attention' : 'requirements need attention'} badge={gapCount === 0 ? 'all clear' : undefined} badgeTone="green" />
                </div>
              </>
            ) : (
              <div className="text-center">
                <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded bg-navy/10 text-navy">
                  <ShieldCheckIcon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium text-ink">Not yet scored</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {session?.role === 'bidder'
                    ? 'The Procurement Officer runs verification once your documents are in.'
                    : 'Run verification to compute this bidder’s compliance score.'}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
