'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChakraWheel, GridIcon, UploadIcon } from '@/components/icons';
import type { Role } from '@/lib/session';

/**
 * Persistent left nav. Nav items link ONLY to routes that exist today
 * (Dashboard for everyone; Dataset Import for officers). No placeholder /
 * dead links - the rest of this app is careful not to ship "looks real but
 * isn't", and the sidebar follows that.
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: Role[]; // undefined = all roles
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <GridIcon /> },
  { href: '/admin/import', label: 'Dataset Import', icon: <UploadIcon />, roles: ['officer'] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <aside className="hidden w-sidebar shrink-0 flex-col border-r border-line bg-surface-lowest md:flex">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center gap-2.5">
          <ChakraWheel className="h-8 w-8 shrink-0 text-navy" />
          <div className="leading-tight">
            <p className="font-heading text-h2 font-bold leading-none text-navy">GeM</p>
            <p className="text-label uppercase tracking-wider text-ink-muted">Compliance</p>
          </div>
        </div>
        <p className="mt-2 text-data text-ink-faint">Procurement verification terminal</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              // border-r on every item (transparent when inactive) so the
              // active saffron accent doesn't shift the layout.
              className={`flex items-center gap-3 border-r-[3px] px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'border-saffron bg-surface-low font-semibold text-saffron-800'
                  : 'border-transparent font-medium text-ink-muted hover:bg-surface-low hover:text-navy'
              }`}
            >
              <span className={active ? 'text-saffron-800' : 'text-ink-faint'}>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <p className="border-t border-line px-4 py-3 text-data text-ink-faint">Team-only tools stay off this nav.</p>
    </aside>
  );
}

/** Compact horizontal nav for &lt;md screens (the sidebar is hidden there). */
export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role));
  return (
    <nav className="flex gap-1 border-b border-line bg-surface-lowest px-3 py-1.5 md:hidden">
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded border-b-2 px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? 'border-saffron bg-surface-low text-saffron-800' : 'border-transparent text-ink-muted hover:bg-surface-low'
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
