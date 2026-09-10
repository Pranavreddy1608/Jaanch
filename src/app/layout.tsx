import type { Metadata } from 'next';
import { Inter, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { getSession, ROLE_LABELS } from '@/lib/session';
import { SignOutButton } from '@/components/SignOutButton';
import { Sidebar, MobileNav } from '@/components/Sidebar';
import { ChakraWheel } from '@/components/icons';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-hanken', display: 'swap' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-jbmono', display: 'swap' });

export const metadata: Metadata = {
  title: 'GeM Bid Compliance Verification Platform',
  description: 'AI-assisted bidder compliance verification for GeM procurement (SIH26100)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();

  return (
    <html lang="en" className={`${inter.variable} ${hanken.variable} ${jbMono.variable}`}>
      <body>
        {/* Tiranga accent strip — the only place actual saffron/white/green bands appear. */}
        <div className="flex h-1 w-full" aria-hidden="true">
          <div className="flex-1 bg-saffron" />
          <div className="flex-1 border-x border-line bg-surface-lowest" />
          <div className="flex-1 bg-indiagreen" />
        </div>

        <div className="flex min-h-[calc(100vh-0.25rem)]">
          {session && <Sidebar role={session.role} />}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-topbar items-center justify-between gap-3 border-b border-line bg-surface-lowest/75 px-4 backdrop-blur-md md:px-6">
              {/* Brand: shown in the bar only where the sidebar isn't (mobile, or no session). */}
              <div className={`flex items-center gap-2 ${session ? 'md:hidden' : ''}`}>
                <ChakraWheel className="h-6 w-6 shrink-0 text-navy" />
                <span className="font-heading text-sm font-bold text-navy">GeM Bid Compliance</span>
              </div>
              {session && (
                <p className="hidden text-label uppercase tracking-wider text-ink-muted md:block">
                  Government e-Marketplace · {session.role === 'bidder' ? 'Bidder Portal' : 'Procurement Officer Console'}
                </p>
              )}

              {session && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium text-indiagreen-700" style={{ backgroundColor: 'rgba(19,136,8,0.12)' }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-indiagreen" aria-hidden="true" />
                    <span className="hidden sm:inline">Session active</span>
                  </span>
                  <div className="text-right text-ink-faint">
                    <div>
                      <span className="font-medium text-ink">{session.name}</span> · {ROLE_LABELS[session.role]}
                    </div>
                    <SignOutButton />
                  </div>
                </div>
              )}
            </header>

            {session && <MobileNav role={session.role} />}

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
