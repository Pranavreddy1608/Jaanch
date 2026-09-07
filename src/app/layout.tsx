import type { Metadata } from 'next';
import './globals.css';
import { getSession, ROLE_LABELS } from '@/lib/session';
import { SignOutButton } from '@/components/SignOutButton';

export const metadata: Metadata = {
  title: 'GeM Bid Compliance Verification Platform',
  description: 'AI-assisted bidder compliance verification for GeM procurement (SIH26100)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-3 px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Government e-Marketplace · Procurement Officer Console
                </p>
                <h1 className="text-xl font-semibold">GeM Bid Compliance Verification Platform</h1>
              </div>
              {session && (
                <div className="text-right text-xs text-slate-500">
                  <div>
                    <span className="font-medium text-slate-700">{session.name}</span> · {ROLE_LABELS[session.role]}
                  </div>
                  <SignOutButton />
                </div>
              )}
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
