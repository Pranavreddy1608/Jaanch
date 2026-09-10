import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { downloadDatasetFile } from '@/lib/supabaseStorage';
import type { BidderDocumentEntry, CommitResult, ImportMode, ImportReview, RecordsEntry, TenderEntry } from './types';

/**
 * The standard requirement set every GeM seller faces regardless of the
 * specific tender - identical to what prisma/seed.ts attaches to all 10
 * seeded tenders via its shared gstReq / panReq / blacklistReq / epfoReq /
 * digilockerReq builders. The tender-specific rows (OEM authorization, the
 * Udyam MSE %/cap, the Make-in-India %/cap or waiver) are NOT added here:
 * they need per-tender judgement the PDF extraction doesn't provide, so an
 * imported tender carries only this baseline until an officer configures more.
 */
function standardRequirements() {
  return [
    { code: 'GST_FILING', label: 'GST Registration & Return Filing', sourceType: 'gst', mandatory: true, ruleConfig: JSON.stringify({ maxFilingDelayMonths: 2, basis: 'GeM seller-registration requirement.' }) },
    { code: 'PAN_IT_COMPLIANCE', label: 'PAN Validity', sourceType: 'pan', mandatory: true, ruleConfig: JSON.stringify({ basis: 'GeM seller-registration requirement.' }) },
    { code: 'BLACKLIST_CHECK', label: 'Blacklisting / Debarment Check', sourceType: 'blacklist', mandatory: true, ruleConfig: JSON.stringify({ basis: 'Standard eligibility gate (CVC / ministry debarment lists).' }) },
    { code: 'EPFO_ESIC_COMPLIANCE', label: 'EPFO / ESIC & Labour Code Compliance (where applicable)', sourceType: 'epfoEsic', mandatory: false, ruleConfig: JSON.stringify({ basis: 'GeM GTC: compliance with the four Labour Codes / pre-existing labour laws.' }) },
    { code: 'DOCUMENT_VERIFICATION', label: 'DigiLocker Document Verification', sourceType: 'digilocker', mandatory: false, ruleConfig: JSON.stringify({}) },
  ];
}

