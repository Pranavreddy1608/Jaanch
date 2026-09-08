'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { runVerificationForBidder } from './orchestrator';
import { logAudit } from './auditLog';
import { getSession } from './session';

async function revalidateBidder(bidderId: string) {
  const b = await prisma.bidder.findUnique({ where: { id: bidderId }, select: { tenderId: true } });
  revalidatePath('/dashboard');
  if (b) revalidatePath(`/tenders/${b.tenderId}`);
  revalidatePath(`/bidders/${bidderId}`);
}

export async function runVerification(bidderId: string) {
  if (!bidderId) throw new Error('Missing bidder.');
  await runVerificationForBidder(bidderId);
  await revalidateBidder(bidderId);
}

export type UploadState = { status: 'idle' } | { status: 'ok'; message: string } | { status: 'error'; message: string };

const ALLOWED_UPLOAD_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Uploads a real document file (PDF/image) for a bidder. The file is stored
 * on the Document row and read directly by the multimodal AI extraction
 * step on the next verification run. Uploading replaces any existing
 * document of the same type for that bidder.
 *
 * Form-state action shape (used with useFormState) so validation errors
 * surface in the UI instead of throwing.
 */
export async function uploadDocument(_prev: UploadState, formData: FormData): Promise<UploadState> {
  try {
    const bidderId = String(formData.get('bidderId') ?? '');
    const docType = String(formData.get('docType') ?? 'LOCAL_CONTENT_CERTIFICATE');
    const file = formData.get('file');

    if (!bidderId) return { status: 'error', message: 'Missing bidder.' };
    if (!(file instanceof File) || file.size === 0) return { status: 'error', message: 'Choose a file to upload.' };
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      return { status: 'error', message: `Unsupported file type "${file.type || 'unknown'}". Upload a PDF, PNG, JPEG, or WebP.` };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { status: 'error', message: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 8 MB.` };
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    await prisma.$transaction([
      prisma.document.deleteMany({ where: { bidderId, docType } }),
      prisma.document.create({
        data: { bidderId, docType, fileName: file.name, mimeType: file.type, fileData: bytes, rawText: null },
      }),
    ]);

    await logAudit({
      bidderId,
      actor: 'SYSTEM',
      action: 'DOCUMENT_UPLOADED',
      details: { docType, fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    });

    revalidatePath(`/bidders/${bidderId}`);
    return { status: 'ok', message: `Uploaded ${file.name}. Re-run verification to check it.` };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Upload failed.' };
  }
}

export type DecisionState = { status: 'idle' } | { status: 'ok'; message: string } | { status: 'error'; message: string };

/**
 * Records the Procurement Officer's final call. Form-state action shape
 * (used with useFormState) so validation errors surface in the UI.
 */
export async function recordDecision(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  try {
    const session = getSession();
    if (!session) return { status: 'error', message: 'Session expired — sign in again.' };
    if (session.role !== 'officer') {
      return { status: 'error', message: 'Only a Procurement Officer can record decisions.' };
    }
    const officerName = session.name;

    const bidderId = String(formData.get('bidderId') ?? '');
    const outcome = String(formData.get('outcome') ?? '');
    const remarks = String(formData.get('remarks') ?? '').trim();

    if (!bidderId) return { status: 'error', message: 'Missing bidder.' };
    if (!outcome) return { status: 'error', message: 'Choose a decision.' };

    await prisma.decision.create({
      data: { bidderId, officerName, outcome, remarks: remarks || null },
    });

    await logAudit({
      bidderId,
      actor: officerName,
      action: 'PO_DECISION_RECORDED',
      details: { outcome, remarks },
    });

    await revalidateBidder(bidderId);
    return { status: 'ok', message: `Decision recorded: ${outcome}.` };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Could not record decision.' };
  }
}
