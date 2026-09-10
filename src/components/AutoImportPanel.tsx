'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type LogEntry = {
  at: string;
  filename: string;
  outcome: 'imported' | 'ignored' | 'skipped' | 'error';
  detail: string;
  recordsCreated?: number;
  documentsAttached?: number;
  importBatchId?: string;
  via: 'realtime' | 'poll' | 'manual';
};

type PendingDeletion = {
  importBatchId: string;
  storagePath: string;
  filename: string;
  processedAt: string;
  detectedAt: string;
};

type Impact = {
  importBatchId: string;
  found: boolean;
  bidderCount: number;
  byTender: { tenderTitle: string; referenceNo: string; bidders: number }[];
  documents: number;
  verificationResults: number;
  scores: number;
  auditLogs: number;
  decisions: number;
};

type Status = {
  bucket: string;
  watcherStarted: boolean;
  realtime: 'connecting' | 'connected' | 'disconnected' | 'error' | 'off';
  realtimeLastEventAt: string | null;
  lastPollAt: string | null;
  lastPollFoundNew: number;
  pollIntervalMs: number;
  scanning: boolean;
  log: LogEntry[];
  pendingDeletions: PendingDeletion[];
};

const outcomeStyle: Record<LogEntry['outcome'], string> = {
  imported: 'bg-green-100 text-green-800',
  ignored: 'bg-slate-100 text-slate-500',
  skipped: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
};

const rtDot: Record<Status['realtime'], string> = {
  connected: 'bg-green-500',
  connecting: 'bg-amber-400',
  disconnected: 'bg-slate-400',
  error: 'bg-red-500',
  off: 'bg-slate-300',
};

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString() : '—');
const dateTime = (iso: string) => new Date(iso).toLocaleString();

