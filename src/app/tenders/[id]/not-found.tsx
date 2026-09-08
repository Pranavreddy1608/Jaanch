import Link from 'next/link';

export default function TenderNotFound() {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="text-lg font-semibold">Tender not found</h2>
      <p className="mt-1 text-sm text-slate-600">
        This tender doesn&apos;t exist — the database may have been re-seeded with fresh IDs.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block rounded-md bg-chakra px-3 py-1.5 text-sm font-medium text-white hover:bg-chakra-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
