import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { SignInForm } from '@/components/SignInForm';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  if (getSession()) redirect('/dashboard');

  // Distinct companies from the seed data, for the Bidder sign-in picker.
  const rows = await prisma.bidder.findMany({
    distinct: ['companySlug'],
    select: { companySlug: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h2 className="text-lg font-semibold">Sign in</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">
          Identify yourself to use the compliance dashboard.
        </p>
        <SignInForm companies={rows} />
      </div>
    </div>
  );
}