function PendingDeletionCard({
  secret,
  pd,
  onResolved,
}: {
  secret: string;
  pd: PendingDeletion;
  onResolved: () => void;
}) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [impactErr, setImpactErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'delete' | 'keep'>(null);

  useEffect(() => {
    let live = true;
    // Fresh, uncached - re-fetched every mount so the counts reflect any
    // verification / decisions recorded since the file went missing.
    fetch(`/api/auto-import/deletions?secret=${encodeURIComponent(secret)}&importBatchId=${encodeURIComponent(pd.importBatchId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`impact ${r.status}`))))
      .then((j) => live && setImpact(j))
      .catch((e) => live && setImpactErr(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [secret, pd.importBatchId]);

  const resolve = async (action: 'delete' | 'keep') => {
    setBusy(action);
    try {
      await fetch(`/api/auto-import/deletions?secret=${encodeURIComponent(secret)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ importBatchId: pd.importBatchId, action }),
      });
      onResolved();
    } finally {
      setBusy(null);
    }
  };

  const n = impact?.bidderCount ?? 0;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm font-semibold text-slate-900">
          Source file removed: <span className="font-mono">{pd.filename}</span>
        </span>
        <span className="text-[11px] text-slate-500">
          imported {dateTime(pd.processedAt)} · went missing {time(pd.detectedAt)}
        </span>
      </div>

      {impactErr ? (
        <p className="mt-2 text-xs text-red-600">Couldn&apos;t load impact: {impactErr}</p>
      ) : !impact ? (
        <p className="mt-2 text-xs text-slate-500">Checking what this import created…</p>
      ) : !impact.found ? (
        <div className="mt-2">
          <p className="text-xs text-slate-600">
            No bidders trace to this import. (It may have only attached documents to bidders that already existed — those
            aren&apos;t linked to an import batch and won&apos;t be removed.) Nothing to delete.
          </p>
          <button
            type="button"
            onClick={() => resolve('keep')}
            disabled={busy !== null}
            className="mt-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <>
          {impact.decisions > 0 && (
            <p className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
              {impact.decisions} of these bidders already {impact.decisions === 1 ? 'has' : 'have'} an officer decision recorded.
            </p>
          )}

          <div className="mt-2 text-xs text-slate-700">
            <p className="font-medium">
              {n} bidder{n === 1 ? '' : 's'} across {impact.byTender.length} tender{impact.byTender.length === 1 ? '' : 's'}:
            </p>
            <ul className="mt-1 space-y-0.5">
              {impact.byTender.map((t) => (
                <li key={t.referenceNo} className="text-slate-600">
                  <span className="font-medium text-slate-800">{t.bidders}</span> on {t.tenderTitle}{' '}
                  <span className="text-slate-400">({t.referenceNo})</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-slate-500">
              plus {impact.documents} document(s), {impact.verificationResults} verification result(s), {impact.scores} score(s),
              {' '}{impact.auditLogs} audit log(s) — the ImportBatch record itself is kept.
            </p>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => resolve('delete')}
              disabled={busy !== null}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy === 'delete' ? 'Deleting…' : `Delete ${n} bidder${n === 1 ? '' : 's'}`}
            </button>
            <button
              type="button"
              onClick={() => resolve('keep')}
              disabled={busy !== null}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === 'keep' ? 'Keeping…' : 'Keep them'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AutoImportPanel({ secret }: { secret: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`/api/auto-import/status?secret=${encodeURIComponent(secret)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`status ${r.status}`);
      setStatus(await r.json());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [secret]);

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll]);

  const scanNow = async () => {
    setScanning(true);
    try {
      await fetch(`/api/auto-import/scan?secret=${encodeURIComponent(secret)}`, { method: 'POST' });
      await poll();
    } finally {
      setScanning(false);
    }
  };

  const rt = status?.realtime ?? 'connecting';
  const imports = (status?.log ?? []).filter((e) => e.outcome === 'imported').length;
  const pending = status?.pendingDeletions ?? [];

  return (
    <div className="rounded-xl border border-chakra/40 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${rtDot[rt]} ${rt === 'connected' ? 'animate-ping opacity-60' : ''}`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${rtDot[rt]}`} />
          </span>
          <span className="text-sm font-semibold text-slate-800">
            Watching <code className="rounded bg-slate-100 px-1 text-xs">{status?.bucket ?? 'dataset-uploads'}</code> for new files
          </span>
        </div>
        <button
          type="button"
          onClick={scanNow}
          disabled={scanning}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {scanning ? 'Scanning…' : 'Scan now'}
        </button>
      </div>

      <div className="mt-2 grid gap-x-6 gap-y-1 text-[11px] text-slate-500 sm:grid-cols-2">
        <div>
          Realtime: <span className="font-medium text-slate-700">{rt}</span>
          {status?.realtimeLastEventAt && <> · last event {time(status.realtimeLastEventAt)}</>}
        </div>
        <div>
          Poll fallback: every {Math.round((status?.pollIntervalMs ?? 9000) / 1000)}s · last {time(status?.lastPollAt ?? null)}
          {status?.scanning && <span className="ml-1 text-chakra">(scanning…)</span>}
        </div>
        <div>Auto-imports this session: <span className="font-medium text-slate-700">{imports}</span></div>
        <div>{err ? <span className="text-red-600">status error: {err}</span> : 'Drop a .xlsx or manifest .zip straight into the bucket — no upload here needed.'}</div>
      </div>

      {pending.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Import source removed — confirm before anything is deleted
          </p>
          {pending.map((pd) => (
            <PendingDeletionCard key={pd.importBatchId} secret={secret} pd={pd} onResolved={poll} />
          ))}
        </div>
      )}

      <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-slate-100">
        {(status?.log ?? []).length === 0 ? (
          <p className="p-3 text-xs text-slate-400">No activity yet. Waiting for a file to land in the bucket…</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {status!.log.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2">
                <span className="font-mono text-[10px] text-slate-400">{time(e.at)}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${outcomeStyle[e.outcome]}`}>{e.outcome}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{e.via}</span>
                <span className="font-medium text-slate-800">{e.filename}</span>
                {e.recordsCreated != null && <span className="text-slate-500">· {e.recordsCreated} record(s)</span>}
                {e.documentsAttached != null && <span className="text-slate-500">· {e.documentsAttached} doc(s)</span>}
                <span className="w-full text-slate-500">{e.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
