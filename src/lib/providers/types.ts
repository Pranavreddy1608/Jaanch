/**
 * Every external data source - real or simulated - implements this one
 * interface. The orchestrator and rules engine never know or care whether
 * a given answer came from a live sandbox call or a mock fixture; they
 * only consume VerificationResultPayload. This is what makes it possible
 * to swap a mock provider for a real one later by changing one file in
 * the registry, nothing else.
 */

export type VerificationStatus = 'VERIFIED_OK' | 'VERIFIED_FAIL' | 'INCONSISTENT' | 'MISSING' | 'ERROR';

export interface BidderInput {
  id: string;
  key: string;
  name: string;
  udyamNumber?: string | null;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
  claimedTurnoverInrLakh?: number | null;
  claimedEmployeeCount?: number | null;
}

export interface DocumentInput {
  docType: string;
  extractedData?: Record<string, unknown> | null;
}

export interface VerificationInput {
  bidder: BidderInput;
  requirement: {
    code: string;
    sourceType: string;
    mandatory: boolean;
    ruleConfig: Record<string, unknown>;
  };
  documents: DocumentInput[];
}

export interface VerificationResultPayload {
  status: VerificationStatus;
  confidence: number; // 0..1
  isMock: boolean;
  raw: Record<string, unknown>;
}

export interface VerificationProvider {
  /** Matches ComplianceRequirement.sourceType */
  key: string;
  verify(input: VerificationInput): Promise<VerificationResultPayload>;
}
