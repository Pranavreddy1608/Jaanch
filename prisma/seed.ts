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

  const tender = await prisma.tender.create({
    data: {
      referenceNo: 'GEM/2026/B/CPCL-REFINERY-VALVES-001',
      title: 'Supply of Industrial Control Valves - CPCL Manali Refinery',
      organization: 'Ministry of Petroleum & Natural Gas',
      department: 'Chennai Petroleum Corporation Limited (CPCL)',
      category: 'Software', // per SIH26100 problem statement metadata
      requirements: {
        create: [
          {
            code: 'UDYAM_STATUS',
            label: 'Udyam / MSME Registration Status',
            sourceType: 'udyam',
            mandatory: true,
            ruleConfig: JSON.stringify({ allowedCategories: ['Micro', 'Small', 'Medium'] }),
          },
          {
            code: 'GST_FILING',
            label: 'GST Registration & Return Filing Compliance',
            sourceType: 'gst',
            mandatory: true,
            ruleConfig: JSON.stringify({ maxFilingDelayMonths: 2 }),
          },
          {
            code: 'PAN_IT_COMPLIANCE',
            label: 'PAN Validity & Income Tax Compliance',
            sourceType: 'pan',
            mandatory: true,
            ruleConfig: JSON.stringify({}),
          },
          {
            code: 'BLACKLIST_CHECK',
            label: 'Blacklisting / Debarment Check',
            sourceType: 'blacklist',
            mandatory: true,
            ruleConfig: JSON.stringify({}),
          },
          {
            code: 'MAKE_IN_INDIA_LOCAL_CONTENT',
            label: 'Make in India - Local Content Requirement',
            sourceType: 'makeInIndia',
            mandatory: true,
            ruleConfig: JSON.stringify({ minLocalContentPercent: 50, tolerancePercent: 5 }),
          },
          {
            code: 'OEM_AUTHORIZATION',
            label: 'OEM Authorization Letter',
            sourceType: 'oemAuthorization',
            mandatory: false,
            ruleConfig: JSON.stringify({}),
          },
          {
            code: 'EPFO_ESIC_COMPLIANCE',
            label: 'EPFO / ESIC Compliance (where applicable)',
            sourceType: 'epfoEsic',
            mandatory: false,
            ruleConfig: JSON.stringify({}),
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
      gstin: '33AAACC1206D1ZM',
      pan: 'AAACC1206D',
      claimedTurnoverInrLakh: 480,
      claimedEmployeeCount: 62,
      certificateText: 'Local Content Certificate: This is to certify that the goods offered contain 60% local content as per Make in India guidelines, verified by S. Ramanathan & Co, DPIIT registered chartered accountant.',
    },
    {
      key: 'coastal-traders',
      name: 'Coastal Traders & Co',
      udyamNumber: null,
      gstin: '33AACFC5678K1Z2', // registered but return filing is 5 months delayed
      pan: 'AACFC5678K',
      claimedTurnoverInrLakh: 210,
      claimedEmployeeCount: 18,
      certificateText: 'Local content declared at 45% per attached self-certification, agency verification pending.',
    },
    {
      key: 'bharath-msme-fabricators',
      name: 'Bharath MSME Febricators', // deliberate near-match typo vs registry name -> INCONSISTENT
      udyamNumber: 'UDYAM-TN-06-0098765',
      gstin: '29AAGFB0987R1Z9',
      pan: 'AAGFB0987R',
      claimedTurnoverInrLakh: 95,
      claimedEmployeeCount: 12,
      certificateText: 'We certify 55% local content on all supplied fabricated assemblies, certified by K. Suresh & Co.',
    },
    {
      key: 'swift-supplies-enterprises',
      name: 'Swift Supplies Enterprises', // blacklisted PAN
      udyamNumber: null,
      gstin: '27AABCS4321L1ZQ',
      pan: 'AABCS4321L',
      claimedTurnoverInrLakh: 340,
      claimedEmployeeCount: 40,
      certificateText: 'Local content 20% as declared by supplier.',
    },
    {
      key: 'novatech-industrial-solutions',
      name: 'NovaTech Industrial Solutions', // Udyam number doesn't exist in registry; no local content cert uploaded
      udyamNumber: 'UDYAM-TN-09-0055555',
      gstin: null,
      pan: 'AADCN6543P',
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

  console.log(`Seeded tender "${tender.title}" with ${bidders.length} demo bidders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
