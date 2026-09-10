'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type LogEntry = {
  at: string;
  filename: string;
  outcome: 'imported' | 'ignored' | 'skipped' | 'error' | 'auto-deleted';
  detail: string;
  recordsCreated?: number;
  documentsAttached?: number;
  importBatchId?: string;
  via: 'realtime' | 'poll' | 'manual';
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
};

const outcomeStyle: Record<LogEntry['outcome'], string> = {
  imported: 'bg-green-100 text-green-800',
  ignored: 'bg-slate-100 text-slate-500',
  skipped: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  'auto-deleted': 'bg-red-600 text-white',
};

const rtDot: Record<Status['realtime'], string> = {
  connected: 'bg-green-500',
  connecting: 'bg-amber-400',
  disconnected: 'bg-slate-400',
  error: 'bg-red-500',
  off: 'bg-slate-300',
};

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString() : '—');

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
  const log = status?.log ?? [];
  const imports = log.filter((e) => e.outcome === 'imported').length;
  const autoDeletes = log.filter((e) => e.outcome === 'auto-deleted').length;

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
        <div>
          Auto-imports this session: <span className="font-medium text-slate-700">{imports}</span>
          {autoDeletes > 0 && (
            <span className="ml-2 font-medium text-red-600">· {autoDeletes} auto-removed (source file deleted)</span>
          )}
        </div>
        <div>{err ? <span className="text-red-600">status error: {err}</span> : 'Drop a .xlsx or manifest .zip straight into the bucket — no upload here needed. Delete the file and its bidders are removed automatically.'}</div>
      </div>

      <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-slate-100">
        {log.length === 0 ? (
          <p className="p-3 text-xs text-slate-400">No activity yet. Waiting for a file to land in the bucket…</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {log.map((e, i) => (
              <li
                key={i}
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 p-2 ${e.outcome === 'auto-deleted' ? 'bg-red-50' : ''}`}
              >
                <span className="font-mono text-[10px] text-slate-400">{time(e.at)}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${outcomeStyle[e.outcome]}`}>{e.outcome}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{e.via}</span>
                <span className="font-medium text-slate-800">{e.filename}</span>
                {e.outcome !== 'auto-deleted' && e.recordsCreated != null && <span className="text-slate-500">· {e.recordsCreated} record(s)</span>}
                {e.documentsAttached != null && <span className="text-slate-500">· {e.documentsAttached} doc(s)</span>}
                <span className={`w-full ${e.outcome === 'auto-deleted' ? 'font-medium text-red-700' : 'text-slate-500'}`}>{e.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
