'use client';

import { useState } from 'react';
import { runVerification } from '@/lib/actions';

export function VerifyButton({ bidderId, label = 'Run Verification' }: { bidderId: string; label?: string }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setError(null);
    try {
      await runVerification(bidderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed — try again.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-md bg-chakra px-3 py-1.5 text-sm font-medium text-white hover:bg-chakra-700 disabled:opacity-50"
      >
        {isPending && (
          <span
            className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
        )}
        {isPending ? 'Verifying…' : label}
      </button>
      {isPending && <span className="text-[11px] text-slate-400">Running checks, ~5–10s…</span>}
      {error && <span className="max-w-[16rem] text-right text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
