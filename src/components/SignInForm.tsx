'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type SignInState } from '@/lib/authActions';

const INITIAL: SignInState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-chakra px-3 py-2 text-sm font-medium text-white hover:bg-chakra-700 disabled:opacity-50"
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
        <input
          name="name"
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. R. Kalyanasundaram"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Role</label>
        <select name="role" required defaultValue="officer" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="officer">Procurement Officer — can record decisions</option>
          <option value="viewer">Viewer — read-only</option>
        </select>
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
