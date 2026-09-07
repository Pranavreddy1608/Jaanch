interface Props {
  label: string;
  mandatory: boolean;
  outcome: 'MET' | 'NOT_MET' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE';
  reason: string;
  /** VerificationResult.method - drives the honesty tag. */
  method?: string;
}

const outcomeStyles: Record<Props['outcome'], string> = {
  MET: 'bg-green-100 text-green-800',
  NOT_MET: 'bg-red-100 text-red-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-500',
};

// How the check was actually produced - shown so judges can see which
// checks run real logic vs. simulated fixture data.
const methodTag: Record<string, { text: string; className: string }> = {
  real: { text: 'REAL ALGORITHM', className: 'bg-emerald-100 text-emerald-800' },
  'real+simulated': { text: 'REAL FORMAT + SIM. REGISTRY', className: 'bg-teal-100 text-teal-800' },
  'sandbox-probe': { text: 'LIVE SANDBOX PROBE', className: 'bg-sky-100 text-sky-800' },
  simulated: { text: 'SIMULATED', className: 'bg-slate-100 text-slate-500' },
};

export function RequirementRow({ label, mandatory, outcome, reason, method }: Props) {
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
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${outcomeStyles[outcome]}`}>{outcome.replace('_', ' ')}</span>
      </td>
      <td className="py-3 align-top text-sm text-slate-600">
        {reason}
        {tag && (
          <span className={`ml-2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tag.className}`}>
            {tag.text}
          </span>
        )}
      </td>
    </tr>
  );
}
