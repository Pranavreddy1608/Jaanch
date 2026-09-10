'use client';

import { signOut } from '@/lib/authActions';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-xs font-medium text-slate-500 underline hover:text-slate-800">
        Sign out
      </button>
    </form>
  );
}
