import { Hanken_Grotesk } from 'next/font/google';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { newCaptcha } from '@/lib/captcha';
import { SignInForm } from '@/components/SignInForm';
import { ChakraWheel, ShieldCheckIcon, BankIcon, ClipboardIcon, FileIcon, LinkIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

// Scoped to this page only (a separate loader call from layout.tsx's — not a
// shared CSS variable) so the sign-in screen reads a little more "brand",
// without changing the font anywhere else in the app.
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });

// Mirrors commit.ts's standardRequirements() — same 5 checks every imported
// tender gets, same `mandatory` flags. Kept as a display-only list here (no
// import of commit.ts, which drags in Prisma); if that list changes, update
// this one too.
const VERIFIED_CHECKS = [
  { icon: BankIcon, label: 'GST Registration & Return Filing', mandatory: true },
  { icon: ClipboardIcon, label: 'PAN Validity', mandatory: true },
  { icon: ShieldCheckIcon, label: 'Blacklisting / Debarment Check', mandatory: true },
  { icon: FileIcon, label: 'EPFO / ESIC & Labour Code Compliance', mandatory: false },
  { icon: LinkIcon, label: 'DigiLocker Document Verification', mandatory: false },
];

export default async function SignInPage() {
  if (getSession()) redirect('/dashboard');

  // A fresh challenge every render (page is force-dynamic); the form's
  // "new image" button triggers a router.refresh() to get another.
  const { token, svg } = newCaptcha();

  return (
    <div className={`${hanken.className} mx-auto grid w-full max-w-5xl items-center gap-10 py-4 lg:grid-cols-2 lg:gap-16 lg:py-10`}>
      {/* ---- Hero / what-this-verifies panel ---- */}
      <div className="order-2 lg:order-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1 text-label uppercase tracking-wider text-navy">
          <ChakraWheel className="h-3.5 w-3.5 shrink-0" />
          Government e-Marketplace · Procurement Officer Console
        </div>
        <h1 className="mt-4 font-heading text-h1 text-navy">Bid Compliance Verification</h1>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          A single sign-in for the tools that check a GeM bidder&apos;s statutory documents, score their compliance,
          and keep an audit trail of every decision.
        </p>

        <ul className="mt-6 space-y-3">
          {VERIFIED_CHECKS.map(({ icon: Icon, label, mandatory }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-navy/10 text-navy">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm text-ink">{label}</span>
              <span className={`badge ${mandatory ? 'badge-warning' : 'badge-neutral'} shrink-0`}>
                {mandatory ? 'Mandatory' : 'Where applicable'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ---- Sign-in card ---- */}
      <div className="order-1 lg:order-2">
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface-lowest shadow-card">
          {/* Tiranga-toned accent, card-local (the app-wide strip lives in layout.tsx). */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #FF9933, #D4AF37, #138808)' }} aria-hidden="true" />

          {/* Faint watermark — decorative only, sits behind the form. */}
          <ChakraWheel className="pointer-events-none absolute -right-10 -top-6 h-40 w-40 text-navy opacity-[0.04]" />

          <div className="relative p-6 sm:p-8">
            <span className="text-label uppercase tracking-wider text-ink-faint">Restricted access</span>
            <h2 className="mt-1 font-heading text-h2 text-navy">Sign in</h2>
            <p className="mb-6 mt-1 text-sm text-ink-muted">GeM Bid Compliance Verification Portal.</p>
            <SignInForm captchaSvg={svg} captchaToken={token} />
          </div>
        </div>
      </div>
    </div>
  );
}
