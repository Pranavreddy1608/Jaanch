import { CheckIcon, DotIcon, DashIcon } from './icons';

// Colour logic unchanged — red/amber/green for the danger axis. Pass 2 only
// adds a leading glyph and rounds the pill; it does not recolour anything.
const styles: Record<string, string> = {
  LOW: 'bg-green-100 text-indiagreen-700', // flag green — same visual weight as green-800
  MEDIUM: 'bg-amber-100 text-amber-800', // caution — universal, not brand
  HIGH: 'bg-red-100 text-red-800', // danger — universal, not brand
};

const icons: Record<string, JSX.Element> = {
  LOW: <CheckIcon />,
  MEDIUM: <DotIcon />,
  HIGH: <DotIcon />,
};

const pill = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold';

export function RiskBadge({ level }: { level: string | null }) {
  if (!level) {
    return (
      <span className={`${pill} bg-slate-200 font-medium text-slate-600`}>
        <DashIcon />—
      </span>
    );
  }
  return (
    <span className={`${pill} ${styles[level] ?? 'bg-slate-200 text-slate-700'}`}>
      {icons[level] ?? <DotIcon />}
      {level} RISK
    </span>
  );
}
