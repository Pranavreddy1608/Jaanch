import { NextRequest, NextResponse } from 'next/server';
import { importSecretOk } from '@/lib/import/adminGate';
import { importDeletionImpact, cascadeDeleteImport, dismissPendingDeletion } from '@/lib/import/autoImport';

export const dynamic = 'force-dynamic';

/**
 * Backs AutoImportPanel's pending-deletion cards.
 *
 *   GET  ?secret=&importBatchId=  -> fresh (uncached) impact: how many
 *        bidders trace to that batch, broken down by tender, plus their
 *        document / verification-result / score / decision counts.
 *
 *   POST body { importBatchId, action: 'delete' | 'keep' }
 *        'delete' runs the FK-safe cascade (bidders with that exact batch id
 *        only; Tender and other batches untouched; ImportBatch row kept).
 *        'keep' just dismisses the card.
 *
 * Gated by ADMIN_IMPORT_SECRET, like the rest of /admin/import.
 */
export async function GET(req: NextRequest) {
  if (!importSecretOk(req.nextUrl.searchParams.get('secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const importBatchId = req.nextUrl.searchParams.get('importBatchId');
  if (!importBatchId) return NextResponse.json({ error: 'importBatchId required' }, { status: 400 });

  return NextResponse.json(await importDeletionImpact(importBatchId));
}

export async function POST(req: NextRequest) {
  if (!importSecretOk(req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-admin-import-secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { importBatchId?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad body' }, { status: 400 });
  }
  const importBatchId = typeof body.importBatchId === 'string' ? body.importBatchId : null;
  const action = body.action === 'delete' || body.action === 'keep' ? body.action : null;
  if (!importBatchId || !action) return NextResponse.json({ error: 'importBatchId and action required' }, { status: 400 });

  if (action === 'keep') {
    dismissPendingDeletion(importBatchId);
    return NextResponse.json({ action: 'keep', importBatchId });
  }

  const result = await cascadeDeleteImport(importBatchId);
  return NextResponse.json({ action: 'delete', ...result });
}
