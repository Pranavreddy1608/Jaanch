'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type SignInState } from '@/lib/authActions';
import { IdIcon, UserIcon } from '@/components/icons';

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

export function SignInForm() {
  const [state, formAction] = useFormState(signIn, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">Your name</label>
        <div className="relative mt-1">
          <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-chakra" />
          <input
            name="name"
            required
            autoFocus
            className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm"
            placeholder="e.g. R. Kalyanasundaram"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Role</label>
        <div className="relative mt-1">
          <IdIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-chakra" />
          <select
            name="role"
            required
            defaultValue="officer"
            className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm"
          >
            <option value="officer">Procurement Officer — can record decisions</option>
            <option value="viewer">Viewer — read-only</option>
          </select>
        </div>
      </div>
      {state.status === 'error' && <p className="text-xs text-red-600">{state.message}</p>}
      <SubmitButton />
      <p className="text-xs text-slate-400">
        Demo sign-in — no password. It ties every recorded decision to a named, role-checked identity for the audit trail.
        A production deployment would use the organisation&apos;s SSO.
      </p>
    </form>
  );
}
