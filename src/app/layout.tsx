import type { Metadata } from 'next';
import './globals.css';
import { getSession, ROLE_LABELS } from '@/lib/session';
import { SignOutButton } from '@/components/SignOutButton';
import { Sidebar, MobileNav } from '@/components/Sidebar';
import { ChakraWheel } from '@/components/icons';

export const metadata: Metadata = {
  title: 'GeM Bid Compliance Verification Platform',
  description: 'AI-assisted bidder compliance verification for GeM procurement (SIH26100)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();

  return (
    <html lang="en">
      <body>
        {/* Tiranga accent strip — the only place actual saffron/white/green bands appear. */}
        <div className="flex h-1 w-full" aria-hidden="true">
          <div className="flex-1 bg-saffron" />
          <div className="flex-1 border-x border-slate-200 bg-white" />
          <div className="flex-1 bg-indiagreen" />
        </div>

        <div className="flex min-h-[calc(100vh-0.25rem)]">
          {session && <Sidebar role={session.role} />}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-3 border-b border-saffron-800 bg-saffron-700 px-4 py-2.5 md:px-6">
              {/* Brand: shown in the bar only where the sidebar isn't (mobile, or no session). */}
              <div className={`flex items-center gap-2 ${session ? 'md:hidden' : ''}`}>
                <ChakraWheel className="h-6 w-6 shrink-0 text-chakra" />
                <span className="text-sm font-semibold text-white">GeM Bid Compliance</span>
              </div>
              {session && (
                <p className="hidden text-xs font-medium uppercase tracking-wide text-white/90 md:block">
                  Government e-Marketplace · {session.role === 'bidder' ? 'Bidder Portal' : 'Procurement Officer Console'}
                </p>
              )}

              {session && (
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 font-medium text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" aria-hidden="true" />
                    <span className="hidden sm:inline">Session active</span>
                  </span>
                  <div className="text-right text-white/75">
                    <div>
                      <span className="font-medium text-white">{session.name}</span> · {ROLE_LABELS[session.role]}
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
