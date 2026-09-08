'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-red-900">Something went wrong</h2>
      <p className="mt-1 text-sm text-red-800">
        The page hit an unexpected error. This is a demo build — the pipeline itself falls back safely, so retrying
        usually clears it.
      </p>
      {error?.message && (
        <pre className="mt-3 overflow-x-auto rounded bg-white/70 p-2 text-xs text-red-700">{error.message}</pre>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-saffron-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-saffron-800"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
