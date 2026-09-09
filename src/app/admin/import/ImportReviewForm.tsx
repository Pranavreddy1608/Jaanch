'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { commitImportAction, type CommitState } from './actions';

const INITIAL: CommitState = { status: 'idle' };

function Buttons({ canReplaceAll }: { canReplaceAll: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        name="mode"
        value="add"
        disabled={pending}
        className="rounded-md bg-saffron-700 px-4 py-2 text-sm font-medium text-white hover:bg-saffron-800 disabled:opacity-50"
      >
        {pending ? 'Working…' : 'Add to database'}
      </button>
      <button
        type="submit"
        name="mode"
        value="replace-all"
        disabled={pending || !canReplaceAll}
        title={canReplaceAll ? undefined : 'Replace All needs at least one importable tender in the file.'}
        className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-40"
      >
        {pending ? 'Working…' : 'Replace ALL data'}
      </button>
    </div>
  );
}

export function ImportReviewForm({
  secret,
  reviewJson,
  canCommit,
  canReplaceAll,
}: {
  secret: string;
  reviewJson: string;
  canCommit: boolean;
  canReplaceAll: boolean;
}) {
  const [state, formAction] = useFormState(commitImportAction, INITIAL);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="secret" value={secret} />
      <input type="hidden" name="reviewJson" value={reviewJson} />

      <div>
        <label className="block text-xs font-medium text-slate-600">Processed by (recorded on the import batch)</label>
        <input
          name="processedBy"
          defaultValue="admin"
          className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      {!canCommit && (
        <p className="text-sm text-amber-700">
          Nothing here can be committed — every extracted tender is missing a required field, and no bidder records were
          found. Fix the source file and re-upload it to the bucket.
        </p>
      )}

      {canCommit && (
        <>
          <p className="text-xs text-slate-500">
            <strong>Add</strong> appends the rows above to the current database.{' '}
            <strong>Replace ALL</strong> deletes every existing tender, bidder, requirement, verification result, score,
            decision and audit log first (seed-script deletion order), then imports.
          </p>
          <Buttons canReplaceAll={canReplaceAll} />
        </>
      )}

      {state.status === 'error' && <p className="text-sm font-medium text-red-700">{state.message}</p>}
      {state.status === 'ok' && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-medium">{state.message}</p>
          {state.notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
              {state.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
