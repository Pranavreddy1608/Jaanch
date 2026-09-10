import { udyamRegistry } from '@/lib/fixtures/registryFixtures';
import type { UdyamCertificateExtraction } from '@/lib/ai/documentExtraction';
import type { VerificationProvider, VerificationResultPayload } from '../types';

function nameRoughlyMatches(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = norm(a);
  const nb = norm(b);
  return na.includes(nb) || nb.includes(na);
}

export const udyamProvider: VerificationProvider = {
  key: 'udyam',
  async verify({ bidder, documents }): Promise<VerificationResultPayload> {
    if (!bidder.udyamNumber) {
      // Presence check is deterministic - real, not simulated (matches gst.ts/pan.ts).
      return { status: 'MISSING', confidence: 1, isMock: false, method: 'real', raw: { note: 'No Udyam number supplied by bidder.' } };
    }

    // --- Real, additive: cross-check an uploaded Udyam certificate against
    // the declared Udyam number, if one was uploaded. A bidder with no
    // certificate uploaded is completely unaffected by this layer - it only
    // ever adds a real document-backed cross-check, never a new way to fail
    // or go MISSING. ---
    const certDoc = documents.find((d) => d.docType === 'UDYAM_CERTIFICATE');
    let documentNote = '';
    if (certDoc) {
      const ex = certDoc.extractedData as UdyamCertificateExtraction | null | undefined;
      if (ex?.looksLikeUdyamCertificate === false) {
        return {
          status: 'INCONSISTENT',
          confidence: 0.9,
          isMock: false,
          method: 'real',
          raw: { note: 'The uploaded Udyam document does not appear to be a Udyam Registration Certificate. Please check the file that was uploaded.' },
        };
      }
      if (ex?.udyamNumber && ex.udyamNumber.trim().toUpperCase() !== bidder.udyamNumber.trim().toUpperCase()) {
        return {
          status: 'INCONSISTENT',
          confidence: 0.9,
          isMock: false,
          method: 'real',
          raw: {
            uploadedUdyamNumber: ex.udyamNumber,
            note: `The uploaded Udyam certificate reads "${ex.udyamNumber}", which does not match the bidder's declared Udyam number "${bidder.udyamNumber}".`,
          },
        };
      }
      if (ex?.udyamNumber) {
        documentNote = ' The uploaded Udyam certificate was read and its number matches the declared Udyam number (real document cross-check).';
      }
    }

    const record = udyamRegistry[bidder.udyamNumber];
    if (!record) {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 0.95,
        isMock: true,
        raw: { note: `Udyam number ${bidder.udyamNumber} not found in registry (simulated Udyam portal lookup).${documentNote}` },
      };
    }

    if (record.status !== 'Active') {
      return { status: 'VERIFIED_FAIL', confidence: 0.95, isMock: true, raw: { ...record, ...(documentNote ? { note: documentNote.trim() } : {}) } };
    }

    if (!nameRoughlyMatches(record.enterpriseName, bidder.name)) {
      return {
        status: 'INCONSISTENT',
        confidence: 0.8,
        isMock: true,
        raw: { ...record, note: `Registered enterprise name "${record.enterpriseName}" does not match bidder name "${bidder.name}".${documentNote}` },
      };
    }

    return { status: 'VERIFIED_OK', confidence: 0.97, isMock: true, raw: { ...record, ...(documentNote ? { note: documentNote.trim() } : {}) } };
  },
};
