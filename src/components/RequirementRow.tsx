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

// Outcome → shared status-badge class (same green/amber/red danger mapping).
const outcomeBadge: Record<Props['outcome'], string> = {
  MET: 'badge-success',
  NOT_MET: 'badge-critical',
  NEEDS_REVIEW: 'badge-warning',
  NOT_APPLICABLE: 'badge-neutral',
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
  real: { text: 'REAL ALGORITHM', className: 'bg-indiagreen/10 text-indiagreen-700' },
  'real+simulated': { text: 'REAL FORMAT + SIM. REGISTRY', className: 'bg-indigo/10 text-indigo-600' },
  'sandbox-probe': { text: 'LIVE SANDBOX PROBE', className: 'bg-indigo/10 text-indigo' },
  simulated: { text: 'SIMULATED', className: 'bg-surface-high text-ink-faint' },
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
    <tr className="border-b border-line last:border-0">
      <td className="py-3 pr-4 align-top">
        <div className="font-medium text-ink">{label}</div>
        {mandatory && <div className="text-xs text-ink-faint">Mandatory</div>}
      </td>
      <td className="py-3 pr-4 align-top">
        <span className={`badge whitespace-nowrap ${outcomeBadge[outcome]}`}>
          {outcomeIcons[outcome]}
          {outcome.replace('_', ' ')}
        </span>
      </td>
      <td className="py-3 align-top text-sm text-ink-muted">
        {reason}
        {tag && (
          <span className={`ml-2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tag.className}`}>
            {tag.text}
          </span>
        )}
        {evidenceFileName && (
          <span className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded bg-surface-container px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-muted">
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
