import { CheckIcon, DashIcon } from './icons';

const pill = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold';

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className={`${pill} bg-slate-200 font-medium text-slate-600`}>
        <DashIcon />
        Not yet verified
      </span>
    );
  }
  // Saffron-700 (#B36200) — primary accent; white text clears AA on this shade
  // (the raw DEFAULT #FF9933 does not).
  return (
    <span className={`${pill} bg-saffron-700 text-white`}>
      <CheckIcon />
      {score}/100
    </span>
  );
}
