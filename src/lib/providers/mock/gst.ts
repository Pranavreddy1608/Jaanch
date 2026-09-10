import { gstRegistry } from '@/lib/fixtures/registryFixtures';
import { validateGstin } from '@/lib/validation/gstin';
import { validatePan } from '@/lib/validation/pan';
import type { GstCertificateExtraction } from '@/lib/ai/documentExtraction';
import type { VerificationProvider, VerificationResultPayload } from '../types';

/**
 * Layers:
 *   1. REAL - structure + the actual Mod-36 (Luhn mod 36) checksum GSTN uses
 *      for the 15th character, plus a check that the embedded PAN (chars
 *      3-12) matches the PAN the bidder supplied. Deterministic, no fixtures.
 *   1b. REAL, ADDITIVE - if the bidder has uploaded a GST_CERTIFICATE
 *      document, the multimodal LLM reads the GSTIN off it and this is
 *      cross-checked against the bidder's declared GSTIN. A bidder with no
 *      certificate uploaded is completely unaffected by this layer.
 *   2. SIMULATED - registration status + return-filing history. Real
 *      production access requires GSP credentials (analysis doc §3), so this
 *      layer reads a fixture table.
 */
export const gstProvider: VerificationProvider = {
  key: 'gst',
  async verify({ bidder, documents }): Promise<VerificationResultPayload> {
    if (!bidder.gstin) {
      return { status: 'MISSING', confidence: 1, isMock: false, method: 'real', raw: { note: 'No GSTIN supplied by bidder.' } };
    }

    // --- Layer 1: real checksum + structure ---
    const v = validateGstin(bidder.gstin);
    if (!v.valid) {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 1,
        isMock: false,
        method: 'real',
        raw: { gstin: bidder.gstin, checksumValid: false, note: `GSTIN validation failed — ${v.error}` },
      };
    }

    const realPart: Record<string, unknown> = {
      gstin: bidder.gstin,
      checksumValid: true,
      stateCode: v.stateCode,
      embeddedPan: v.embeddedPan,
    };

    // real cross-check: the PAN embedded in the GSTIN must match the bidder's PAN
    if (bidder.pan && validatePan(bidder.pan).valid && v.embeddedPan !== bidder.pan.trim().toUpperCase()) {
      return {
        status: 'INCONSISTENT',
        confidence: 1,
        isMock: false,
        method: 'real',
        raw: {
          ...realPart,
          note: `GSTIN checksum is valid, but the PAN embedded in it ("${v.embeddedPan}") does not match the bidder's declared PAN ("${bidder.pan}").`,
        },
      };
    }

    // --- Layer 1b: real, additive document cross-check ---
    const certDoc = documents.find((d) => d.docType === 'GST_CERTIFICATE');
    let documentNote = '';
    if (certDoc) {
      const ex = certDoc.extractedData as GstCertificateExtraction | null | undefined;
      if (ex?.looksLikeGstCertificate === false) {
        return {
          status: 'INCONSISTENT',
          confidence: 0.9,
          isMock: false,
          method: 'real',
          raw: { ...realPart, note: 'The uploaded GST document does not appear to be a GST registration certificate. Please check the file that was uploaded.' },
        };
      }
      if (ex?.gstin && ex.gstin.trim().toUpperCase() !== bidder.gstin.trim().toUpperCase()) {
        return {
          status: 'INCONSISTENT',
          confidence: 0.9,
          isMock: false,
          method: 'real',
          raw: {
            ...realPart,
            uploadedGstin: ex.gstin,
            note: `The uploaded GST certificate reads GSTIN "${ex.gstin}", which does not match the bidder's declared GSTIN "${bidder.gstin}".`,
          },
        };
      }
      if (ex?.gstin) {
        realPart.documentVerified = true;
        documentNote = ' The uploaded GST certificate was read and its GSTIN matches the declared GSTIN (real document cross-check).';
      }
    }

    const disclaimer = `GSTIN structure and Mod-36 checksum are valid (real check).${documentNote} Registration status and filing history below are a simulated GSTN lookup.`;

    // --- Layer 2: simulated registration / filing ---
    const record = gstRegistry[bidder.gstin];
    if (!record) {
      return {
        status: 'INCONSISTENT',
        confidence: 0.8,
        isMock: true,
        method: 'real+simulated',
        raw: { ...realPart, note: `${disclaimer} No matching registration record found in the simulated registry.` },
      };
    }
    if (record.status !== 'Active') {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 0.9,
        isMock: true,
        method: 'real+simulated',
        raw: { ...realPart, ...record, note: `${disclaimer} Registration status is "${record.status}".` },
      };
    }

    return {
      status: 'VERIFIED_OK',
      confidence: 0.9,
      isMock: true,
      method: 'real+simulated',
      raw: { ...realPart, ...record, note: disclaimer },
    };
  },
};
