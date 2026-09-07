'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { recordDecision, type DecisionState } from '@/lib/actions';

const INITIAL: DecisionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
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
      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">PO Decision</h3>
        <p className="mt-2 text-sm text-slate-600">
          You are signed in as a Viewer. Only a Procurement Officer can record a qualify / disqualify decision.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-white p-4">
      <input type="hidden" name="bidderId" value={bidderId} />
      <div>
        <span className="block text-xs font-medium text-slate-600">Recording as</span>
        <span className="mt-1 block text-sm font-medium text-slate-900">{officerName} · Procurement Officer</span>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Decision</label>
        <select name="outcome" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm">
          <option value="QUALIFIED">Qualified</option>
          <option value="CONDITIONAL">Conditional (pending clarification)</option>
          <option value="DISQUALIFIED">Disqualified</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Remarks (optional)</label>
        <textarea name="remarks" rows={2} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      </div>
      <p className="text-xs text-slate-500">
        This decision is recorded separately from the AI recommendation and is always the Procurement Officer&apos;s own call.
      </p>
      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.status === 'error' && <span className="text-xs text-red-600">{state.message}</span>}
        {state.status === 'ok' && <span className="text-xs text-green-700">{state.message}</span>}
      </div>
    </form>
  );
}
