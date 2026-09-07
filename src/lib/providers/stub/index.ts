import type { VerificationProvider, VerificationResultPayload } from '../types';

/**
 * Stub providers for sources with no realistic student-team API path
 * (MCA21, EPFO/ESIC, NSIC, Startup India, OEM authorization live-lookup -
 * see SIH26100_Problem_Analysis.md Section 3). Each returns a clearly
 * labelled simulated result - low confidence, isMock true, and a `note`
 * explaining exactly what real integration this would require - rather
 * than pretending to be live. Deterministic per bidder (hashed on id) so
 * results are stable across runs instead of random.
 */
function hashToUnit(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

function makeStubProvider(key: string, roadmapNote: string): VerificationProvider {
  return {
    key,
    async verify({ bidder }): Promise<VerificationResultPayload> {
      const roll = hashToUnit(bidder.id + key);
      const status: VerificationResultPayload['status'] = roll > 0.85 ? 'VERIFIED_FAIL' : 'VERIFIED_OK';
      return {
        status,
        confidence: 0.5,
        isMock: true,
        raw: {
          note: `Stub provider - production integration requires ${roadmapNote}. This result is a labelled simulation, not a live check.`,
        },
      };
    },
  };
}

export const mca21Provider = makeStubProvider('mca21', 'MCA21 company-master-data API access (commercial reseller or MCA MoU)');
export const epfoEsicProvider = makeStubProvider('epfoEsic', 'EPFO/ESIC employer-compliance data sharing (no public API identified)');
export const nsicProvider = makeStubProvider('nsic', 'NSIC registration verification (certificate-based today, no public API)');
export const startupIndiaProvider = makeStubProvider('startupIndia', 'Startup India DPIIT recognition verification (certificate-based today)');
export const oemAuthorizationProvider = makeStubProvider('oemAuthorization', 'OEM authorization letter issuer verification (manual/document-based today)');
