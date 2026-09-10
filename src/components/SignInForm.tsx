'use client';

import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type SignInState } from '@/lib/authActions';
import { LockIcon, RefreshIcon, UserIcon } from '@/components/icons';

const INITIAL: SignInState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
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
        <label className="block text-xs font-medium text-ink-muted">Officer / Viewer ID</label>
        <div className="relative mt-1">
          <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy" />
          <input
            name="username"
            required
            autoFocus
            autoComplete="username"
            spellCheck={false}
            className="field pl-8"
            placeholder="officer"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted">Password</label>
        <div className="relative mt-1">
          <LockIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy" />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="field pl-8"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted">Type the characters shown</label>
        <div className="mt-1 flex items-center gap-3">
          <span
            className="shrink-0 overflow-hidden rounded-md border border-line"
            // Server-rendered SVG from a fixed alphabet - no user input in it.
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
          />
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn-secondary text-xs"
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
          className="field mt-2 uppercase tracking-widest"
          placeholder="CAPTCHA"
        />
      </div>

      {state.status === 'error' && <p className="text-xs text-critical">{state.message}</p>}
      <SubmitButton />
      <p className="text-xs text-ink-faint">
        Access is restricted to authorised procurement staff. Every recorded decision and uploaded document is tied to
        the signed-in identity for the audit trail.
      </p>
    </form>
  );
}
