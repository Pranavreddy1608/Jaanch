import { gstRegistry } from '@/lib/fixtures/registryFixtures';
import type { VerificationProvider, VerificationResultPayload } from '../types';

export const gstProvider: VerificationProvider = {
  key: 'gst',
  async verify({ bidder }): Promise<VerificationResultPayload> {
    if (!bidder.gstin) {
      return { status: 'MISSING', confidence: 1, isMock: true, raw: { note: 'No GSTIN supplied by bidder.' } };
    }

    const record = gstRegistry[bidder.gstin];
    if (!record) {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 0.95,
        isMock: true,
        raw: { note: `GSTIN ${bidder.gstin} not found in registry (simulated GSTN lookup).` },
      };
    }

    if (record.status !== 'Active') {
      return { status: 'VERIFIED_FAIL', confidence: 0.95, isMock: true, raw: { ...record } };
    }

    return { status: 'VERIFIED_OK', confidence: 0.95, isMock: true, raw: { ...record } };
  },
};
