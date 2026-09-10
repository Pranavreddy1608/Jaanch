import { CheckIcon, DotIcon, DashIcon, FileIcon } from './icons';
import { DocumentPreviewButton } from './DocumentPreviewButton';

interface Props {
  label: string;
  mandatory: boolean;
  outcome: 'MET' | 'NOT_MET' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE';
  reason: string;
  /** VerificationResult.method - drives the honesty tag. */
  method?: string;
  /**
   * The uploaded document this check was run against. Only the two genuinely
   * document-backed checks (OEM_AUTHORIZATION, MAKE_IN_INDIA_LOCAL_CONTENT)
   * ever have one - every other requirement is checked against bidder fields
   * / registries, not a file, so it gets nothing here. The filename shows as
   * a label; when the document has real uploaded bytes (mimeType set), a
   * Preview button opens it in-page.
   */
  evidenceFileName?: string;
  evidenceDocId?: string;
  evidenceMimeType?: string | null;
}

// Colour-to-status mapping unchanged from pass 1 — green/red/amber/gray.
// Pass 2 adds a leading glyph and rounds the pill only.
const outcomeStyles: Record<Props['outcome'], string> = {
  MET: 'bg-green-100 text-green-800',
  NOT_MET: 'bg-red-100 text-red-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-500',
};

const outcomeIcons: Record<Props['outcome'], JSX.Element> = {
  MET: <CheckIcon />,
  NOT_MET: <DotIcon />,
  NEEDS_REVIEW: <DotIcon />,
  NOT_APPLICABLE: <DashIcon />,
};

// How the check was actually produced - shown so judges can see which
// checks run real logic vs. simulated fixture data.
const methodTag: Record<string, { text: string; className: string }> = {
  real: { text: 'REAL ALGORITHM', className: 'bg-emerald-100 text-emerald-800' },
  'real+simulated': { text: 'REAL FORMAT + SIM. REGISTRY', className: 'bg-teal-100 text-teal-800' },
  'sandbox-probe': { text: 'LIVE SANDBOX PROBE', className: 'bg-sky-100 text-sky-800' },
  simulated: { text: 'SIMULATED', className: 'bg-slate-100 text-slate-500' },
};

export function RequirementRow({
  label,
  mandatory,
  outcome,
  reason,
  method,
  evidenceFileName,
  evidenceDocId,
  evidenceMimeType,
}: Props) {
  // No method tag when the tender itself waived the requirement - nothing
  // was verified, so "SIMULATED" / "REAL" would be misleading.
  const tag = outcome !== 'NOT_APPLICABLE' && method ? methodTag[method] ?? methodTag.simulated : undefined;
  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 align-top">
        <div className="font-medium text-slate-900">{label}</div>
        {mandatory && <div className="text-xs text-slate-500">Mandatory</div>}
      </td>
      <td className="py-3 pr-4 align-top">
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${outcomeStyles[outcome]}`}>
          {outcomeIcons[outcome]}
          {outcome.replace('_', ' ')}
        </span>
      </td>
      <td className="py-3 align-top text-sm text-slate-600">
        {reason}
        {tag && (
          <span className={`ml-2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tag.className}`}>
            {tag.text}
          </span>
        )}
        {evidenceFileName && (
          <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            <FileIcon className="h-3 w-3" />
            {evidenceFileName}
          </span>
        )}
        {evidenceFileName && evidenceDocId && evidenceMimeType && (
          <span className="ml-2 inline-flex align-middle">
            <DocumentPreviewButton documentId={evidenceDocId} fileName={evidenceFileName} mimeType={evidenceMimeType} />
          </span>
        )}
      </td>
    </tr>
  );
}
