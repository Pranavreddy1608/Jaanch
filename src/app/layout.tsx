import type { Metadata } from 'next';
import './globals.css';
import { getSession, ROLE_LABELS } from '@/lib/session';
import { SignOutButton } from '@/components/SignOutButton';
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
        <div className="min-h-screen">
          <header className="border-b-2 border-chakra/15 bg-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="flex items-center gap-3">
                <ChakraWheel className="h-8 w-8 shrink-0 text-chakra" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-saffron-700">
                    Government e-Marketplace · {session?.role === 'bidder' ? 'Bidder Portal' : 'Procurement Officer Console'}
                  </p>
                  <h1 className="text-xl font-semibold text-slate-900">GeM Bid Compliance Verification Platform</h1>
                </div>
              </div>
              {session && (
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true" />
                    Session active
                  </span>
                  <div className="text-right text-slate-500">
                    <div>
                      <span className="font-medium text-slate-700">{session.name}</span> · {ROLE_LABELS[session.role]}
                    </div>
                    <SignOutButton />
                  </div>
                </div>
              )}
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
