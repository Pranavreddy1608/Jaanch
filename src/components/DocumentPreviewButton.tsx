'use client';

import { useState } from 'react';

export function DocumentPreviewButton({
  documentId,
  fileName,
  mimeType,
}: {
  documentId: string;
  fileName: string;
  mimeType: string;
}) {
  const [open, setOpen] = useState(false);
  const src = `/api/documents/${documentId}`;
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-chakra/10 px-1.5 py-0.5 text-[11px] font-medium text-chakra hover:bg-chakra/20"
      >
        Preview
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <span className="truncate text-sm font-medium text-slate-800">{fileName}</span>
              <div className="flex items-center gap-3">
                <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-chakra hover:underline">
                  Open in new tab
                </a>
                <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close preview">
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50">
              {isImage ? (
                <img src={src} alt={fileName} className="mx-auto max-h-full max-w-full object-contain" />
              ) : isPdf ? (
                <iframe src={src} title={fileName} className="h-full w-full border-0" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
                  Preview isn&apos;t supported for this file type ({mimeType}).{' '}
                  <a href={src} target="_blank" rel="noopener noreferrer" className="ml-1 text-chakra hover:underline">
                    Open it directly
                  </a>
                  .
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
