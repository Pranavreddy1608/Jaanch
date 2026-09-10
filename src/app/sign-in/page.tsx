import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { newCaptcha } from '@/lib/captcha';
import { SignInForm } from '@/components/SignInForm';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  if (getSession()) redirect('/dashboard');

  // A fresh challenge every render (page is force-dynamic); the form's
  // "new image" button triggers a router.refresh() to get another.
  const { token, svg } = newCaptcha();

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h2 className="font-heading text-h2 text-navy">Sign in</h2>
        <p className="mb-4 mt-1 text-sm text-ink-muted">
          GeM Bid Compliance Verification Portal — restricted access.
        </p>
        <SignInForm captchaSvg={svg} captchaToken={token} />
      </div>
    </div>
  );
}
