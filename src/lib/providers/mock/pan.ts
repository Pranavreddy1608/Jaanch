import { panRegistry } from '@/lib/fixtures/registryFixtures';
import type { VerificationProvider, VerificationResultPayload } from '../types';

export const panProvider: VerificationProvider = {
  key: 'pan',
  async verify({ bidder }): Promise<VerificationResultPayload> {
    if (!bidder.pan) {
      return { status: 'MISSING', confidence: 1, isMock: true, raw: { note: 'No PAN supplied by bidder.' } };
    }

    const record = panRegistry[bidder.pan];
    if (!record) {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 0.95,
        isMock: true,
        raw: { note: `PAN ${bidder.pan} not found in registry (simulated Income Tax e-filing "Verify PAN" lookup).` },
      };
    }

    if (record.panStatus !== 'Valid') {
      return { status: 'VERIFIED_FAIL', confidence: 0.95, isMock: true, raw: { ...record } };
    }

    if (record.itFilingStatus !== 'Filed') {
      return {
        status: 'INCONSISTENT',
        confidence: 0.85,
        isMock: true,
        raw: { ...record, note: 'PAN is valid but latest Income Tax return has not been filed.' },
      };
    }

    return { status: 'VERIFIED_OK', confidence: 0.95, isMock: true, raw: { ...record } };
  },
};
