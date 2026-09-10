import { udyamRegistry } from '@/lib/fixtures/registryFixtures';
import type { VerificationProvider, VerificationResultPayload } from '../types';

function nameRoughlyMatches(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = norm(a);
  const nb = norm(b);
  return na.includes(nb) || nb.includes(na);
}

export const udyamProvider: VerificationProvider = {
  key: 'udyam',
  async verify({ bidder }): Promise<VerificationResultPayload> {
    if (!bidder.udyamNumber) {
      // Presence check is deterministic - real, not simulated (matches gst.ts/pan.ts).
      return { status: 'MISSING', confidence: 1, isMock: false, method: 'real', raw: { note: 'No Udyam number supplied by bidder.' } };
    }

    const record = udyamRegistry[bidder.udyamNumber];
    if (!record) {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 0.95,
        isMock: true,
        raw: { note: `Udyam number ${bidder.udyamNumber} not found in registry (simulated Udyam portal lookup).` },
      };
    }

    if (record.status !== 'Active') {
      return { status: 'VERIFIED_FAIL', confidence: 0.95, isMock: true, raw: { ...record } };
    }

    if (!nameRoughlyMatches(record.enterpriseName, bidder.name)) {
      return {
        status: 'INCONSISTENT',
        confidence: 0.8,
        isMock: true,
        raw: { ...record, note: `Registered enterprise name "${record.enterpriseName}" does not match bidder name "${bidder.name}".` },
      };
    }

    return { status: 'VERIFIED_OK', confidence: 0.97, isMock: true, raw: { ...record } };
  },
};
