interface Props {
  label: string;
  mandatory: boolean;
  outcome: 'MET' | 'NOT_MET' | 'NEEDS_REVIEW';
  reason: string;
  isMock?: boolean;
}

const outcomeStyles: Record<Props['outcome'], string> = {
  MET: 'bg-green-100 text-green-800',
  NOT_MET: 'bg-red-100 text-red-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
};

export function RequirementRow({ label, mandatory, outcome, reason, isMock }: Props) {
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
        {isMock !== undefined && (
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
            {isMock ? 'simulated' : 'live'}
          </span>
        )}
      </td>
    </tr>
  );
}
