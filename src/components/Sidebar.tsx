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
    <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-[13px]">
        <ChakraWheel className="h-7 w-7 shrink-0 text-chakra" />
        <div className="leading-tight">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-saffron-700">GeM</p>
          <p className="text-sm font-semibold text-slate-900">Compliance</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-chakra/10 text-chakra' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className={active ? 'text-chakra' : 'text-slate-400'}>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      <p className="border-t border-slate-100 p-3 text-[11px] text-slate-400">
        Team-only tools stay off this nav.
      </p>
    </aside>
  );
}

/** Compact horizontal nav for &lt;md screens (the sidebar is hidden there). */
export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role));
  return (
    <nav className="flex gap-1 border-b border-slate-200 bg-white px-3 py-1.5 md:hidden">
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              active ? 'bg-chakra/10 text-chakra' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
