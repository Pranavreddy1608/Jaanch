import { dpiitLocalContentRegistry } from '@/lib/fixtures/registryFixtures';
import type { VerificationProvider, VerificationResultPayload } from '../types';

/**
 * This is the provider that demonstrates the document-intelligence layer
 * working together with a registry cross-check: the bidder's declared
 * local-content % (extracted from their uploaded certificate by the AI
 * document-extraction step) is compared against a simulated DPIIT
 * cross-check record, exactly the kind of "identify inconsistent
 * information" behaviour the problem statement asks for.
 */
export const makeInIndiaProvider: VerificationProvider = {
  key: 'makeInIndia',
  async verify({ bidder, documents, requirement }): Promise<VerificationResultPayload> {
    const cert = documents.find((d) => d.docType === 'LOCAL_CONTENT_CERTIFICATE');
    const declaredPercent = cert?.extractedData?.localContentPercent as number | undefined;

    if (declaredPercent === undefined) {
      return { status: 'MISSING', confidence: 1, isMock: true, raw: { note: 'No local content certificate uploaded / could not be extracted.' } };
    }

    const dpiitRecord = dpiitLocalContentRegistry[bidder.key];
    if (!dpiitRecord) {
      return {
        status: 'VERIFIED_FAIL',
        confidence: 0.7,
        isMock: true,
        raw: { declaredPercent, note: 'No matching DPIIT cross-check record found for this bidder (simulated).' },
      };
    }

    const tolerance = (requirement.ruleConfig.tolerancePercent as number) ?? 5;
    const delta = Math.abs(declaredPercent - dpiitRecord.verifiedLocalContentPercent);

    if (delta > tolerance) {
      return {
        status: 'INCONSISTENT',
        confidence: 0.85,
        isMock: true,
        raw: {
          declaredPercent,
          verifiedPercent: dpiitRecord.verifiedLocalContentPercent,
          certifyingAgency: dpiitRecord.certifyingAgency,
          note: `Declared local content (${declaredPercent}%) differs from DPIIT cross-check (${dpiitRecord.verifiedLocalContentPercent}%) by more than ${tolerance} points.`,
        },
      };
    }

    return {
      status: 'VERIFIED_OK',
      confidence: 0.9,
      isMock: true,
      raw: { declaredPercent, verifiedPercent: dpiitRecord.verifiedLocalContentPercent, certifyingAgency: dpiitRecord.certifyingAgency },
    };
  },
};
