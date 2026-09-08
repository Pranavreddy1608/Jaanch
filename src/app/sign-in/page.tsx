import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { SignInForm } from '@/components/SignInForm';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  if (getSession()) redirect('/dashboard');

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h2 className="text-lg font-semibold">Sign in</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">
          Identify yourself to use the compliance dashboard.
        </p>
        <SignInForm />
      </div>
    </div>
  );
}
