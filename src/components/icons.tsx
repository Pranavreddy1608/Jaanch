/**
 * Small inline SVG glyphs — no icon-library dependency (checked package.json,
 * lucide-react is not installed and this pass must not add a dependency).
 *
 * All icons draw with `currentColor` so the parent controls the colour:
 * badge glyphs inherit the pill's text colour; form-field icons are set to
 * `text-chakra` (navy) as the secondary accent; the brand wheel is navy.
 *
 * Pure presentational components (no hooks) — safe to import from both server
 * and client components.
 */

type IconProps = { className?: string };

/** ✓ — verified / MET / low-risk. */
export function CheckIcon({ className = 'h-3 w-3' }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** ● — pending / needs review / medium. */
export function DotIcon({ className = 'h-2 w-2' }: IconProps) {
  return (
    <svg viewBox="0 0 8 8" className={className} aria-hidden="true">
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}

/** — — not started / not applicable. */
export function DashIcon({ className = 'h-3 w-3' }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M3 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Generic 24-spoke wheel glyph for the header brand mark. Hand-drawn line art —
 * deliberately NOT a trace of the State Emblem of India or the Ashoka Chakra
 * from the national flag; this is a hackathon prototype, not an official GoI site.
 */
export function ChakraWheel({ className = 'h-8 w-8' }: IconProps) {
  const spokes = [];
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    spokes.push(
      <line
        key={i}
        x1="16"
        y1="16"
        x2={(16 + 13 * Math.sin(a)).toFixed(2)}
        y2={(16 - 13 * Math.cos(a)).toFixed(2)}
        stroke="currentColor"
        strokeWidth="0.6"
      />,
    );
  }
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#fff" />
      <circle cx="16" cy="16" r="13.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
      {spokes}
    </svg>
  );
}

/* ---- Form-field icons (thin line style) ---- */

export function UserIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="5" r="2.75" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 13.5c0-2.6 2.46-4.25 5.5-4.25s5.5 1.65 5.5 4.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IdIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.5" cy="8" r="1.6" stroke="currentColor" strokeWidth="1.1" />
      <path d="M9 7h4M9 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="7" width="10" height="6.5" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7V5.2a3 3 0 0 1 6 0V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function RefreshIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M13 8a5 5 0 1 1-1.46-3.54" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 2.5V5h-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClipboardIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3" width="9" height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3v-.75C6 1.56 6.56 1 7.25 1h1.5C9.44 1 10 1.56 10 2.25V3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 7h4M6 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function PencilIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M10.5 2.5 13.5 5.5 6 13l-3.5.5L3 10 10.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function UploadIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 10.5V3M8 3 5.25 5.75M8 3l2.75 2.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ---- Sidebar / stat-card glyphs (thin line style, currentColor) ---- */

export function GridIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function UsersIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 13.5c0-2.4 2.1-3.9 4.5-3.9s4.5 1.5 4.5 3.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 3.4a2.3 2.3 0 0 1 0 4.2M12 9.8c1.8.3 3 1.6 3 3.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 1.5 13 3.4v4.1c0 3.4-2.1 5.9-5 7-2.9-1.1-5-3.6-5-7V3.4L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.8 8 7.4 9.6 10.4 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FileIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 1.5h5L13 5.5V14a.5.5 0 0 1-.5.5h-8A.5.5 0 0 1 4 14V1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 1.5V5.5h4M6 8.5h4M6 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
