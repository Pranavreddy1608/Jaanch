'use client';

import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type SignInState } from '@/lib/authActions';
import { LockIcon, RefreshIcon, UserIcon } from '@/components/icons';

const INITIAL: SignInState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-saffron-700 px-3 py-2 text-sm font-medium text-white hover:bg-saffron-800 disabled:opacity-50"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function SignInForm({ captchaSvg, captchaToken }: { captchaSvg: string; captchaToken: string }) {
  const [state, formAction] = useFormState(signIn, INITIAL);
  const router = useRouter();

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">Officer / Viewer ID</label>
        <div className="relative mt-1">
          <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-chakra" />
          <input
            name="username"
            required
            autoFocus
            autoComplete="username"
            spellCheck={false}
            className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm"
            placeholder="officer"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">Password</label>
        <div className="relative mt-1">
          <LockIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-chakra" />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">Type the characters shown</label>
        <div className="mt-1 flex items-center gap-3">
          <span
            className="shrink-0 overflow-hidden rounded-md border border-slate-300"
            // Server-rendered SVG from a fixed alphabet - no user input in it.
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
          />
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            title="Load a new image"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            New image
          </button>
        </div>
        <input type="hidden" name="captchaToken" value={captchaToken} />
        <input
          name="captcha"
          required
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          className="mt-2 w-full rounded-md border border-slate-300 py-2 px-3 text-sm uppercase tracking-widest"
          placeholder="CAPTCHA"
        />
      </div>

      {state.status === 'error' && <p className="text-xs text-red-600">{state.message}</p>}
      <SubmitButton />
      <p className="text-xs text-slate-400">
        Access is restricted to authorised procurement staff. Every recorded decision and uploaded document is tied to
        the signed-in identity for the audit trail.
      </p>
    </form>
  );
}
