import { PrismaClient } from '@prisma/client';
import {
  udyamRegistry,
  gstRegistry,
  panRegistry,
  blacklistRegistry,
  dpiitLocalContentRegistry,
} from '../src/lib/fixtures/registryFixtures';

/**
 * Populates RegistryPan / RegistryGst / RegistryUdyam / RegistryBlacklist /
 * RegistryDpiitLocalContent - real tables in the Supabase Postgres database
 * - from the fixture data in src/lib/fixtures/registryFixtures.ts. Safe to
 * re-run: PAN/GST/Udyam/DPIIT rows are upserted (never duplicated), and only
 * the blacklist table is cleared and rebuilt (it has no natural unique key
 * in the fixture data).
 *
 * Deliberately standalone - does NOT touch Tender/Bidder/Document data, so
 * it is safe to run at any time without disturbing a dataset already
 * imported through /admin/import. Do NOT use `npm run seed` for this - that
 * script wipes and recreates every tender and bidder.
 *
 * Run with: npx tsx scripts/seedRegistries.ts
 */

const prisma = new PrismaClient();

async function main() {
  let n = 0;

  for (const [pan, r] of Object.entries(panRegistry)) {
    await prisma.registryPan.upsert({
      where: { pan },
      create: { pan, holderName: r.holderName, panStatus: r.panStatus, itFilingStatus: r.itFilingStatus },
      update: { holderName: r.holderName, panStatus: r.panStatus, itFilingStatus: r.itFilingStatus },
    });
    n++;
  }

  for (const [gstin, r] of Object.entries(gstRegistry)) {
    await prisma.registryGst.upsert({
      where: { gstin },
      create: {
        gstin,
        legalName: r.legalName,
        status: r.status,
        lastReturnPeriod: r.lastReturnPeriod,
        returnFilingDelayMonths: r.returnFilingDelayMonths,
      },
      update: {
        legalName: r.legalName,
        status: r.status,
        lastReturnPeriod: r.lastReturnPeriod,
        returnFilingDelayMonths: r.returnFilingDelayMonths,
      },
    });
    n++;
  }

  for (const [udyamNumber, r] of Object.entries(udyamRegistry)) {
    await prisma.registryUdyam.upsert({
      where: { udyamNumber },
      create: { udyamNumber, enterpriseName: r.enterpriseName, category: r.category, status: r.status, registeredOn: new Date(r.registeredOn) },
      update: { enterpriseName: r.enterpriseName, category: r.category, status: r.status, registeredOn: new Date(r.registeredOn) },
    });
    n++;
  }

  await prisma.registryBlacklist.deleteMany();
  for (const r of blacklistRegistry) {
    await prisma.registryBlacklist.create({
      data: { matchValue: r.matchValue, matchField: r.matchField, reason: r.reason, debarredUntil: new Date(r.debarredUntil) },
    });
    n++;
  }

  for (const [key, r] of Object.entries(dpiitLocalContentRegistry)) {
    await prisma.registryDpiitLocalContent.upsert({
      where: { key },
      create: { key, verifiedLocalContentPercent: r.verifiedLocalContentPercent, certifyingAgency: r.certifyingAgency },
      update: { verifiedLocalContentPercent: r.verifiedLocalContentPercent, certifyingAgency: r.certifyingAgency },
    });
    n++;
  }

  console.log(
    `Seeded registries: ${Object.keys(panRegistry).length} PAN, ${Object.keys(gstRegistry).length} GST, ${Object.keys(udyamRegistry).length} Udyam, ${blacklistRegistry.length} blacklist, ${Object.keys(dpiitLocalContentRegistry).length} DPIIT local-content row(s) — ${n} row(s) written.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
