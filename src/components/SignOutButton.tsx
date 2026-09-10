'use client';

import { signOut } from '@/lib/authActions';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-xs font-medium text-white/80 underline hover:text-white">
        Sign out
      </button>
    </form>
  );
}
