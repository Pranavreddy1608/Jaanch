/**
 * Simulated government registries.
 *
 * Real production access to Udyam / GSTN / PAN / DPIIT requires GSP or
 * partner-API credentials that no student team can obtain during a
 * hackathon (see SIH26100_Problem_Analysis.md, Section 3). Rather than
 * hit fake or scraped endpoints - which is what broke the previous
 * build - every mock provider reads from ONE of these fixture tables,
 * which stand in for "what the real registry would say."
 *
 * This file is imported by both the mock providers (src/lib/providers/mock/*)
 * and prisma/seed.ts, so the bidder rows created in the demo always line up
 * with the fixture data the providers will check them against.
 */

export interface UdyamRecord {
  enterpriseName: string;
  category: 'Micro' | 'Small' | 'Medium';
  status: 'Active' | 'Cancelled';
  registeredOn: string; // ISO date
}

export interface GstRecord {
  legalName: string;
  status: 'Active' | 'Cancelled' | 'Suspended';
  lastReturnPeriod: string; // e.g. "2026-07"
  returnFilingDelayMonths: number;
}

export interface PanRecord {
  holderName: string;
  panStatus: 'Valid' | 'Invalid' | 'Deactivated';
  itFilingStatus: 'Filed' | 'NotFiled';
}

export interface BlacklistRecord {
  matchValue: string; // pan, gstin, or name fragment
  matchField: 'pan' | 'gstin' | 'name';
  reason: string;
  debarredUntil: string; // ISO date
}

export interface DpiitLocalContentRecord {
  verifiedLocalContentPercent: number;
  certifyingAgency: string;
}

export const udyamRegistry: Record<string, UdyamRecord> = {
  'UDYAM-TN-03-0012345': {
    enterpriseName: 'Chennai Precision Engineering Pvt Ltd',
    category: 'Small',
    status: 'Active',
    registeredOn: '2021-04-11',
  },
  'UDYAM-TN-06-0098765': {
    enterpriseName: 'Bharath MSME Fabricators',
    category: 'Micro',
    status: 'Active',
    registeredOn: '2022-01-19',
  },
  // NovaTech deliberately has NO Udyam entry - simulates a bidder who
  // claimed an Udyam number that does not exist in the registry.
};

export const gstRegistry: Record<string, GstRecord> = {
  '33AAACC1206D1ZM': {
    legalName: 'Chennai Precision Engineering Pvt Ltd',
    status: 'Active',
    lastReturnPeriod: '2026-08',
    returnFilingDelayMonths: 0,
  },
  '33AACFC5678K1Z2': {
    legalName: 'Coastal Traders & Co',
    status: 'Active',
    lastReturnPeriod: '2026-03',
    returnFilingDelayMonths: 5,
  },
  '29AAGFB0987R1Z9': {
    legalName: 'Bharath MSME Fabricators',
    status: 'Active',
    lastReturnPeriod: '2026-08',
    returnFilingDelayMonths: 0,
  },
  '27AABCS4321L1ZQ': {
    legalName: 'Swift Supplies Enterprises',
    status: 'Active',
    lastReturnPeriod: '2026-07',
    returnFilingDelayMonths: 1,
  },
};

export const panRegistry: Record<string, PanRecord> = {
  AAACC1206D: { holderName: 'Chennai Precision Engineering Pvt Ltd', panStatus: 'Valid', itFilingStatus: 'Filed' },
  AACFC5678K: { holderName: 'Coastal Traders & Co', panStatus: 'Valid', itFilingStatus: 'Filed' },
  AAGFB0987R: { holderName: 'Bharath MSME Fabricators', panStatus: 'Valid', itFilingStatus: 'Filed' },
  AABCS4321L: { holderName: 'Swift Supplies Enterprises', panStatus: 'Valid', itFilingStatus: 'NotFiled' },
  AADCN6543P: { holderName: 'NovaTech Industrial Solutions', panStatus: 'Valid', itFilingStatus: 'Filed' },
};

export const blacklistRegistry: BlacklistRecord[] = [
  {
    matchValue: 'AABCS4321L',
    matchField: 'pan',
    reason: 'Debarred by CVC for contract non-performance (2025)',
    debarredUntil: '2027-06-30',
  },
];

// Keyed by Bidder.key, since there's no single natural government ID for
// a Make-in-India local-content declaration - this stands in for the
// DPIIT/Make in India portal's cross-check of the bidder's declared %.
export const dpiitLocalContentRegistry: Record<string, DpiitLocalContentRecord> = {
  'chennai-precision-engineering': { verifiedLocalContentPercent: 62, certifyingAgency: 'DPIIT Registered CA - S. Ramanathan & Co' },
  'coastal-traders': { verifiedLocalContentPercent: 38, certifyingAgency: 'DPIIT Registered CA - Iyer & Associates' },
  'bharath-msme-fabricators': { verifiedLocalContentPercent: 55, certifyingAgency: 'DPIIT Registered CA - K. Suresh & Co' },
  'swift-supplies-enterprises': { verifiedLocalContentPercent: 20, certifyingAgency: 'DPIIT Registered CA - Iyer & Associates' },
  // NovaTech has no DPIIT cross-check record on file.
};
