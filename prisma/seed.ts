import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.score.deleteMany();
  await prisma.verificationResult.deleteMany();
  await prisma.document.deleteMany();
  await prisma.bidder.deleteMany();
  await prisma.complianceRequirement.deleteMany();
  await prisma.tender.deleteMany();

  // Real, currently-live GeM tender - GEM/2026/B/7983771 (published 03-09-2026).
  // Every field below is taken verbatim from the published bid document; it is
  // independently verifiable on the GeM portal. Its bid window closes
  // 08-09-2026 17:00, so after that it will show as closed on GeM.
  const tender = await prisma.tender.create({
    data: {
      referenceNo: 'GEM/2026/B/7983771',
      title: 'Cyber Forensic Hardware and Software',
      organization: 'Centre for Development of Advanced Computing (C-DAC), Thiruvananthapuram',
      department: 'Ministry of Electronics & IT — Department of Electronics and Information Technology',
      category: 'Global Tender — GlobalTenderCategory (Q3)',
      bidEndsAt: new Date('2026-09-08T17:00:00+05:30'),
      emdRequired: false, // "EMD Detail — Required: No"
      miiNote:
        'Make in India Purchase Preference: NOT opted. Competent Authority (Dr. Parameswaran Nampoothiri V, Section Head Purchase, C-DAC) approved a Global Tender on 01-09-2026 — the tendered items are not available domestically. CA Approval CDAC/CFSPR291/16714.',
      mseNote:
        'MSE Purchase Preference: Yes — MSE OEMs / Service Providers get preference up to price within L1+15%, for up to 25% of bid quantity. Startups (DPIIT-registered) are relaxed from the experience criteria.',
      requirements: {
        create: [
          // --- Standard GeM seller-eligibility gates (apply to every GeM bid;
          //     GeM seller registration itself requires GST + PAN) ---
          {
            code: 'GST_FILING',
            label: 'GST Registration & Return Filing',
            sourceType: 'gst',
            mandatory: true,
            ruleConfig: JSON.stringify({
              maxFilingDelayMonths: 2,
              basis: 'GeM seller-registration requirement; financial-document verification is required for this bid.',
            }),
          },
          {
            code: 'PAN_IT_COMPLIANCE',
            label: 'PAN Validity',
            sourceType: 'pan',
            mandatory: true,
            ruleConfig: JSON.stringify({ basis: 'GeM seller-registration requirement.' }),
          },
          {
            code: 'BLACKLIST_CHECK',
            label: 'Blacklisting / Debarment Check',
            sourceType: 'blacklist',
            mandatory: true,
            ruleConfig: JSON.stringify({ basis: 'Standard eligibility gate (CVC / ministry debarment lists).' }),
          },
          // --- Explicitly required by THIS tender ---
          {
            code: 'OEM_AUTHORIZATION',
            label: 'OEM Authorization Certificate',
            sourceType: 'oemAuthorization',
            mandatory: true, // listed under "Document required from seller" for GEM/2026/B/7983771
            ruleConfig: JSON.stringify({
              basis: 'Listed under "Document required from seller" for this bid.',
            }),
          },
          // --- Purchase-preference / relaxation signal (NOT an eligibility
          //     gate for a global tender open to all, incl. non-MSE / foreign) ---
          {
            code: 'UDYAM_STATUS',
            label: 'Udyam / MSME Registration (purchase preference & relaxations)',
            sourceType: 'udyam',
            mandatory: false,
            ruleConfig: JSON.stringify({
              msePreferencePercent: 15,
              mseQuantityCapPercent: 25,
              confers: ['MSE purchase preference (L1+15%, up to 25% of quantity)', 'Experience-criteria relaxation (MSE / DPIIT Startup)'],
              basis: 'This tender: MSE Purchase Preference = Yes. Not a disqualification criterion.',
            }),
          },
          // --- MII local-content: WAIVED for this tender by competent authority ---
          {
            code: 'MAKE_IN_INDIA_LOCAL_CONTENT',
            label: 'Make in India — Local Content',
            sourceType: 'makeInIndia',
            mandatory: false,
            ruleConfig: JSON.stringify({
              notApplicable: true,
              waiverBasis:
                'Not applicable to this tender. MII Purchase Preference = No; Competent Authority approved a Global Tender on the ground that the tendered items are not available domestically (CA Approval CDAC/CFSPR291/16714, 01-09-2026).',
              // retained for reference / other tenders that reuse this sourceType
              minLocalContentPercent: 50,
              tolerancePercent: 5,
            }),
          },
          // --- Labour-law compliance (GeM GTC — all bids) ---
          {
            code: 'EPFO_ESIC_COMPLIANCE',
            label: 'EPFO / ESIC & Labour Code Compliance (where applicable)',
            sourceType: 'epfoEsic',
            mandatory: false,
            ruleConfig: JSON.stringify({
              basis: 'GeM GTC: compliance with the four Labour Codes (Wages 2019; IR 2020; OSH 2020; Social Security 2020) / pre-existing labour laws.',
            }),
          },
          {
            code: 'DOCUMENT_VERIFICATION',
            label: 'DigiLocker Document Verification',
            sourceType: 'digilocker',
            mandatory: false,
            ruleConfig: JSON.stringify({}),
          },
        ],
      },
    },
  });

  const bidders = [
    {
      key: 'chennai-precision-engineering',
      name: 'Chennai Precision Engineering Pvt Ltd',
      udyamNumber: 'UDYAM-TN-03-0012345',
      gstin: '33AAACC1206D1ZN', // valid Mod-36 checksum; embedded PAN matches
      pan: 'AAACC1206D', // valid structure, holder type C = Company
      claimedTurnoverInrLakh: 480,
      claimedEmployeeCount: 62,
      certificateText: 'Local Content Certificate: This is to certify that the goods offered contain 60% local content as per Make in India guidelines, verified by S. Ramanathan & Co, DPIIT registered chartered accountant.',
    },
    {
      key: 'coastal-traders',
      name: 'Coastal Traders & Co',
      udyamNumber: null,
      gstin: '33AACFC5678K1Z8', // valid checksum; registered but return filing is 5 months delayed
      pan: 'AACFC5678K', // valid structure, holder type F = Firm
      claimedTurnoverInrLakh: 210,
      claimedEmployeeCount: 18,
      certificateText: 'Local content declared at 45% per attached self-certification, agency verification pending.',
    },
    {
      key: 'bharath-msme-fabricators',
      name: 'Bharath MSME Febricators', // deliberate near-match typo vs registry name -> INCONSISTENT
      udyamNumber: 'UDYAM-TN-06-0098765',
      gstin: '29AAGFB0987R1ZM', // valid checksum; embedded PAN matches
      pan: 'AAGFB0987R', // valid structure, holder type B = BOI
      claimedTurnoverInrLakh: 95,
      claimedEmployeeCount: 12,
      certificateText: 'We certify 55% local content on all supplied items, certified by K. Suresh & Co.',
    },
    {
      key: 'swift-supplies-enterprises',
      name: 'Swift Supplies Enterprises', // blacklisted PAN
      udyamNumber: null,
      gstin: '27AABCS4321L1ZA', // BROKEN Mod-36 checksum (expected 'C') -> real GSTIN check fails
      pan: 'AABCS4321L', // valid structure; registry shows IT return not filed
      claimedTurnoverInrLakh: 340,
      claimedEmployeeCount: 40,
      certificateText: 'Local content 20% as declared by supplier.',
    },
    {
      key: 'novatech-industrial-solutions',
      name: 'NovaTech Industrial Solutions', // Udyam number doesn't exist in registry; no local content cert uploaded
      udyamNumber: 'UDYAM-TN-09-0055555',
      gstin: null,
      pan: 'AADCN65O3P', // malformed: letter 'O' where a digit belongs -> real PAN format check fails
      claimedTurnoverInrLakh: 610,
      claimedEmployeeCount: 88,
      certificateText: null,
    },
  ];

  for (const b of bidders) {
    await prisma.bidder.create({
      data: {
        tenderId: tender.id,
        key: b.key,
        name: b.name,
        udyamNumber: b.udyamNumber,
        gstin: b.gstin,
        pan: b.pan,
        claimedTurnoverInrLakh: b.claimedTurnoverInrLakh,
        claimedEmployeeCount: b.claimedEmployeeCount,
        documents: b.certificateText
          ? {
              create: [
                {
                  docType: 'LOCAL_CONTENT_CERTIFICATE',
                  fileName: `${b.key}-local-content-certificate.pdf`,
                  rawText: b.certificateText,
                },
              ],
            }
          : undefined,
      },
    });
  }

  console.log(`Seeded tender ${tender.referenceNo} — "${tender.title}" with ${bidders.length} synthetic demo bidders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
