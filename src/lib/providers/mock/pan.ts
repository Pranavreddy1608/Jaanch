import { panRegistry } from '@/lib/fixtures/registryFixtures';
import { validatePan } from '@/lib/validation/pan';
import type { PanCardExtraction } from '@/lib/ai/documentExtraction';
import type { VerificationProvider, VerificationResultPayload } from '../types';

/**
 * Layers:
 *   1. REAL - structural validation against the Income Tax Dept's specified
 *      PAN format (10 chars, holder-type char). Deterministic, no fixtures.
 *   1b. REAL, ADDITIVE - if the bidder has uploaded a PAN_CARD document, the
 *      multimodal LLM reads the PAN number off it and this is cross-checked
 *      against the bidder's declared PAN. A bidder with no PAN card uploaded
 *      is completely unaffected by this layer - it only ever adds a real
 *      document-backed cross-check, never a new way to fail or go MISSING.
 *   2. SIMULATED - a registry cross-check (holder name, PAN active status,
 *      latest IT-return filing). Real production access is the Income Tax
 *      "Verify PAN" API, which has no open signup (analysis doc §3), so this
 *      layer reads a fixture table.
 */
export const panProvider: VerificationProvider = {
  key: 'pan',
  async verify({ bidder, documents }): Promise<VerificationResultPayload> {
    if (!bidder.pan) {
      return { status: 'MISSING', confidence: 1, isMock: false, method: 'real', raw: { note: 'No PAN supplied by bidder.' } };
    }

    // --- Layer 1: real structural validation ---
    const v = validatePan(bidder.pan);
    if (!v.valid) {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 1,
        isMock: false,
        method: 'real',
        raw: { pan: bidder.pan, structurallyValid: false, note: `PAN structural validation failed — ${v.error}` },
      };
    }

    const realPart: Record<string, unknown> = {
      pan: bidder.pan,
      structurallyValid: true,
      holderType: v.holderType,
      holderTypeCode: v.holderTypeCode,
    };

    // --- Layer 1b: real, additive document cross-check ---
    const cardDoc = documents.find((d) => d.docType === 'PAN_CARD');
    let documentNote = '';
    if (cardDoc) {
      const ex = cardDoc.extractedData as PanCardExtraction | null | undefined;
      if (ex?.looksLikePanCard === false) {
        return {
          status: 'INCONSISTENT',
          confidence: 0.9,
          isMock: false,
          method: 'real',
          raw: { ...realPart, note: 'The uploaded PAN document does not appear to be a PAN card. Please check the file that was uploaded.' },
        };
      }
      if (ex?.panNumber && ex.panNumber.trim().toUpperCase() !== bidder.pan.trim().toUpperCase()) {
        return {
          status: 'INCONSISTENT',
          confidence: 0.9,
          isMock: false,
          method: 'real',
          raw: {
            ...realPart,
            uploadedPan: ex.panNumber,
            note: `The uploaded PAN card reads "${ex.panNumber}", which does not match the bidder's declared PAN "${bidder.pan}".`,
          },
        };
      }
      if (ex?.panNumber) {
        realPart.documentVerified = true;
        documentNote = ' The uploaded PAN card was read and its number matches the declared PAN (real document cross-check).';
      }
    }

    const disclaimer = `PAN is structurally valid per the Income Tax Dept format (real check).${documentNote} Registration status below is a simulated Income Tax database lookup.`;

    // --- Layer 2: simulated registry cross-check ---
    const record = panRegistry[bidder.pan];
    if (!record) {
      return {
        status: 'INCONSISTENT',
        confidence: 0.8,
        isMock: true,
        method: 'real+simulated',
        raw: { ...realPart, note: `${disclaimer} No matching holder record found in the simulated registry.` },
      };
    }
    if (record.panStatus !== 'Valid') {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 0.9,
        isMock: true,
        method: 'real+simulated',
        raw: { ...realPart, ...record, note: `${disclaimer} Registry reports PAN status "${record.panStatus}".` },
      };
    }
    if (record.itFilingStatus !== 'Filed') {
      return {
        status: 'INCONSISTENT',
        confidence: 0.85,
        isMock: true,
        method: 'real+simulated',
        raw: { ...realPart, ...record, note: `${disclaimer} Latest Income Tax return has not been filed (simulated).` },
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
