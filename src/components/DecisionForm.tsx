'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { recordDecision, type DecisionState } from '@/lib/actions';
import { ClipboardIcon, PencilIcon, UserIcon } from '@/components/icons';

const INITIAL: DecisionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-saffron-700 px-3 py-2 text-sm font-medium text-white hover:bg-saffron-800 disabled:opacity-50"
    >
      {pending ? 'Recording…' : 'Record Decision'}
    </button>
  );
}

export function DecisionForm({
  bidderId,
  officerName,
  canRecord,
}: {
  bidderId: string;
  officerName: string;
  canRecord: boolean;
}) {
  const [state, formAction] = useFormState(recordDecision, INITIAL);

  if (!canRecord) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">PO Decision</h3>
        <p className="mt-2 text-sm text-slate-600">
          You are signed in as a Viewer. Only a Procurement Officer can record a qualify / disqualify decision.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-3">
      <input type="hidden" name="bidderId" value={bidderId} />
      <div>
        <span className="block text-xs font-medium text-slate-600">Recording as</span>
        <span className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900">
          <UserIcon className="h-4 w-4 text-chakra" />
          {officerName} · Procurement Officer
        </span>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Decision</label>
        <div className="relative mt-1">
          <ClipboardIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-chakra" />
          <select
            name="outcome"
            required
            className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm"
          >
            <option value="QUALIFIED">Qualified</option>
            <option value="CONDITIONAL">Conditional (pending clarification)</option>
            <option value="DISQUALIFIED">Disqualified</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Remarks (optional)</label>
        <div className="relative mt-1">
          <PencilIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-chakra" />
          <textarea
            name="remarks"
            rows={2}
            className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        This decision is recorded separately from the AI recommendation and is always the Procurement Officer&apos;s own call.
      </p>
      <SubmitButton />
      {state.status === 'error' && <p className="text-xs text-red-600">{state.message}</p>}
      {state.status === 'ok' && <p className="text-xs text-green-700">{state.message}</p>}
    </form>
  );
}
