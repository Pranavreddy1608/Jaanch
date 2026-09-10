import { prisma } from '@/lib/db';
import type { VerificationProvider, VerificationResultPayload } from '../types';

export const blacklistProvider: VerificationProvider = {
  key: 'blacklist',
  async verify({ bidder }): Promise<VerificationResultPayload> {
    const entries = await prisma.registryBlacklist.findMany();
    const hit = entries.find((entry) => {
      if (entry.matchField === 'pan') return bidder.pan === entry.matchValue;
      if (entry.matchField === 'gstin') return bidder.gstin === entry.matchValue;
      return bidder.name.toLowerCase().includes(entry.matchValue.toLowerCase());
    });

    if (!hit) {
      return { status: 'VERIFIED_OK', confidence: 0.9, isMock: true, raw: { note: 'No match found on CVC/debarment list (looked up in the Supabase blacklist registry table).' } };
    }

    const stillActive = new Date(hit.debarredUntil).getTime() > Date.now();

    return {
      status: stillActive ? 'VERIFIED_FAIL' : 'VERIFIED_OK',
      confidence: 0.9,
      isMock: true,
      raw: { ...hit, stillActive },
    };
  },
};
