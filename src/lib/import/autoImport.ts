import 'server-only';
import AdmZip from 'adm-zip';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import { DATASET_BUCKET, downloadDatasetFile } from '@/lib/supabaseStorage';
import { readImportFile } from './readImportFile';
import { commitImport } from './commit';
import { autoImportState, pushLog, markProcessed, type AutoImportLogEntry } from './autoImportState';

/**
 * Storage auto-import: a second path into the import pipeline that needs no
 * /admin/import click. When a file lands in the "dataset-uploads" bucket
 * (dropped straight into Supabase Storage), a Realtime INSERT event on
 * storage.objects - or the polling fallback - triggers the SAME
 * commitImport() the manual flow uses, in ADD MODE ONLY. Never replace-all
 * (destructive, and there's no human here to choose it). Never auto-commits
 * a tender PDF (its extracted fields need human review at /admin/import).
 */

// File extensions the manual flow accepts that are safe to auto-commit
// without a review step: bidder spreadsheets and manifest-driven doc ZIPs.
const AUTO_EXTS = new Set(['xlsx', 'xls', 'csv', 'zip']);
const PROCESSED_BY = 'auto-import (storage watcher)';

const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

// All mutable watcher state lives on one globalThis-backed singleton so a
// Next dev HMR re-evaluation of this module reuses the SAME timer / channel /
// mutex rather than forking a second, uncoordinated watcher.
interface Runtime {
  chain: Promise<unknown>;
  locked: boolean;
  supabaseClient: SupabaseClient | null;
  channel: RealtimeChannel | null;
  pollTimer: NodeJS.Timeout | null;
  realtimeMuted: boolean;
  lastBucketSnapshot: Set<string> | null; // names seen on the previous poll tick, for deletion diffing
}
const g = globalThis as unknown as { __gemAutoImportRuntime?: Runtime };
const rt: Runtime =
  g.__gemAutoImportRuntime ??
  (g.__gemAutoImportRuntime = {
    chain: Promise.resolve(),
    locked: false,
    supabaseClient: null,
    channel: null,
    pollTimer: null,
    realtimeMuted: false,
    lastBucketSnapshot: null,
  });

// Promise-chain mutex - a plain boolean has a check-then-set race across the
// await points inside a run (two triggers can both pass the check and then
// both commit the same file). withLock() serialises; tryLock() skips if busy.
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = rt.chain.then(() => {
    rt.locked = true;
    autoImportState.scanning = true;
    return fn();
  });
  rt.chain = run.then(
    () => { rt.locked = false; autoImportState.scanning = false; },
    () => { rt.locked = false; autoImportState.scanning = false; },
  );
  return run;
}
function tryLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (rt.locked) return Promise.resolve(null);
  return withLock(fn);
}

/** storagePaths already committed as an ImportBatch (idempotency across reconnects/restarts). */
async function committedPaths(): Promise<Set<string>> {
  const rows = await prisma.importBatch.findMany({ select: { storagePath: true } });
  return new Set(rows.map((r) => r.storagePath));
}

/**
 * Enumerates the bucket by querying storage.objects directly. The Storage
 * list() HTTP endpoint serves a short-lived cached response and can omit a
 * just-uploaded object for many seconds - the DB row is the source of truth
 * and appears the instant the upload commits (same row the Realtime INSERT
 * fires on). Root-level files only, matching listDatasetFiles().
 */
