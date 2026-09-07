import { gstRegistry } from '@/lib/fixtures/registryFixtures';
import { validateGstin } from '@/lib/validation/gstin';
import { validatePan } from '@/lib/validation/pan';
import type { VerificationProvider, VerificationResultPayload } from '../types';

/**
 * Two layers:
 *   1. REAL - structure + the actual Mod-36 (Luhn mod 36) checksum GSTN uses
 *      for the 15th character, plus a check that the embedded PAN (chars
 *      3-12) matches the PAN the bidder supplied. Deterministic, no fixtures.
 *   2. SIMULATED - registration status + return-filing history. Real
 *      production access requires GSP credentials (analysis doc §3), so this
 *      layer reads a fixture table.
 */
export const gstProvider: VerificationProvider = {
  key: 'gst',
  async verify({ bidder }): Promise<VerificationResultPayload> {
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

    const disclaimer =
      'GSTIN structure and Mod-36 checksum are valid (real check). Registration status and filing history below are a simulated GSTN lookup.';

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
