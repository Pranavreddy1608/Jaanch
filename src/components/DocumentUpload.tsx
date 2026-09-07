'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { uploadDocument, type UploadState } from '@/lib/actions';

const INITIAL: UploadState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
    >
      {pending ? 'Uploading…' : 'Upload & extract'}
    </button>
  );
}

export function DocumentUpload({
  bidderId,
  docType = 'LOCAL_CONTENT_CERTIFICATE',
  label = 'Local Content Certificate',
}: {
  bidderId: string;
  docType?: string;
  label?: string;
}) {
  const [state, formAction] = useFormState(uploadDocument, INITIAL);

  return (
    <form action={formAction} className="space-y-2 rounded-md border border-dashed border-slate-300 p-3">
      <input type="hidden" name="bidderId" value={bidderId} />
      <input type="hidden" name="docType" value={docType} />
      <label className="block text-xs font-medium text-slate-600">Upload {label} (PDF, PNG, JPEG or WebP · max 8 MB)</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          required
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
        />
        <SubmitButton />
      </div>
      {state.status === 'error' && <p className="text-xs text-red-600">{state.message}</p>}
      {state.status === 'ok' && <p className="text-xs text-green-700">{state.message}</p>}
      <p className="text-xs text-slate-400">
        The AI extraction step reads the uploaded file directly via a multimodal LLM call — no separate OCR. Uploading
        replaces any existing {label.toLowerCase()} for this bidder.
      </p>
    </form>
  );
}