/** Exact deletion order from prisma/seed.ts main(), plus ImportBatch. */
async function wipeAll() {
  await prisma.auditLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.score.deleteMany();
  await prisma.verificationResult.deleteMany();
  await prisma.document.deleteMany();
  await prisma.bidder.deleteMany();
  await prisma.complianceRequirement.deleteMany();
  await prisma.tender.deleteMany();
  await prisma.importBatch.deleteMany(); // Tender FKs to ImportBatch, so after tenders
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'company';

function toDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Which entries can actually be committed as tenders. */
export function committableTenders(review: ImportReview): TenderEntry[] {
  return review.entries.filter((e): e is TenderEntry => e.kind === 'tender' && e.blockers.length === 0);
}

export function recordEntries(review: ImportReview): RecordsEntry[] {
  return review.entries.filter((e): e is RecordsEntry => e.kind === 'records');
}

export function bidderDocumentEntries(review: ImportReview): BidderDocumentEntry[] {
  return review.entries.filter((e): e is BidderDocumentEntry => e.kind === 'bidderDocument');
}

/**
 * Applies a reviewed import to the database. 'replace-all' wipes everything
 * first (seed.ts deletion order). Creates one ImportBatch row referencing the
 * bucket file's storagePath (never a copy of the bytes) and links new Tender
 * rows to it.
 */
export async function commitImport(review: ImportReview, mode: ImportMode, processedBy: string): Promise<CommitResult> {
  const tenders = committableTenders(review);
  const records = recordEntries(review);
  const bidderDocs = bidderDocumentEntries(review);
  const notes: string[] = [];

  if (mode === 'replace-all' && tenders.length === 0) {
    throw new Error('Replace All needs at least one importable tender in the file — otherwise it would leave the database with no tenders. Use Add instead, or include the tender PDF.');
  }
  if (tenders.length === 0 && records.every((r) => r.extraction.records.length === 0) && bidderDocs.length === 0) {
    throw new Error('Nothing to import: no committable tender, no bidder records, and no bidder documents were found in this file.');
  }

  if (mode === 'replace-all') {
    await wipeAll();
    notes.push('Replace All: cleared all existing tenders, bidders, requirements, verification results, scores, decisions, audit logs, and import batches.');
  }

  const batch = await prisma.importBatch.create({
    data: {
      filename: review.sourceFilename,
      storagePath: review.sourcePath,
      mimeType: review.sourceMimeType,
      mode,
      processedBy,
      recordsCreated: 0,
      summary: null,
    },
  });

  let created = 0;
  let documentsAttached = 0;

  // --- tenders ---
  for (const t of tenders) {
    const x = t.extraction;
    const existing = await prisma.tender.findUnique({ where: { referenceNo: x.referenceNo! }, select: { id: true } });
    if (existing) {
      notes.push(`Tender ${x.referenceNo} already exists — skipped (a Replace All would have removed it first).`);
      continue;
    }
    if (x.emdRequired == null) notes.push(`Tender ${x.referenceNo}: EMD requirement was not stated in the document — defaulted to "required".`);
    await prisma.tender.create({
      data: {
        referenceNo: x.referenceNo!,
        title: x.title!,
        organization: x.organization!,
        department: x.department!,
        category: x.category!,
        documentDated: toDate(x.documentDated),
        bidEndsAt: toDate(x.bidEndsAt),
        emdRequired: x.emdRequired ?? undefined,
        emdNote: x.emdNote,
        miiNote: x.miiNote,
        mseNote: x.mseNote,
        importBatchId: batch.id,
        requirements: { create: standardRequirements() },
      },
    });
    created++;
  }

  // --- bidder records (attached to an existing tender matched by referenceNo) ---
  for (const rec of records) {
    for (const b of rec.extraction.records) {
      if (!b.tenderReferenceNo) {
        notes.push(`Record "${b.name}": no tender reference — skipped (can't attach a bidder to a tender).`);
        continue;
      }
      const tender = await prisma.tender.findUnique({ where: { referenceNo: b.tenderReferenceNo }, select: { id: true } });
      if (!tender) {
        notes.push(`Record "${b.name}": tender ${b.tenderReferenceNo} not found — skipped.`);
        continue;
      }

      // Dedupe within a tender (same as the tender loop skips existing tenders).
      // Bidder.key carries a random suffix so it can't dedupe - use the natural
      // key: GSTIN, else PAN, else name, all scoped to this tender. Matters for
      // repeated "Add" of the same spreadsheet; Replace All wiped bidders first
      // so nothing matches there.
      const dupWhere = b.gstin
        ? { tenderId: tender.id, gstin: b.gstin }
        : b.pan
          ? { tenderId: tender.id, pan: b.pan }
          : { tenderId: tender.id, name: b.name! };
      const existingBidder = await prisma.bidder.findFirst({ where: dupWhere, select: { id: true } });
      if (existingBidder) {
        notes.push(`Bidder "${b.name}" already exists on tender ${b.tenderReferenceNo} — skipped.`);
        continue;
      }

      const companySlug = b.companySlug ?? slug(b.name!);
      const key = `${companySlug}-import-${crypto.randomBytes(3).toString('hex')}`;
      await prisma.bidder.create({
        data: {
          tenderId: tender.id,
          key,
          companySlug,
          name: b.name!,
          gstin: b.gstin,
          pan: b.pan,
          udyamNumber: b.udyamNumber,
          claimedTurnoverInrLakh: b.claimedTurnoverInrLakh ?? undefined,
          claimedEmployeeCount: b.claimedEmployeeCount ?? undefined,
        },
      });
      created++;
    }
  }

  // --- bidder documents (PDFs inside a manifest-driven ZIP, attached to an
  // already-existing bidder matched by tenderReferenceNo + companySlug) ---
  if (bidderDocs.length > 0) {
    // The review object only ever carries lightweight metadata for these
    // entries (never the file bytes - that would bloat reviewJson, which
    // travels through this commit Server Action's body). Re-download the
    // source ZIP once from Supabase Storage and pull each entry's bytes out
    // by its in-zip path. This is also what keeps the import working
    // regardless of how large the ZIP or its individual PDFs are - the
    // Server Action body only ever carries filenames and doc types, never
    // the documents themselves.
    let sourceZip: AdmZip;
    try {
      const zipBuffer = await downloadDatasetFile(review.sourcePath);
      sourceZip = new AdmZip(zipBuffer);
    } catch (err) {
      throw new Error(`Could not re-download "${review.sourceFilename}" from Storage to attach its bidder documents: ${err instanceof Error ? err.message : err}`);
    }

    for (const d of bidderDocs) {
      const tender = await prisma.tender.findUnique({ where: { referenceNo: d.tenderReferenceNo }, select: { id: true } });
      if (!tender) {
        notes.push(`Document "${d.filename}": tender ${d.tenderReferenceNo} not found — skipped.`);
        continue;
      }
      const bidder = await prisma.bidder.findFirst({ where: { tenderId: tender.id, companySlug: d.companySlug }, select: { id: true } });
      if (!bidder) {
        notes.push(`Document "${d.filename}": no bidder with company slug "${d.companySlug}" on tender ${d.tenderReferenceNo} — import that bidder's spreadsheet first, then re-review this ZIP.`);
        continue;
      }
      const zipEntry = sourceZip.getEntry(d.filename);
      if (!zipEntry) {
        notes.push(`Document "${d.filename}": could not find this file inside the ZIP on re-read — skipped.`);
        continue;
      }
      const fileData = zipEntry.getData();
      const fileName = d.filename.split('/').pop() ?? d.filename;

      await prisma.$transaction([
        prisma.document.deleteMany({ where: { bidderId: bidder.id, docType: d.docType } }),
        prisma.document.create({
          data: { bidderId: bidder.id, docType: d.docType, fileName, mimeType: d.mimeType, fileData, rawText: null },
        }),
      ]);
      documentsAttached++;
    }
  }

  const summaryParts: string[] = [];
  const tCount = tenders.length ? Math.min(created, tenders.length) : 0;
  if (created > 0) summaryParts.push(`${created} record(s) created`);
  if (documentsAttached > 0) summaryParts.push(`${documentsAttached} document(s) attached`);
  if (review.warnings.length) summaryParts.push(`${review.warnings.length} warning(s)`);
  if (notes.length) summaryParts.push(`${notes.length} note(s)`);
  const summary = `${mode === 'replace-all' ? 'Replace All' : 'Add'} from "${review.sourceFilename}": ${summaryParts.join(', ') || 'nothing created'}.${notes.length ? ' ' + notes.join(' ') : ''}`;

  const updated = await prisma.importBatch.update({
    where: { id: batch.id },
    data: { recordsCreated: created, summary },
  });

  await logAudit({
    actor: `${processedBy} (import)`,
    action: 'DATASET_IMPORTED',
    details: { importBatchId: batch.id, filename: review.sourceFilename, mode, recordsCreated: created, documentsAttached, tenders: tCount },
  });

  return { importBatchId: updated.id, recordsCreated: created, summary, notes };
}