async function bucketObjectNames(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name FROM storage.objects
    WHERE bucket_id = ${DATASET_BUCKET} AND name <> '.emptyFolderPlaceholder' AND position('/' in name) = 0
  `;
  return rows.map((r) => r.name);
}

/**
 * Diffs the current bucket listing against the previous poll's snapshot. A
 * name that was there last tick, is gone now, and still has a matching
 * ImportBatch.storagePath is a deleted import source - recorded in
 * pendingDeletions for AutoImportPanel to confirm. Nothing is deleted here.
 * Also clears a pending deletion whose file has reappeared.
 */
async function detectBucketDeletions(currentNames: string[]): Promise<void> {
  const current = new Set(currentNames);

  // A previously-flagged file that came back? Drop the pending deletion.
  autoImportState.pendingDeletions = autoImportState.pendingDeletions.filter((p) => !current.has(p.storagePath));

  const prev = rt.lastBucketSnapshot;
  rt.lastBucketSnapshot = current;
  if (!prev) return; // first tick just establishes the baseline

  const vanished = [...prev].filter((n) => !current.has(n));
  const alreadyPending = new Set(autoImportState.pendingDeletions.map((p) => p.storagePath));
  for (const name of vanished) {
    if (alreadyPending.has(name)) continue;
    // eslint-disable-next-line no-await-in-loop
    const batch = await prisma.importBatch.findFirst({
      where: { storagePath: name },
      orderBy: { processedAt: 'desc' },
      select: { id: true, filename: true, storagePath: true, processedAt: true },
    });
    if (!batch) continue;
    autoImportState.pendingDeletions.push({
      importBatchId: batch.id,
      storagePath: batch.storagePath,
      filename: batch.filename,
      processedAt: batch.processedAt.toISOString(),
      detectedAt: new Date().toISOString(),
    });
    pushLog({
      at: new Date().toISOString(),
      filename: name,
      outcome: 'skipped',
      detail: 'source file removed from Storage — awaiting a confirm to remove the bidders it created (nothing deleted yet).',
      via: 'poll',
    });
  }
}

async function processOneFile(name: string, via: AutoImportLogEntry['via'], done: Set<string>): Promise<void> {
  const ext = extOf(name);
  const base = { at: new Date().toISOString(), filename: name, via };

  if (!AUTO_EXTS.has(ext)) {
    pushLog({ ...base, outcome: 'ignored', detail: `.${ext || '?'} is not a bidder spreadsheet or dataset ZIP — left for a manual review at /admin/import.` });
    markProcessed(name);
    return;
  }
  if (done.has(name)) return; // already an ImportBatch for this path

  let buffer: Buffer;
  try {
    buffer = await downloadDatasetFile(name);
  } catch (err) {
    pushLog({ ...base, outcome: 'error', detail: `download failed: ${err instanceof Error ? err.message : String(err)}` });
    return;
  }

  // A ZIP is only auto-imported when it carries a manifest.json at its root -
  // that's a bidder-document bundle (the manifest routes each PDF straight to
  // a Document row, no LLM). A ZIP without one is a tender/PDF bundle whose
  // extracted fields need human review, and running readImportFile on it here
  // would burn LLM calls we then discard. Check before parsing.
  if (ext === 'zip') {
    let hasManifest = false;
    try {
      hasManifest = new AdmZip(buffer)
        .getEntries()
        .some((e) => !e.isDirectory && (e.entryName.split('/').pop() ?? e.entryName) === 'manifest.json');
    } catch (err) {
      pushLog({ ...base, outcome: 'error', detail: `not a readable ZIP: ${err instanceof Error ? err.message : String(err)}` });
      return;
    }
    if (!hasManifest) {
      pushLog({ ...base, outcome: 'skipped', detail: 'ZIP has no manifest.json — a tender/PDF bundle, open it at /admin/import for review.' });
      markProcessed(name);
      return;
    }
  }

  let review;
  try {
    review = await readImportFile(name, buffer);
  } catch (err) {
    pushLog({ ...base, outcome: 'error', detail: `parse failed: ${err instanceof Error ? err.message : String(err)}` });
    return;
  }

  const hasTender = review.entries.some((e) => e.kind === 'tender');
  if (hasTender) {
    pushLog({ ...base, outcome: 'skipped', detail: 'contains tender document(s) — extracted fields need a human review, open it at /admin/import.' });
    markProcessed(name);
    return;
  }
  const hasRecords = review.entries.some((e) => e.kind === 'records' && e.extraction.records.length > 0);
  const hasBidderDocs = review.entries.some((e) => e.kind === 'bidderDocument');
  if (!hasRecords && !hasBidderDocs) {
    pushLog({ ...base, outcome: 'skipped', detail: 'no bidder rows and no manifest-listed documents found in the file.' });
    markProcessed(name);
    return;
  }

  try {
    const result = await commitImport(review, 'add', PROCESSED_BY);
    const m = result.summary.match(/(\d+) document\(s\) attached/);
    pushLog({
      ...base,
      outcome: 'imported',
      detail: result.summary,
      recordsCreated: result.recordsCreated,
      documentsAttached: m ? Number(m[1]) : undefined,
      importBatchId: result.importBatchId,
    });
    markProcessed(name);
  } catch (err) {
    pushLog({ ...base, outcome: 'error', detail: `commit failed: ${err instanceof Error ? err.message : String(err)}` });
  }
}

/**
 * Lists the bucket, diffs against ImportBatch.storagePath, and auto-commits
 * every not-yet-imported file that qualifies. Safe to call repeatedly and
 * concurrently (the mutex serialises runs; committed paths are re-checked).
 */
export async function runAutoImport(via: AutoImportLogEntry['via'] = 'poll'): Promise<{ scanned: number; newFiles: number }> {
  const body = async () => {
    // A manual "Scan now" reconsiders every non-committed file; the poll and
    // Realtime paths also skip ones already handled this process run
    // (skipped/ignored land in processedPaths) so a 9s poll doesn't re-log
    // them every tick.
    if (via === 'manual') autoImportState.processedPaths = [];
    const [names, done] = await Promise.all([bucketObjectNames(), committedPaths()]);

    // Detect source files removed from the bucket (poll + manual only, never
    // Realtime - which is INSERT-driven). Records to pendingDeletions; the
    // actual cascade only runs on an explicit confirm.
    if (via !== 'realtime') await detectBucketDeletions(names);

    const fresh = names.filter((n) => !done.has(n) && !autoImportState.processedPaths.includes(n));
    if (via === 'poll') {
      autoImportState.lastPollAt = new Date().toISOString();
      autoImportState.lastPollFoundNew = fresh.length;
    }
    for (const n of fresh) {
      // eslint-disable-next-line no-await-in-loop
      await processOneFile(n, via, done);
      done.add(n);
    }
    return { scanned: names.length, newFiles: fresh.length };
  };
  // Poll skips a tick if a run is already in flight (no backlog); manual and
  // realtime-with-no-name queue behind it.
  const res = via === 'poll' ? await tryLock(body) : await withLock(body);
  return res ?? { scanned: 0, newFiles: 0 };
}

/**
 * Processes ONE known path - used by the Realtime handler, which gets the
 * object name straight from the INSERT payload. Storage's list() endpoint can
 * lag a freshly-uploaded object by seconds, so acting on the name directly is
 * how the Realtime path stays fast; the list-based poll is the catch-up.
 */
export async function runAutoImportForPath(name: string, via: AutoImportLogEntry['via']): Promise<void> {
  await withLock(async () => {
    const done = await committedPaths(); // re-checked inside the lock: an
    // earlier queued run for the same file may have committed it already.
    if (!done.has(name) && !autoImportState.processedPaths.includes(name)) {
      await processOneFile(name, via, done);
    }
  });
}

// --- confirm-before-delete cascade --------------------------------------------

export interface ImportDeletionImpact {
  importBatchId: string;
  found: boolean;
  bidderCount: number;
  byTender: { tenderTitle: string; referenceNo: string; bidders: number }[];
  documents: number;
  verificationResults: number;
  scores: number;
  auditLogs: number;
  decisions: number; // real PO calls - shown prominently in the panel
}

/**
 * Fresh (never cached) count of exactly what a cascade for this importBatchId
 * would remove. Only bidders whose importBatchId matches - never another
 * batch, never seed bidders (those have importBatchId = null).
 */
export async function importDeletionImpact(importBatchId: string): Promise<ImportDeletionImpact> {
  const bidders = await prisma.bidder.findMany({
    where: { importBatchId },
    select: { id: true, tender: { select: { title: true, referenceNo: true } } },
  });
  const ids = bidders.map((b) => b.id);

  const byTenderMap = new Map<string, { tenderTitle: string; referenceNo: string; bidders: number }>();
  for (const b of bidders) {
    const key = b.tender.referenceNo;
    const cur = byTenderMap.get(key) ?? { tenderTitle: b.tender.title, referenceNo: b.tender.referenceNo, bidders: 0 };
    cur.bidders++;
    byTenderMap.set(key, cur);
  }

  const [documents, verificationResults, scores, decisions, auditLogs] = await Promise.all([
    ids.length ? prisma.document.count({ where: { bidderId: { in: ids } } }) : 0,
    ids.length ? prisma.verificationResult.count({ where: { bidderId: { in: ids } } }) : 0,
    ids.length ? prisma.score.count({ where: { bidderId: { in: ids } } }) : 0,
    ids.length ? prisma.decision.count({ where: { bidderId: { in: ids } } }) : 0,
    ids.length ? prisma.auditLog.count({ where: { bidderId: { in: ids } } }) : 0,
  ]);

  return {
    importBatchId,
    found: bidders.length > 0,
    bidderCount: ids.length,
    byTender: [...byTenderMap.values()].sort((a, b) => a.tenderTitle.localeCompare(b.tenderTitle)),
    documents,
    verificationResults,
    scores,
    decisions,
    auditLogs,
  };
}

export interface CascadeResult {
  importBatchId: string;
  deleted: { auditLogs: number; decisions: number; scores: number; verificationResults: number; documents: number; bidders: number };
}

/**
 * The cascade - runs ONLY on an explicit confirm from AutoImportPanel.
 * Deletes, in FK-safe order, exactly the bidders with this importBatchId and
 * everything hanging off them. Never touches Tender, never a bidder from
 * another batch or the seed data, and keeps the ImportBatch row itself as the
 * historical record that this import happened and was reverted.
 */
export async function cascadeDeleteImport(importBatchId: string): Promise<CascadeResult> {
  const bidders = await prisma.bidder.findMany({ where: { importBatchId }, select: { id: true } });
  const ids = bidders.map((b) => b.id);

  if (ids.length === 0) {
    autoImportState.pendingDeletions = autoImportState.pendingDeletions.filter((p) => p.importBatchId !== importBatchId);
    return { importBatchId, deleted: { auditLogs: 0, decisions: 0, scores: 0, verificationResults: 0, documents: 0, bidders: 0 } };
  }

  const w = { bidderId: { in: ids } };
  const [al, dec, sc, vr, doc, bid] = await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: w }),
    prisma.decision.deleteMany({ where: w }),
    prisma.score.deleteMany({ where: w }),
    prisma.verificationResult.deleteMany({ where: w }),
    prisma.document.deleteMany({ where: w }),
    prisma.bidder.deleteMany({ where: { id: { in: ids } } }),
  ]);

  autoImportState.pendingDeletions = autoImportState.pendingDeletions.filter((p) => p.importBatchId !== importBatchId);

  // Deliberately no new audit row here - the cascade is a pure deletion. The
  // ImportBatch row and its original DATASET_IMPORTED audit entry stay as the
  // record that this import happened; the on-screen log notes the revert.
  pushLog({
    at: new Date().toISOString(),
    filename: importBatchId,
    outcome: 'skipped',
    detail: `import reverted on confirm: removed ${bid.count} bidder(s), ${doc.count} document(s), ${vr.count} verification result(s), ${sc.count} score(s), ${dec.count} decision(s), ${al.count} audit log(s). ImportBatch row kept.`,
    via: 'manual',
  });

  return {
    importBatchId,
    deleted: { auditLogs: al.count, decisions: dec.count, scores: sc.count, verificationResults: vr.count, documents: doc.count, bidders: bid.count },
  };
}

/** "Keep them" - just drop the card; the file stays gone from Storage, the data stays. */
export function dismissPendingDeletion(importBatchId: string): void {
  autoImportState.pendingDeletions = autoImportState.pendingDeletions.filter((p) => p.importBatchId !== importBatchId);
}

// --- watcher lifecycle ----------------------------------------------------

function subscribeRealtime(): void {
  if (rt.channel || !rt.supabaseClient) return;
  autoImportState.realtime = 'connecting';
  rt.channel = rt.supabaseClient
    .channel('storage-imports')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'storage', table: 'objects', filter: `bucket_id=eq.${DATASET_BUCKET}` },
      (payload) => {
        if (!rt.channel || rt.realtimeMuted) return; // torn down / muted for a fallback demo
        autoImportState.realtimeLastEventAt = new Date().toISOString();
        const rec = payload.new as { name?: string } | undefined;
        const name = rec?.name;
        const p = name ? runAutoImportForPath(name, 'realtime') : runAutoImport('realtime');
        p.catch((err) => {
          pushLog({ at: new Date().toISOString(), filename: name ?? '(realtime)', outcome: 'error', detail: String(err), via: 'realtime' });
        });
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') autoImportState.realtime = 'connected';
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') autoImportState.realtime = 'error';
      else if (status === 'CLOSED') autoImportState.realtime = 'disconnected';
    });
}

/**
 * Starts (once per process) the Realtime subscription on storage.objects
 * INSERT for the dataset-uploads bucket, plus a polling fallback every ~9s.
 * Idempotent. Called lazily from the /api/auto-import status + scan routes,
 * so the watcher is live from the moment someone opens /admin/import (or
 * hits either route) and stays up for the server process's lifetime.
 * (A Node-runtime instrumentation.ts hook would make it boot-time always-on,
 * but Next 14's instrumentation bundle can't pull in the adm-zip/xlsx import
 * pipeline - so lazy start it is.)
 */
export function ensureAutoImportWatcher(): void {
  if (autoImportState.watcherStarted && rt.pollTimer) return;
  autoImportState.watcherStarted = true;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rt.pollTimer) {
    const tick = () => {
      runAutoImport('poll').catch((err) => {
        pushLog({ at: new Date().toISOString(), filename: '(poll)', outcome: 'error', detail: String(err), via: 'poll' });
      });
    };
    rt.pollTimer = setInterval(tick, autoImportState.pollIntervalMs);
    if (rt.pollTimer.unref) rt.pollTimer.unref();
    tick(); // immediate first scan
  }

  if (!url || !key) {
    autoImportState.realtime = 'off';
    pushLog({ at: new Date().toISOString(), filename: '(watcher)', outcome: 'ignored', detail: 'SUPABASE_URL / SERVICE_ROLE_KEY not set — Realtime off, polling only.', via: 'manual' });
    return;
  }
  if (!rt.supabaseClient) {
    rt.supabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  subscribeRealtime();
}

function tearDownRealtime(): void {
  if (rt.channel) {
    const c = rt.channel;
    rt.channel = null; // null first so the handler guard short-circuits an in-flight event
    rt.supabaseClient?.removeChannel(c).catch(() => {});
  }
  rt.supabaseClient?.realtime.disconnect();
  autoImportState.realtime = 'disconnected';
}

export function stopAutoImportWatcher(): void {
  if (rt.pollTimer) clearInterval(rt.pollTimer);
  rt.pollTimer = null;
  tearDownRealtime();
  autoImportState.watcherStarted = false;
  autoImportState.realtime = 'off';
}

/**
 * Toggle the Realtime path (the polling fallback keeps running regardless).
 * Demonstrates that a dropped Realtime connection doesn't stop auto-import -
 * the ~9s poll still picks the file up. `off` mutes the handler AND tears the
 * socket down; `on` restores both.
 */
export function setRealtimeEnabled(on: boolean): void {
  if (!on) {
    rt.realtimeMuted = true;
    tearDownRealtime();
    return;
  }
  rt.realtimeMuted = false;
  if (rt.channel) return;
  rt.supabaseClient?.realtime.connect();
  subscribeRealtime();
}
